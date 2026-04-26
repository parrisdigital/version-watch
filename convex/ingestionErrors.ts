import { v } from "convex/values";

export const sourceErrorCodeValidator = v.union(
  v.literal("fetch_blocked"),
  v.literal("fetch_timeout"),
  v.literal("http_error"),
  v.literal("parse_error"),
  v.literal("empty_result"),
  v.literal("unknown_error"),
);

export type SourceErrorCode =
  | "fetch_blocked"
  | "fetch_timeout"
  | "http_error"
  | "parse_error"
  | "empty_result"
  | "unknown_error";

export class SourceIngestionError extends Error {
  readonly code: SourceErrorCode;

  constructor(code: SourceErrorCode, message: string) {
    super(message);
    this.name = "SourceIngestionError";
    this.code = code;
  }
}

export function classifyHttpStatus(status: number): SourceErrorCode {
  if (status === 401 || status === 403 || status === 406 || status === 429) {
    return "fetch_blocked";
  }

  return "http_error";
}

export function classifyThrownError(error: unknown): SourceErrorCode {
  if (error instanceof SourceIngestionError) {
    return error.code;
  }

  if (error instanceof Error && /timeout|aborted|abort/i.test(error.name + " " + error.message)) {
    return "fetch_timeout";
  }

  return "unknown_error";
}

export function getIngestionErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown ingestion error";
}
