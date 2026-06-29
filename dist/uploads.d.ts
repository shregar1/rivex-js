/**
 * Represents an uploaded file from a multipart form request.
 */
export declare class UploadFile {
    private _buffer;
    private _offset;
    readonly filename?: string;
    readonly contentType: string;
    readonly headers: Record<string, string>;
    readonly size?: number;
    constructor(file: Buffer, options?: {
        filename?: string;
        contentType?: string;
        headers?: Record<string, string>;
        size?: number;
    });
    /** The raw file buffer. */
    get file(): Buffer;
    /** Read up to `size` bytes from the current position. */
    read(size?: number): Promise<Buffer>;
    /** Write data to the file buffer (appends at current offset). */
    write(data: Buffer): Promise<void>;
    /** Seek to a specific byte offset. */
    seek(offset: number): void;
    /** Close the upload file (releases the buffer reference). */
    close(): void;
    toString(): string;
}
/**
 * Marker for file upload parameters. Used by the handler injection
 * system to identify which parameters expect file uploads.
 */
export declare class File {
    readonly defaultValue: unknown;
    constructor(defaultValue?: unknown);
}
/**
 * Marker for form field parameters. Used by the handler injection
 * system to identify which parameters come from form data.
 */
export declare class Form {
    readonly defaultValue: unknown;
    constructor(defaultValue?: unknown);
}
/** Parse multipart/form-data body into a map of field names to values. */
export declare function parseMultipart(body: Buffer, contentType: string): Map<string, Array<UploadFile | string>>;
//# sourceMappingURL=uploads.d.ts.map