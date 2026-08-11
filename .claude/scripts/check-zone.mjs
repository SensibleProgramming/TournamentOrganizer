#!/usr/bin/env node
/**
 * Deterministic zoneless-change-detection audit for Angular component files.
 *
 * This project runs Angular 21 with zoneless change detection (no Zone.js), so any
 * method that mutates `this.*` state must explicitly call `this.cdr.detectChanges()`
 * afterward or the template silently goes stale. This used to be an LLM eyeball pass
 * (check-zone.md) re-derived from prose every run; it is a mechanical AST check, so
 * it is a script instead.
 *
 * Usage:
 *   node check-zone.mjs [--json] [file-or-dir ...]
 *
 * With no path arguments, scans tournament-client/src/app/features/**\/*.component.ts.
 * Prints one JSON object per finding (default) or a full JSON report array (--json).
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

const MUTATING_ARRAY_METHODS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']);

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
        const defaultRoot = path.join(clientRoot, 'src', 'app', 'features');
        return walkDir(defaultRoot, '.component.ts', []);
    }
    const out = [];
    for (const p of paths) {
        const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
        const stat = fs.existsSync(abs) ? fs.statSync(abs) : null;
        if (stat && stat.isDirectory()) {
            walkDir(abs, '.component.ts', out);
        } else if (stat && stat.isFile()) {
            out.push(abs);
        }
    }
    return out;
}

/** Find the nearest enclosing function-like body (method, arrow fn, function expr) for a node. */
function enclosingFunctionBody(node) {
    let current = node.parent;
    while (current) {
        if (
            ts.isMethodDeclaration(current) ||
            ts.isArrowFunction(current) ||
            ts.isFunctionExpression(current) ||
            ts.isFunctionDeclaration(current) ||
            ts.isGetAccessorDeclaration(current) ||
            ts.isSetAccessorDeclaration(current)
        ) {
            return current;
        }
        current = current.parent;
    }
    return null;
}

function functionLabel(fn, sourceFile) {
    if (fn.name && ts.isIdentifier(fn.name)) return fn.name.text;
    if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
        const line = sourceFile.getLineAndCharacterOfPosition(fn.getStart()).line + 1;
        return `<anonymous fn at line ${line}>`;
    }
    return '<anonymous>';
}

function isThisPropertyAccess(node) {
    return ts.isPropertyAccessExpression(node) && node.expression.kind === ts.SyntaxKind.ThisKeyword;
}

function isThisElementAccess(node) {
    return ts.isElementAccessExpression(node) && node.expression.kind === ts.SyntaxKind.ThisKeyword;
}

function findDetectChangesCallName(constructorNode) {
    // Look for a constructor parameter typed ChangeDetectorRef, return its property name.
    if (!constructorNode) return null;
    for (const param of constructorNode.parameters) {
        const typeText = param.type ? param.type.getText() : '';
        if (typeText.includes('ChangeDetectorRef') && ts.isIdentifier(param.name)) {
            return param.name.text;
        }
    }
    return null;
}

