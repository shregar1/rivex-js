/**
 * Wraps a function and its arguments so it can be executed after the
 * response has been sent to the client.
 */
export class BackgroundTask {
    fn;
    args;
    constructor(fn, ...args) {
        this.fn = fn;
        this.args = args;
    }
    /** Execute the task. Awaits the result if the function is async. */
    async run() {
        await this.fn(...this.args);
    }
}
/**
 * Collects multiple background tasks and runs them sequentially after
 * the response has been sent.
 */
export class BackgroundTasks {
    _tasks = [];
    /** Add a function (and optional arguments) to be executed in the background. */
    addTask(fn, ...args) {
        this._tasks.push(new BackgroundTask(fn, ...args));
    }
    /** Run all collected tasks in order, logging errors to stderr. */
    async runAll() {
        for (const task of this._tasks) {
            try {
                await task.run();
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                process.stderr.write(`  background task error: ${message}\n`);
            }
        }
    }
    /** Number of queued tasks. */
    get length() {
        return this._tasks.length;
    }
}
//# sourceMappingURL=background.js.map