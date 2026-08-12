#!/usr/bin/env node
/**
 * Deterministic Playwright route-registration-order audit for E2E spec files.
 *
 * Playwright's page.route() matches handlers LIFO — the most recently registered
 * handler is checked first. e2e/helpers/api-mock.ts's stubUnmatchedApi() registers
 * a catch-all ('**\/api/**') that always fulfills. If a specific mock (loginAs,
 * mockGetEvent, etc.) is registered BEFORE stubUnmatchedApi in the same test block,
 * the catch-all — being registered later — shadows it silently: the specific mock
 * never fires, and the test proceeds against stub data instead of the intended mock.
 * This is exactly the bug documented in loginAs()'s own JSDoc ("Call this AFTER
 * stubUnmatchedApi") and in mockPlayerProfileSubApis()'s doc comment, but nothing
 * enforced it — it was found by hand once (auth-guard investigation, feature/
 * hide-pause-rounds-complete) and turned out to be repo-wide.
 *
 * Usage:
 *   node check-mock-order.mjs [--json] [file-or-dir ...]
 *
 * With no path arguments, scans tournament-client/e2e/**\/*.spec.ts.
 * Prints one line per finding (default) or a full JSON report (--json).
 * Exit code 0 if no findings, 1 if any findings.
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const clientRoot = path.join(repoRoot, 'tournament-client');

const require = createRequire(path.join(clientRoot, 'package.json'));
const ts = require('typescript');

const CATCH_ALL_NAME = 'stubUnmatchedApi';
// Any call matching this is a *specific* route registration that must come AFTER
// the catch-all to avoid being shadowed by it.
const SPECIFIC_MOCK_PATTERN = /^(loginAs|mock[A-Z]\w*)$/;

function walkDir(dir, suffix, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDir(full, suffix, out);
        } else if (entry.isFile() && entry.name.endsWith(suffix)) {
            out.push(full);
        }
    }
    return out;
}

function resolveTargets(args) {
    const paths = args.filter((a) => !a.startsWith('--'));
    if (paths.length === 0) {
        const defaultRoot = path.join(clientRoot, 'e2e');
        return walkDir(defaultRoot, '.spec.ts', []);
    }
    const out = [];
    for (const p of paths) {
        const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
        const stat = fs.existsSync(abs) ? fs.statSync(abs) : null;
        if (stat && stat.isDirectory()) {
            walkDir(abs, '.spec.ts', out);
        } else if (stat && stat.isFile()) {
            out.push(abs);
        }
    }
    return out;
}

/** Find the nearest enclosing function-like body (arrow fn, function expr) for a node. */
function enclosingFunctionBody(node) {
    let current = node.parent;
    while (current) {
        if (
            ts.isArrowFunction(current) ||
            ts.isFunctionExpression(current) ||
            ts.isFunctionDeclaration(current)
        ) {
            return current;
        }
        current = current.parent;
    }
    return null;
}

function calleeName(node) {
    if (!ts.isCallExpression(node)) return null;
    if (ts.isIdentifier(node.expression)) return node.expression.text;
    return null;
}

function auditFile(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const relPath = path.relative(repoRoot, filePath).replace(/\\/g, '/');

    const findings = [];

    // Group awaited/bare calls to the catch-all and to specific mocks by enclosing function.
    const catchAllByFn = new Map();
    const specificByFn = new Map();

    function visit(node) {
        const name = calleeName(node);
        if (name) {
            const fn = enclosingFunctionBody(node);
            if (fn) {
                if (name === CATCH_ALL_NAME) {
                    if (!catchAllByFn.has(fn)) catchAllByFn.set(fn, []);
                    catchAllByFn.get(fn).push(node.getStart());
                } else if (SPECIFIC_MOCK_PATTERN.test(name)) {
                    if (!specificByFn.has(fn)) specificByFn.set(fn, []);
                    specificByFn.get(fn).push({ pos: node.getStart(), name });
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);

    for (const [fn, catchAllCalls] of catchAllByFn.entries()) {
        const specificCalls = specificByFn.get(fn) || [];
        const catchAllPos = Math.min(...catchAllCalls);
        for (const s of specificCalls) {
            if (s.pos < catchAllPos) {
                const line = sourceFile.getLineAndCharacterOfPosition(s.pos).line + 1;
                const catchAllLine = sourceFile.getLineAndCharacterOfPosition(catchAllPos).line + 1;
                findings.push({
                    file: relPath,
                    severity: 'WARN',
                    issue: 'mock-registered-before-catch-all',
                    line,
                    mock: s.name,
                    catchAllLine,
                    message: `${s.name}() registered at line ${line}, before ${CATCH_ALL_NAME}() at line ${catchAllLine} — the catch-all (registered later) shadows this specific mock under Playwright's LIFO route order. Swap the two calls.`,
                });
            }
        }
    }

    return findings;
}

function main() {
    const args = process.argv.slice(2);
    const jsonMode = args.includes('--json');
    const targets = resolveTargets(args);

    const allFindings = [];
    for (const file of targets) {
        allFindings.push(...auditFile(file));
    }

    if (jsonMode) {
        console.log(JSON.stringify({ filesScanned: targets.length, findings: allFindings }, null, 2));
    } else {
        console.log(`Scanned ${targets.length} spec file(s).`);
        if (allFindings.length === 0) {
            console.log('Clean — no mock-registration-order violations found.');
        } else {
            for (const f of allFindings) {
                console.log(`WARN ${f.file}:${f.line} ${f.message}`);
            }
            console.log(`\n${allFindings.length} violation(s) across ${new Set(allFindings.map((f) => f.file)).size} file(s).`);
        }
    }

    process.exit(allFindings.length > 0 ? 1 : 0);
}

main();