function auditFile(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const relPath = path.relative(repoRoot, filePath).replace(/\\/g, '/');

    const findings = [];
    let hasComponentDecorator = false;
    let hasCdrImport = false;
    let cdrPropertyName = null;
    let classNode = null;

    ts.forEachChild(sourceFile, function visitTop(node) {
        if (ts.isImportDeclaration(node) && node.moduleSpecifier.getText().includes('@angular/core')) {
            if (node.importClause && node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
                for (const el of node.importClause.namedBindings.elements) {
                    if (el.name.text === 'ChangeDetectorRef') hasCdrImport = true;
                }
            }
        }
        if (ts.isClassDeclaration(node)) {
            const decorators = ts.getDecorators ? ts.getDecorators(node) : node.decorators;
            if (decorators && decorators.some((d) => d.expression.getText().startsWith('Component'))) {
                hasComponentDecorator = true;
                classNode = node;
            }
        }
        ts.forEachChild(node, visitTop);
    });

    if (!hasComponentDecorator) return findings; // not a @Component file, skip

    if (classNode) {
        const ctor = classNode.members.find((m) => ts.isConstructorDeclaration(m));
        cdrPropertyName = findDetectChangesCallName(ctor);
    }

    if (!hasCdrImport || !cdrPropertyName) {
        findings.push({
            file: relPath,
            severity: 'INFO',
            issue: 'no-cdr-injected',
            message: 'Component has no ChangeDetectorRef imported/injected — skipping mutation scan (fine if this component never mutates state).',
        });
        return findings;
    }

    // Collect all `this.cdr.detectChanges()` call positions, grouped by enclosing function.
    const detectCallsByFn = new Map();
    // Collect all mutation sites, grouped by enclosing function.
    const mutationsByFn = new Map();

    function visit(node) {
        if (
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            node.expression.name.text === 'detectChanges' &&
            isThisPropertyAccess(node.expression.expression) &&
            node.expression.expression.name.text === cdrPropertyName
        ) {
            const fn = enclosingFunctionBody(node);
            if (fn) {
                if (!detectCallsByFn.has(fn)) detectCallsByFn.set(fn, []);
                detectCallsByFn.get(fn).push(node.getStart());
            }
        }

        // this.foo = ... (but not this.cdr... comparisons, and not `===`/`==`)
        if (
            ts.isBinaryExpression(node) &&
            node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            (isThisPropertyAccess(node.left) || isThisElementAccess(node.left))
        ) {
            const fn = enclosingFunctionBody(node);
            if (fn) {
                if (!mutationsByFn.has(fn)) mutationsByFn.set(fn, []);
                const propName = isThisPropertyAccess(node.left) ? node.left.name.text : '<indexed>';
                mutationsByFn.get(fn).push({ pos: node.getStart(), label: `this.${propName} = ...` });
            }
        }

        // this.foo.push(...) / .splice(...) / etc.
        if (
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            MUTATING_ARRAY_METHODS.has(node.expression.name.text) &&
            isThisPropertyAccess(node.expression.expression)
        ) {
            const fn = enclosingFunctionBody(node);
            if (fn) {
                if (!mutationsByFn.has(fn)) mutationsByFn.set(fn, []);
                mutationsByFn.get(fn).push({
                    pos: node.getStart(),
                    label: `this.${node.expression.expression.name.text}.${node.expression.name.text}(...)`,
                });
            }
        }

        ts.forEachChild(node, visit);
    }
    visit(sourceFile);

    for (const [fn, mutations] of mutationsByFn.entries()) {
        const detectPositions = detectCallsByFn.get(fn) || [];
        const hasAnyDetectInScope = detectPositions.length > 0;
        if (!hasAnyDetectInScope) {
            const line = sourceFile.getLineAndCharacterOfPosition(mutations[0].pos).line + 1;
            findings.push({
                file: relPath,
                severity: 'WARN',
                issue: 'missing-detect-changes',
                method: functionLabel(fn, sourceFile),
                line,
                mutations: mutations.map((m) => m.label),
                message: `Method '${functionLabel(fn, sourceFile)}' mutates state (${mutations.map((m) => m.label).join(', ')}) but never calls this.${cdrPropertyName}.detectChanges() in the same scope.`,
            });
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

    const warnings = allFindings.filter((f) => f.severity === 'WARN');

    if (jsonMode) {
        console.log(JSON.stringify({ filesScanned: targets.length, findings: allFindings }, null, 2));
    } else {
        console.log(`Scanned ${targets.length} component file(s).`);
        if (warnings.length === 0) {
            console.log('Clean — no missing detectChanges() calls found.');
        } else {
            for (const f of warnings) {
                console.log(`WARN ${f.file}:${f.line} [${f.method}] ${f.message}`);
            }
        }
        const infos = allFindings.filter((f) => f.severity === 'INFO');
        for (const f of infos) {
            console.log(`INFO ${f.file}: ${f.message}`);
        }
    }

    process.exit(warnings.length > 0 ? 1 : 0);
}

main();
