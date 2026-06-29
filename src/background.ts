type TaskFunction = (...args: unknown[]) => void | Promise<void>;

/**
 * Wraps a function and its arguments so it can be executed after the
 * response has been sent to the client.
 */
export class BackgroundTask {
  private readonly fn: TaskFunction;
  private readonly args: unknown[];

  constructor(fn: TaskFunction, ...args: unknown[]) {
    this.fn = fn;
    this.args = args;
  }

  /** Execute the task. Awaits the result if the function is async. */
  async run(): Promise<void> {
    await this.fn(...this.args);
  }
}

/**
 * Collects multiple background tasks and runs them sequentially after
 * the response has been sent.
 */
export class BackgroundTasks {
  private readonly _tasks: BackgroundTask[] = [];

  /** Add a function (and optional arguments) to be executed in the background. */
  addTask(fn: TaskFunction, ...args: unknown[]): void {
    this._tasks.push(new BackgroundTask(fn, ...args));
  }

  /** Run all collected tasks in order, logging errors to stderr. */
  async runAll(): Promise<void> {
    for (const task of this._tasks) {
      try {
        await task.run();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`  background task error: ${message}\n`);
      }
    }
  }

  /** Number of queued tasks. */
  get length(): number {
    return this._tasks.length;
  }
}
