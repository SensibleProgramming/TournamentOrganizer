import { runImplementNext } from '../src/runner';
import { spawn } from 'child_process';

jest.mock('child_process');
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

function makeProcess(exitCode: number) {
  const proc = {
    on: jest.fn().mockImplementation((event: string, handler: (code: number) => void) => {
      if (event === 'close') setTimeout(() => handler(exitCode), 0);
      return proc;
    }),
  };
  return proc;
}

describe('runImplementNext', () => {
  it('spawns claude with correct args and cwd', async () => {
    mockSpawn.mockReturnValue(makeProcess(0) as any);

    await runImplementNext('/repo/path');

    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      ['-p', '/implement-next'],
      { cwd: '/repo/path', stdio: 'inherit', shell: true }
    );
  });

  it('resolves when process exits with code 0', async () => {
    mockSpawn.mockReturnValue(makeProcess(0) as any);
    await expect(runImplementNext('/repo')).resolves.toBeUndefined();
  });

  it('rejects when process exits with non-zero code', async () => {
    mockSpawn.mockReturnValue(makeProcess(1) as any);
    await expect(runImplementNext('/repo')).rejects.toThrow();
  });
});
