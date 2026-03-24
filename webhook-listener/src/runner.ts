import { spawn } from 'child_process';

export function runImplementNext(repoPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ts = new Date().toISOString();
    console.log(`[runner ${ts}] Starting: claude -p "/implement-next" in ${repoPath}`);

    const proc = spawn('claude', ['-p', '/implement-next'], {
      cwd: repoPath,
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      const done = new Date().toISOString();
      if (code === 0) {
        console.log(`[runner ${done}] Finished successfully`);
        resolve();
      } else {
        console.error(`[runner ${done}] Exited with code ${code}`);
        reject(new Error(`claude exited with code ${code}`));
      }
    });
  });
}
