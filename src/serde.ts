/**
 * Serialization utilities — JSON, YAML, CSV, XML.
 *
 * Pure Node.js implementations (no native dependencies).
 */

// ── JSON ────────────────────────────────────────────────────────────

/**
 * Parse a JSON string into a value.
 */
export function jsonParse(s: string): any {
  return JSON.parse(s);
}

/**
 * Serialize a value to a compact JSON string.
 */
export function jsonStringify(obj: any): string {
  return JSON.stringify(obj);
}

/**
 * Serialize a value to a pretty-printed JSON string (2-space indent).
 */
export function jsonStringifyPretty(obj: any): string {
  return JSON.stringify(obj, null, 2);
}

// ── YAML ────────────────────────────────────────────────────────────

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
export function yamlParse(s: string): string {
  const result = parseYamlValue(s);
  return JSON.stringify(result);
}

function parseYamlValue(s: string): any {
  const lines = s.split("\n");
  return parseYamlLines(lines, 0, 0).value;
}

interface YamlParseResult {
  value: any;
  nextLine: number;
}

function parseYamlLines(lines: string[], startLine: number, baseIndent: number): YamlParseResult {
  const result: Record<string, any> = {};
  let i = startLine;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines and comments
    if (line.trim() === "" || line.trim().startsWith("#")) {
      i++;
      continue;
    }

    const lineIndent = line.length - line.trimStart().length;
    if (lineIndent < baseIndent) break;

    const trimmed = line.trim();

    // Check for sequence item at this level
    if (trimmed.startsWith("- ")) {
      const arr: any[] = [];
      while (i < lines.length) {
        const arrLine = lines[i];
        if (arrLine.trim() === "" || arrLine.trim().startsWith("#")) { i++; continue; }
        const arrIndent = arrLine.length - arrLine.trimStart().length;
        if (arrIndent < baseIndent) break;
        const arrTrimmed = arrLine.trim();
        if (!arrTrimmed.startsWith("- ")) break;
        arr.push(parseScalar(arrTrimmed.slice(2).trim()));
        i++;
      }
      return { value: arr, nextLine: i };
    }

    // Key-value pair
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();

    if (rawValue === "" || rawValue === "|" || rawValue === ">") {
      // Nested object or block scalar
      const nextNonEmpty = findNextNonEmptyLine(lines, i + 1);
      if (nextNonEmpty < lines.length) {
        const nextIndent = lines[nextNonEmpty].length - lines[nextNonEmpty].trimStart().length;
        if (nextIndent > lineIndent) {
          // Check if nested is a sequence
          if (lines[nextNonEmpty].trim().startsWith("- ")) {
            const sub = parseYamlLines(lines, nextNonEmpty, nextIndent);
            result[key] = sub.value;
            i = sub.nextLine;
          } else {
            const sub = parseYamlLines(lines, nextNonEmpty, nextIndent);
            result[key] = sub.value;
            i = sub.nextLine;
          }
        } else {
          result[key] = null;
          i++;
        }
      } else {
        result[key] = null;
        i++;
      }
    } else {
      result[key] = parseScalar(rawValue);
      i++;
    }
  }

  return { value: result, nextLine: i };
}

function findNextNonEmptyLine(lines: string[], start: number): number {
  for (let i = start; i < lines.length; i++) {
    if (lines[i].trim() !== "" && !lines[i].trim().startsWith("#")) return i;
  }
  return lines.length;
}

function parseScalar(s: string): any {
  // Remove surrounding quotes
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (s === "null" || s === "~") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  return s;
}

/**
 * Convert a JSON string to basic YAML output.
 */
export function yamlDump(jsonStr: string): string {
  const obj = JSON.parse(jsonStr);
  return dumpYamlValue(obj, 0);
}

