type Job = () => Promise<void>;

export function createQueue() {
  const jobs: Job[] = [];
  let running = false;

  async function drain(): Promise<void> {
    running = true;
    while (jobs.length > 0) {
      const job = jobs.shift()!;
      try {
        await job();
      } catch (err) {
        console.error(`[queue ${timestamp()}] Job failed:`, err);
      }
    }
    running = false;
  }

  return {
    enqueue(job: Job): void {
      jobs.push(job);
      if (!running) {
        drain();
      }
    },
    get isRunning(): boolean {
      return running;
    },
  };
}

function timestamp(): string {
  return new Date().toISOString();
}
