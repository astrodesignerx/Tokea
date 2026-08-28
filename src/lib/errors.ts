import { Prisma } from "@/generated/prisma/client";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export const NotFoundError = (msg = "Not found") => new HttpError(404, msg);
export const ForbiddenError = (msg = "Forbidden") => new HttpError(403, msg);

/** Column names embedded in a constraint name, e.g. "Guest_event_id_email_key". */
function tokenize(constraintName: string): string[] {
  return constraintName.split(/[^A-Za-z0-9]+/).filter(Boolean);
}

/**
 * The columns a P2002 fired on.
 *
 * Prisma reports this differently depending on how it reaches the database.
 * With a driver adapter (this project uses @prisma/adapter-pg) there is no
 * `meta.target` at all — the constraint arrives nested under the adapter error.
 * The classic query engine sets `meta.target` instead, as either a field array
 * or a constraint name. All four shapes are handled because getting this wrong
 * fails silently: a duplicate is simply misreported rather than throwing.
 */
function uniqueViolationFields(err: Prisma.PrismaClientKnownRequestError): string[] {
  const meta = err.meta as Record<string, unknown> | undefined;
  if (!meta) return [];

  const adapterError = meta["driverAdapterError"] as
    | { cause?: { constraint?: { fields?: unknown; index?: unknown } } }
    | undefined;
  const constraint = adapterError?.cause?.constraint;
  if (constraint) {
    if (Array.isArray(constraint.fields)) return constraint.fields.map(String);
    if (typeof constraint.index === "string") return tokenize(constraint.index);
  }

  const target = meta["target"];
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return tokenize(target);

  return [];
}

/**
 * True when `err` is a unique-constraint violation (Prisma P2002).
 *
 * Pass `field` to narrow to one column — without it, a handler meant for a
 * duplicate email would also swallow a duplicate slug.
 */
export function isUniqueViolation(err: unknown, field?: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
    return false;
  }
  if (!field) return true;
  return uniqueViolationFields(err).includes(field);
}