function dumpYamlValue(value: any, indent: number): string {
  const prefix = "  ".repeat(indent);

  if (value === null || value === undefined) return "null\n";
  if (typeof value === "boolean") return value ? "true\n" : "false\n";
  if (typeof value === "number") return `${value}\n`;
  if (typeof value === "string") {
    if (value.includes("\n") || value.includes(":") || value.includes("#")) {
      return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"\n`;
    }
    return `${value}\n`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]\n";
    let out = "\n";
    for (const item of value) {
      if (typeof item === "object" && item !== null) {
        out += `${prefix}- `;
        const sub = dumpYamlValue(item, indent + 1).trimStart();
        out += sub;
      } else {
        out += `${prefix}- ${dumpYamlValue(item, 0).trim()}\n`;
      }
    }
    return out;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return "{}\n";
    let out = "\n";
    for (const key of keys) {
      const val = value[key];
      if (typeof val === "object" && val !== null) {
        out += `${prefix}${key}:`;
        out += dumpYamlValue(val, indent + 1);
      } else {
        out += `${prefix}${key}: ${dumpYamlValue(val, 0).trim()}\n`;
      }
    }
    return out;
  }

  return `${value}\n`;
}

// ── CSV ─────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into a 2D array of rows.
 *
 * Handles quoted fields with commas, escaped quotes (""), and newlines inside quotes.
 */
export function csvParse(s: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < s.length) {
    const ch = s[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < s.length && s[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        row.push(field);
        field = "";
        i++;
      } else if (ch === "\r") {
        // Handle \r\n or lone \r
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i++;
        if (i < s.length && s[i] === "\n") i++;
      } else if (ch === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Last field / row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a CSV string with a header row into an array of record objects.
 */
export function csvParseRecords(s: string): Record<string, string>[] {
  const rows = csvParse(s);
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      record[headers[i]] = row[i] ?? "";
    }
    return record;
  });
}

/**
 * Serialize a 2D array of rows into a CSV string.
 */
export function csvDump(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((field) => {
          if (field.includes(",") || field.includes('"') || field.includes("\n") || field.includes("\r")) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        })
        .join(","),
    )
    .join("\n");
}

// ── XML ────────────────────────────────────────────────────────────

interface XmlNode {
  [key: string]: any;
}

/**
 * Parse a simple XML string into a JSON-compatible object.
 *
 * Supports tags, text content, attributes, nested elements, and repeated tags (arrays).
 * Self-closing tags are represented as empty objects.
 */
