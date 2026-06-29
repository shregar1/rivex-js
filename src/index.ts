// ── Core ──
export { Rivex, FastAPI } from './application.js';
export type { RivexOptions } from './application.js';
export { Router, APIRouter } from './router.js';
export {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Head,
  Options,
  isController,
} from './controller.js';

// ── Request / Response ──
export { Request, Headers } from './request.js';
export {
  Response,
  JSONResponse,
  HTMLResponse,
  PlainTextResponse,
  RedirectResponse,
  StreamingResponse,
} from './response.js';

// ── Middleware ──
export {
  CORSMiddleware,
  GZipMiddleware,
  RequestIdMiddleware,
  TrustedHostMiddleware,
} from './middleware.js';
export type {
  Middleware,
  MiddlewareClass,
  CORSOptions,
  GZipOptions,
  RequestIdOptions,
  TrustedHostOptions,
} from './middleware.js';

// ── Dependencies ──
export { Dependency, Depends, DependencyMarker } from './depends.js';
export type { DependencyProvider } from './depends.js';

// ── Exceptions ──
export { HTTPException } from './exceptions.js';

// ── Background tasks ──
export { BackgroundTask, BackgroundTasks } from './background.js';

// ── Security ──
export {
  APIKeyHeader,
  HTTPBearer,
  OAuth2PasswordBearer,
} from './security.js';
export type { HTTPAuthorizationCredentials } from './security.js';

// ── Uploads ──
export { UploadFile, File, Form, parseMultipart } from './uploads.js';

// ── Status codes ──
export { HTTPMethod, APIStatus } from './status.js';
export {
  HTTP_200_OK,
  HTTP_201_CREATED,
  HTTP_202_ACCEPTED,
  HTTP_204_NO_CONTENT,
  HTTP_301_MOVED_PERMANENTLY,
  HTTP_302_FOUND,
  HTTP_304_NOT_MODIFIED,
  HTTP_307_TEMPORARY_REDIRECT,
  HTTP_308_PERMANENT_REDIRECT,
  HTTP_400_BAD_REQUEST,
  HTTP_401_UNAUTHORIZED,
  HTTP_403_FORBIDDEN,
  HTTP_404_NOT_FOUND,
  HTTP_405_METHOD_NOT_ALLOWED,
  HTTP_409_CONFLICT,
  HTTP_422_UNPROCESSABLE_ENTITY,
  HTTP_429_TOO_MANY_REQUESTS,
  HTTP_500_INTERNAL_SERVER_ERROR,
  HTTP_502_BAD_GATEWAY,
  HTTP_503_SERVICE_UNAVAILABLE,
  HTTP_504_GATEWAY_TIMEOUT,
} from './status.js';

// ── OpenAPI ──
export { generateOpenAPI } from './openapi.js';
export type { OpenAPISpec } from './openapi.js';

// ── Testing ──
export { TestClient, TestResponse } from './testing.js';
export type { RequestOptions } from './testing.js';

// ── Types ──
export type {
  Context,
  HandlerFunc,
  MiddlewareFunc,
  ExceptionHandler,
  RouteOptions,
  RouteRecord,
  RawResponse,
  RawRequest,
} from './types.js';

// ── Utilities ──
export { hashPassword, verifyPassword } from './hasher.js';
export {
  slugify, escapeHtml, unescapeHtml, stripHtml,
  truncate, camelToSnake, snakeToCamel,
} from './text.js';
export {
  validateEmail, validateUrl, validateUuid,
  validateIp, isAscii,
} from './validate.js';
export {
  b64Encode, b64Decode, b64urlEncode, b64urlDecode,
  hexEncode, hexDecode, urlEncode, urlDecode,
} from './encoding.js';
export {
  nowIso, nowTimestamp, parseIso8601, formatIso8601,
  timestampToIso, isoToTimestamp, formatHttpDate, parseHttpDate,
} from './datetime.js';
export { Regex, reMatch, reFindAll, reReplace, reSplit } from './regex.js';
export { Cache } from './cache.js';
export type { CacheOptions } from './cache.js';
export {
  sha256, sha512, sha256Bytes, sha512Bytes,
  hmacSHA256, hmacSHA512, hmacSHA256Bytes, hmacSHA512Bytes,
  hmacSHA256Verify, hmacSHA512Verify,
  aesGcmEncrypt, aesGcmDecrypt,
  pbkdf2Derive, pbkdf2Verify,
  secureRandomBytes, randomToken, randomHex,
  ed25519Keygen, ed25519Sign, ed25519Verify,
} from './crypto.js';
export {
  uuidV4,
  uuidV7,
  uuidV4Bulk,
  uuidV7Bulk,
  ulid,
  ulidBulk,
  ulidTimestamp,
  snowflakeId,
  snowflakeIdBulk,
  snowflakeTimestamp,
  snowflakeMachineId,
  nanoId,
  nanoIdBulk,
} from "./ids.js";

// ── Middleware Utilities ──
export {
  RateLimiter,
  ipInCidr,
  ipInCidrs,
  isPrivateIp,
  etagCrc32,
  etagWeak,
  etagStrong,
  etagMatch,
  bodySha256,
  bodySha256Verify,
  webhookSign,
  webhookVerify,
  parseAccept,
  negotiateContentType,
  parseAcceptLanguage,
  negotiateLanguage,
} from "./mw.js";

// ── Serialization ──
export {
  jsonParse, jsonStringify, jsonStringifyPretty,
  yamlParse, yamlDump,
  csvParse, csvParseRecords, csvDump,
  xmlToJson, jsonToXml,
} from "./serde.js";

// ── Compression ──
export {
  gzipCompress, gzipDecompress,
  brotliCompress, brotliDecompress,
} from "./compress.js";

// ── Text Processing ──
export {
  markdownToHtml,
  renderTemplate,
  textDiff,
  levenshteinDistance,
  similarityScore,
  fuzzyMatch,
  tokenizeWords,
  tokenizeSentences,
} from "./text_ext.js";

// ── Validation Extensions ──
export {
  luhnCheck, cardType,
  validateIban, formatIban,
  sanitizeHtml, stripHtmlTags,
} from "./validate_ext.js";

// ── Encoding Extensions ──
export {
  parseQueryString, buildQueryString,
  parseCookies, buildSetCookie,
  jwtEncode, jwtDecode,
} from "./encoding_ext.js";

// ── Datetime Extensions ──
export {
  cronValidate,
  convertTimezone,
} from "./datetime_ext.js";

// ── Data Structures ──
export {
  BloomFilter,
  HyperLogLog,
  PriorityQueue,
  SortedSet,
  RingBuffer,
} from "./structures.js";

// ── File / IO ──
export {
  checksumMd5, checksumSha256, checksumCrc32,
  zipCreate, zipExtract,
  pdfExtractText,
  sniffMime,
  imageDimensions,
} from "./file_io.js";

// ── Protocol ──
export {
  parseRawHeaders,
  parseUrl, buildUrl, resolveUrl,
  sniffMimeType,
  mimeFromExtension, extensionFromMime,
  parseGraphQL, validateGraphQL,
} from "./protocol.js";
export type { ParsedUrl } from "./protocol.js";

// ── Version ──
export const VERSION = '0.1.0';
