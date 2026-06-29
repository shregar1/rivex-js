/**
 * Serialization utilities — JSON, YAML, CSV, XML.
 *
 * Pure Node.js implementations (no native dependencies).
 */
/**
 * Parse a JSON string into a value.
 */
export declare function jsonParse(s: string): any;
/**
 * Serialize a value to a compact JSON string.
 */
export declare function jsonStringify(obj: any): string;
/**
 * Serialize a value to a pretty-printed JSON string (2-space indent).
 */
export declare function jsonStringifyPretty(obj: any): string;
/**
 * Parse a basic YAML string into a JSON string.
 *
 * Supports:
 * - Simple key: value pairs
 * - Nested objects via indentation
 * - Sequences (- item)
 * - Quoted strings
 * - Numbers, booleans, null
 */
export declare function yamlParse(s: string): string;
/**
 * Convert a JSON string to basic YAML output.
 */
export declare function yamlDump(jsonStr: string): string;
/**
 * Parse a CSV string into a 2D array of rows.
 *
 * Handles quoted fields with commas, escaped quotes (""), and newlines inside quotes.
 */
export declare function csvParse(s: string): string[][];
/**
 * Parse a CSV string with a header row into an array of record objects.
 */
export declare function csvParseRecords(s: string): Record<string, string>[];
/**
 * Serialize a 2D array of rows into a CSV string.
 */
export declare function csvDump(rows: string[][]): string;
/**
 * Parse a simple XML string into a JSON-compatible object.
 *
 * Supports tags, text content, attributes, nested elements, and repeated tags (arrays).
 * Self-closing tags are represented as empty objects.
 */
export declare function xmlToJson(xml: string): object;
/**
 * Convert a JSON-compatible object to an XML string.
 *
 * @param obj Object to convert
 * @param rootTag Optional root tag name (default: "root")
 */
export declare function jsonToXml(obj: object, rootTag?: string): string;
//# sourceMappingURL=serde.d.ts.map