export function xmlToJson(xml: string): object {
  let pos = 0;

  function skipWhitespace(): void {
    while (pos < xml.length && /\s/.test(xml[pos])) pos++;
  }

  function parseAttributes(): Record<string, string> {
    const attrs: Record<string, string> = {};
    while (pos < xml.length) {
      skipWhitespace();
      if (pos >= xml.length || xml[pos] === ">" || xml[pos] === "/" || xml[pos] === "?") break;
      // Read attribute name
      let name = "";
      while (pos < xml.length && xml[pos] !== "=" && xml[pos] !== ">" && xml[pos] !== "/" && !/\s/.test(xml[pos])) {
        name += xml[pos++];
      }
      if (!name) break;
      skipWhitespace();
      if (pos < xml.length && xml[pos] === "=") {
        pos++; // skip =
        skipWhitespace();
        const quote = xml[pos];
        if (quote === '"' || quote === "'") {
          pos++; // skip opening quote
          let value = "";
          while (pos < xml.length && xml[pos] !== quote) {
            value += xml[pos++];
          }
          pos++; // skip closing quote
          attrs[name] = decodeXmlEntities(value);
        }
      }
    }
    return attrs;
  }

  function parseNode(): XmlNode | string | null {
    skipWhitespace();
    if (pos >= xml.length) return null;

    // Not a tag — text content
    if (xml[pos] !== "<") {
      let text = "";
      while (pos < xml.length && xml[pos] !== "<") {
        text += xml[pos++];
      }
      return decodeXmlEntities(text.trim());
    }

    // Skip XML declarations <?...?> and comments <!--...-->
    if (xml.startsWith("<?", pos)) {
      const end = xml.indexOf("?>", pos);
      pos = end === -1 ? xml.length : end + 2;
      return parseNode();
    }
    if (xml.startsWith("<!--", pos)) {
      const end = xml.indexOf("-->", pos);
      pos = end === -1 ? xml.length : end + 3;
      return parseNode();
    }
    if (xml.startsWith("<!", pos)) {
      const end = xml.indexOf(">", pos);
      pos = end === -1 ? xml.length : end + 1;
      return parseNode();
    }

    // Closing tag — return null to signal end
    if (xml[pos + 1] === "/") {
      return null;
    }

    // Opening tag
    pos++; // skip <
    let tagName = "";
    while (pos < xml.length && xml[pos] !== ">" && xml[pos] !== "/" && !/\s/.test(xml[pos])) {
      tagName += xml[pos++];
    }

    const attrs = parseAttributes();
    skipWhitespace();

    // Self-closing tag
    if (pos < xml.length && xml[pos] === "/") {
      pos++; // skip /
      if (pos < xml.length && xml[pos] === ">") pos++; // skip >
      const node: XmlNode = {};
      if (Object.keys(attrs).length > 0) {
        node["@attributes"] = attrs;
      }
      return { [tagName]: node };
    }

    pos++; // skip >

    // Parse children
    const children: any[] = [];
    while (pos < xml.length) {
      skipWhitespace();
      if (pos >= xml.length) break;

      // Check for closing tag
      if (xml.startsWith(`</${tagName}`, pos)) {
        const closeEnd = xml.indexOf(">", pos);
        pos = closeEnd === -1 ? xml.length : closeEnd + 1;
        break;
      }

      const child = parseNode();
      if (child === null) {
        // We hit a closing tag for current element
        const closeEnd = xml.indexOf(">", pos);
        pos = closeEnd === -1 ? xml.length : closeEnd + 1;
        break;
      }
      children.push(child);
    }

    // Build result
    const result: XmlNode = {};
    if (Object.keys(attrs).length > 0) {
      result["@attributes"] = attrs;
    }

    // If only text children, set #text
    const textChildren = children.filter((c) => typeof c === "string");
    const elementChildren = children.filter((c) => typeof c === "object" && c !== null);

    if (textChildren.length > 0 && elementChildren.length === 0) {
      if (Object.keys(attrs).length > 0) {
        result["#text"] = textChildren.join("");
      } else {
        return { [tagName]: textChildren.join("") };
      }
    }

    // Merge element children
    for (const child of elementChildren) {
      for (const key of Object.keys(child)) {
        if (key in result) {
          // Convert to array if not already
          if (!Array.isArray(result[key])) {
            result[key] = [result[key]];
          }
          result[key].push(child[key]);
        } else {
          result[key] = child[key];
        }
      }
    }

    return { [tagName]: Object.keys(result).length === 0 ? {} : result };
  }

  const parsed = parseNode();
  if (parsed === null || typeof parsed === "string") return {};
  return parsed;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Convert a JSON-compatible object to an XML string.
 *
 * @param obj Object to convert
 * @param rootTag Optional root tag name (default: "root")
 */
export function jsonToXml(obj: object, rootTag?: string): string {
  function valueToXml(key: string, value: any, indent: number): string {
    const pad = "  ".repeat(indent);

    if (value === null || value === undefined) {
      return `${pad}<${key} />`;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return `${pad}<${key}>${escapeXml(String(value))}</${key}>`;
    }

    if (Array.isArray(value)) {
      return value.map((item) => valueToXml(key, item, indent)).join("\n");
    }

    if (typeof value === "object") {
      const attrs = value["@attributes"] as Record<string, string> | undefined;
      const text = value["#text"] as string | undefined;

      let attrStr = "";
      if (attrs) {
        attrStr = Object.entries(attrs)
          .map(([k, v]) => ` ${k}="${escapeXml(String(v))}"`)
          .join("");
      }

      const childKeys = Object.keys(value).filter((k) => k !== "@attributes" && k !== "#text");

      if (childKeys.length === 0 && !text) {
        return `${pad}<${key}${attrStr} />`;
      }

      if (childKeys.length === 0 && text !== undefined) {
        return `${pad}<${key}${attrStr}>${escapeXml(String(text))}</${key}>`;
      }

      const childXml = childKeys
        .map((ck) => valueToXml(ck, value[ck], indent + 1))
        .join("\n");

      return `${pad}<${key}${attrStr}>\n${childXml}\n${pad}</${key}>`;
    }

    return `${pad}<${key}>${escapeXml(String(value))}</${key}>`;
  }

  const root = rootTag ?? "root";

  // If the object has a single top-level key and no rootTag was specified,
  // use that key as the root tag
  const keys = Object.keys(obj);
  if (keys.length === 1 && rootTag === undefined) {
    const topKey = keys[0];
    const topValue = (obj as any)[topKey];
    if (typeof topValue === "object" && topValue !== null && !Array.isArray(topValue)) {
      return valueToXml(topKey, topValue, 0);
    }
  }

  return valueToXml(root, obj, 0);
}
