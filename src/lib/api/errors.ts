import { isAxiosError } from 'axios';
import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';

/**
 * A single specific message from the API. `field` is set when the backend
 * names the property the message belongs to, so it can be shown inline.
 */
export interface ApiFieldError {
  field?: string;
  message: string;
}

export interface ParsedApiError {
  /** Specific, user-facing summary — never a bare "Validation failed" when details exist. */
  message: string;
  details: ApiFieldError[];
  status?: number;
}

const GENERIC_MESSAGE = 'Something went wrong.';
const NETWORK_MESSAGE = 'Cannot reach the server. Check your connection and try again.';
const TIMEOUT_MESSAGE = 'The request timed out. Please try again.';
const MAX_SUMMARISED = 3;

// The backend's exception filter collapses class-validator output to
// { message: 'Validation failed', errors: ['<property> must be …', …] },
// so the property name has to be recovered from the message text itself.
const FORBIDDEN_PROPERTY = /^property (\S+) should not exist$/;
const NAMED_PROPERTY = /^([a-z][\w$]*(?:\.[\w$]+)*) (?:must|should)\b/;

function toDetail(entry: unknown): ApiFieldError | null {
  if (typeof entry === 'string') {
    const message = entry.trim();
    if (!message) return null;
    const forbidden = FORBIDDEN_PROPERTY.exec(message);
    if (forbidden) return { field: forbidden[1], message };
    return { field: NAMED_PROPERTY.exec(message)?.[1], message };
  }

  if (entry && typeof entry === 'object') {
    const record = entry as Record<string, unknown>;
    const message = typeof record.message === 'string' ? record.message.trim() : '';
    if (!message) return null;
    // Zod issues carry `path`; other shapes use `field` / `property`.
    const path = Array.isArray(record.path)
      ? record.path.filter((p) => typeof p === 'string' || typeof p === 'number').join('.')
      : undefined;
    const field =
      (typeof record.field === 'string' && record.field) ||
      (typeof record.property === 'string' && record.property) ||
      (path || undefined) ||
      undefined;
    return { field, message };
  }

  return null;
}

function collectDetails(body: unknown): ApiFieldError[] {
  if (!body || typeof body !== 'object') return [];
  const record = body as Record<string, unknown>;
  const details: ApiFieldError[] = [];

  // `message` is only a detail source when it is an array (raw class-validator
  // output); as a string it is the summary and is handled by parseApiError.
  for (const bucket of [record.errors, record.message, record.issues, record.details]) {
    if (Array.isArray(bucket)) {
      for (const entry of bucket) {
        const detail = toDetail(entry);
        if (detail) details.push(detail);
      }
    } else if (bucket && typeof bucket === 'object') {
      // Field-keyed maps: { classroomId: ['is required'] }
      for (const [field, value] of Object.entries(bucket as Record<string, unknown>)) {
        for (const message of Array.isArray(value) ? value : [value]) {
          if (typeof message === 'string' && message.trim()) {
            details.push({ field, message: message.trim() });
          }
        }
      }
    }
  }

  const seen = new Set<string>();
  return details.filter((d) => {
    const key = `${d.field ?? ''}::${d.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Joins specific messages into one line, capped so a toast stays readable. */
export function summariseDetails(details: ApiFieldError[]): string {
  const shown = details.slice(0, MAX_SUMMARISED).map((d) => d.message).join(' · ');
  const rest = details.length - MAX_SUMMARISED;
  return rest > 0 ? `${shown} (+${rest} more)` : shown;
}

/**
 * Normalises any thrown value into a specific message plus the field-level
 * detail the backend supplied. Use this instead of reading `data.message`
 * directly — that alone yields unusable text like "Validation failed".
 */
export function parseApiError(error: unknown): ParsedApiError {
  if (isAxiosError(error)) {
    // No response at all — the server is unreachable, not rejecting us.
    // `error.message` here is "Network Error", which tells a user nothing.
    if (!error.response) {
      const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
      return { message: timedOut ? TIMEOUT_MESSAGE : NETWORK_MESSAGE, details: [] };
    }

    const body = error.response.data as Record<string, unknown> | undefined;
    const details = collectDetails(body);
    const summary = typeof body?.message === 'string' ? body.message : undefined;
    return {
      message: details.length
        ? summariseDetails(details)
        : summary || error.message || GENERIC_MESSAGE,
      details,
      status: error.response?.status,
    };
  }

  if (error instanceof Error) {
    return { message: error.message || GENERIC_MESSAGE, details: [] };
  }

  return { message: GENERIC_MESSAGE, details: [] };
}

/** Convenience wrapper for callers that only need the display string. */
export function apiErrorMessage(error: unknown): string {
  return parseApiError(error).message;
}

/**
 * Attaches server-side field errors to the matching react-hook-form fields.
 * Returns the details that had no matching field, so the caller can surface
 * them some other way (a toast, usually).
 */
export function applyFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
): ApiFieldError[] {
  const { details } = parseApiError(error);
  const known = new Set(Object.keys(form.getValues() ?? {}));

  return details.filter((detail) => {
    const root = detail.field?.split('.')[0];
    if (!detail.field || !root || !known.has(root)) return true;
    form.setError(detail.field as FieldPath<T>, { type: 'server', message: detail.message });
    return false;
  });
}
