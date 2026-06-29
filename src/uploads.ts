/**
 * Represents an uploaded file from a multipart form request.
 */
export class UploadFile {
  private _buffer: Buffer;
  private _offset: number = 0;
  readonly filename?: string;
  readonly contentType: string;
  readonly headers: Record<string, string>;
  readonly size?: number;

  constructor(
    file: Buffer,
    options?: {
      filename?: string;
      contentType?: string;
      headers?: Record<string, string>;
      size?: number;
    },
  ) {
    this._buffer = file;
    this.filename = options?.filename;
    this.contentType = options?.contentType ?? 'application/octet-stream';
    this.headers = options?.headers ?? {};
    this.size = options?.size ?? file.length;
  }

  /** The raw file buffer. */
  get file(): Buffer {
    return this._buffer;
  }

  /** Read up to `size` bytes from the current position. */
  async read(size?: number): Promise<Buffer> {
    if (size === undefined || size < 0) {
      const result = this._buffer.subarray(this._offset);
      this._offset = this._buffer.length;
      return result;
    }
    const end = Math.min(this._offset + size, this._buffer.length);
    const result = this._buffer.subarray(this._offset, end);
    this._offset = end;
    return result;
  }

  /** Write data to the file buffer (appends at current offset). */
  async write(data: Buffer): Promise<void> {
    const before = this._buffer.subarray(0, this._offset);
    const after = this._buffer.subarray(this._offset);
    this._buffer = Buffer.concat([before, data, after]);
    this._offset += data.length;
  }

  /** Seek to a specific byte offset. */
  seek(offset: number): void {
    this._offset = Math.max(0, Math.min(offset, this._buffer.length));
  }

  /** Close the upload file (releases the buffer reference). */
  close(): void {
    this._buffer = Buffer.alloc(0);
    this._offset = 0;
  }

  toString(): string {
    return `UploadFile(filename=${this.filename ?? 'null'}, contentType=${this.contentType})`;
  }
}

/**
 * Marker for file upload parameters. Used by the handler injection
 * system to identify which parameters expect file uploads.
 */
export class File {
  readonly defaultValue: unknown;

  constructor(defaultValue?: unknown) {
    this.defaultValue = defaultValue;
  }
}

/**
 * Marker for form field parameters. Used by the handler injection
 * system to identify which parameters come from form data.
 */
export class Form {
  readonly defaultValue: unknown;

  constructor(defaultValue?: unknown) {
    this.defaultValue = defaultValue;
  }
}

/** Parse multipart/form-data body into a map of field names to values. */
export function parseMultipart(
  body: Buffer,
  contentType: string,
): Map<string, Array<UploadFile | string>> {
  const fields = new Map<string, Array<UploadFile | string>>();
  const boundary = extractBoundary(contentType);
  if (!boundary) return fields;

  const boundaryBytes = Buffer.from(`--${boundary}`);
  const parts = splitBuffer(body, boundaryBytes);

  for (const part of parts) {
    const trimmed = trimCRLF(part);
    if (trimmed.length === 0 || trimmed.equals(Buffer.from('--'))) continue;

    const headerEnd = findDoubleNewline(trimmed);
    if (headerEnd === -1) continue;

    const headerBlock = trimmed.subarray(0, headerEnd).toString('utf-8');
    let fieldBody = trimmed.subarray(headerEnd + 4);
    if (fieldBody.length >= 2 && fieldBody[fieldBody.length - 2] === 0x0d && fieldBody[fieldBody.length - 1] === 0x0a) {
      fieldBody = fieldBody.subarray(0, fieldBody.length - 2);
    }

    const disposition = parseContentDisposition(headerBlock);
    const fieldName = disposition.name;
    if (!fieldName) continue;

    if (!fields.has(fieldName)) {
      fields.set(fieldName, []);
    }

    if (disposition.filename !== undefined) {
      const ct = parseHeaderValue(headerBlock, 'content-type') ?? 'application/octet-stream';
      const upload = new UploadFile(Buffer.from(fieldBody), {
        filename: disposition.filename,
        contentType: ct,
        size: fieldBody.length,
      });
      fields.get(fieldName)!.push(upload);
    } else {
      fields.get(fieldName)!.push(fieldBody.toString('utf-8'));
    }
  }

  return fields;
}

function extractBoundary(contentType: string): string | undefined {
  for (const part of contentType.split(';')) {
    const trimmed = part.trim();
    if (trimmed.toLowerCase().startsWith('boundary=')) {
      let boundary = trimmed.slice(9).trim();
      if (boundary.startsWith('"') && boundary.endsWith('"')) {
        boundary = boundary.slice(1, -1);
      }
      return boundary;
    }
  }
  return undefined;
}

function parseContentDisposition(
  headerBlock: string,
): { name?: string; filename?: string } {
  const result: { name?: string; filename?: string } = {};
  for (const line of headerBlock.split('\r\n')) {
    if (!line.toLowerCase().includes('content-disposition')) continue;
    const params = line.split(';').slice(1);
    for (const param of params) {
      const trimmed = param.trim();
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim().toLowerCase();
      let val = trimmed.slice(eqIndex + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      if (key === 'name') result.name = val;
      if (key === 'filename') result.filename = val;
    }
  }
  return result;
}

function parseHeaderValue(headerBlock: string, headerName: string): string | undefined {
  const target = headerName.toLowerCase();
  for (const line of headerBlock.split('\r\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const name = line.slice(0, colonIndex).trim().toLowerCase();
    if (name === target) {
      return line.slice(colonIndex + 1).trim().split(';')[0].trim();
    }
  }
  return undefined;
}

function splitBuffer(buf: Buffer, delimiter: Buffer): Buffer[] {
  const parts: Buffer[] = [];
  let start = 0;
  while (start < buf.length) {
    const index = buf.indexOf(delimiter, start);
    if (index === -1) {
      parts.push(buf.subarray(start));
      break;
    }
    parts.push(buf.subarray(start, index));
    start = index + delimiter.length;
  }
  return parts;
}

function findDoubleNewline(buf: Buffer): number {
  const marker = Buffer.from('\r\n\r\n');
  return buf.indexOf(marker);
}

function trimCRLF(buf: Buffer): Buffer {
  let start = 0;
  let end = buf.length;
  while (start < end && (buf[start] === 0x0d || buf[start] === 0x0a)) start++;
  while (end > start && (buf[end - 1] === 0x0d || buf[end - 1] === 0x0a)) end--;
  if (start === 0 && end === buf.length) return buf;
  return buf.subarray(start, end);
}
