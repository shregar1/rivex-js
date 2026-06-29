type TaskFunction = (...args: unknown[]) => void | Promise<void>;
/**
 * Wraps a function and its arguments so it can be executed after the
 * response has been sent to the client.
 */
export declare class BackgroundTask {
    private readonly fn;
    private readonly args;
    constructor(fn: TaskFunction, ...args: unknown[]);
    /** Execute the task. Awaits the result if the function is async. */
    run(): Promise<void>;
}
/**
 * Collects multiple background tasks and runs them sequentially after
 * the response has been sent.
 */
export declare class BackgroundTasks {
    private readonly _tasks;
    /** Add a function (and optional arguments) to be executed in the background. */
    addTask(fn: TaskFunction, ...args: unknown[]): void;
    /** Run all collected tasks in order, logging errors to stderr. */
    runAll(): Promise<void>;
    /** Number of queued tasks. */
    get length(): number;
}
export {};
//# sourceMappingURL=background.d.ts.map