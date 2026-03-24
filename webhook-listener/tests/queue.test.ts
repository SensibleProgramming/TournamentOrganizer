import { createQueue } from '../src/queue';

function wait(ms = 20): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('createQueue', () => {
  it('runs jobs sequentially — second starts only after first resolves', async () => {
    const q = createQueue();
    const log: string[] = [];

    let unblock!: () => void;
    const blocker = new Promise<void>((resolve) => { unblock = resolve; });

    q.enqueue(async () => { log.push('1a'); await blocker; log.push('1b'); });
    q.enqueue(async () => { log.push('2'); });

    await Promise.resolve(); // let job1 start
    expect(log).toEqual(['1a']); // job2 has not started

    unblock();
    await wait();
    expect(log).toEqual(['1a', '1b', '2']);
  });

  it('a failing job does not prevent subsequent jobs from running', async () => {
    const q = createQueue();
    const ran: string[] = [];

    q.enqueue(async () => { throw new Error('job 1 failed'); });
    q.enqueue(async () => { ran.push('job2'); });

    await wait();
    expect(ran).toEqual(['job2']);
  });

  it('isRunning resets to false after all jobs complete', async () => {
    const q = createQueue();

    q.enqueue(async () => {});
    await wait();

    expect(q.isRunning).toBe(false);
  });

  it('enqueuing while running adds to the backlog correctly', async () => {
    const q = createQueue();
    const ran: number[] = [];

    let unblock!: () => void;
    const blocker = new Promise<void>((resolve) => { unblock = resolve; });

    q.enqueue(async () => { await blocker; ran.push(1); });

    await Promise.resolve(); // job1 is now running
    q.enqueue(async () => { ran.push(2); }); // enqueue while running

    unblock();
    await wait();
    expect(ran).toEqual([1, 2]);
  });
});
