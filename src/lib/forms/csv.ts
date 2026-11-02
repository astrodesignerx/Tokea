import { parseFields, type FormField } from "./fields";

/**
 * CSV export, kept pure so the same file can be checked without a database.
 *
 * Answers are keyed by field id, and a field id changes label between versions.
 * The columns therefore follow the newest version first, then any question only
 * older versions asked, using the newest label for each.
 */

export type CsvVersion = {
  id: string;
  number: number;
  /** The version's frozen fields, as stored in FormVersion.fields. */
  fields: unknown;
};

export type CsvResponse = {
  version_id: string;
  /** The stored answers, as in FormResponse.answers. */
  answers: unknown;
  submitted_at: Date;
};

export type ResponseColumn = { id: string; label: string };

/** RFC 4180: quote when the value contains a delimiter, a quote or a newline. */
function quote(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * A cell that starts with one of these runs as a formula in Excel and Sheets.
 * The leading apostrophe keeps the text as text.
 */
function guard(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

/** How one stored answer reads in a cell or a table. */
export function answerText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((item) => String(item)).join("; ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return "";
}

function cell(value: unknown): string {
  return quote(guard(answerText(value)));
}

/**
 * The columns every response shares, newest version first. Also used by the
 * responses table, so the table and the download always line up.
 */
export function responseColumns(versions: CsvVersion[]): ResponseColumn[] {
  const columns: ResponseColumn[] = [];
  const seen = new Set<string>();

  const newestFirst = [...versions].sort((a, b) => b.number - a.number);
  for (const version of newestFirst) {
    const parsed = parseFields(version.fields);
    if ("error" in parsed) continue;
    for (const field of parsed.fields) {
      // Headings are labels on a group, not questions with answers.
      if (field.type === "heading" || seen.has(field.id)) continue;
      seen.add(field.id);
      columns.push({ id: field.id, label: field.label });
    }
  }

  return columns;
}

export function responsesToCsv(
  versions: CsvVersion[],
  responses: CsvResponse[],
): string {
  const fieldsByVersion = new Map<string, FormField[]>(
    versions.map((version) => {
      const parsed = parseFields(version.fields);
      return [version.id, "error" in parsed ? [] : parsed.fields];
    }),
  );
  const numberByVersion = new Map(versions.map((version) => [version.id, version.number]));
  const columns = responseColumns(versions);

  const lines: string[] = [];
  lines.push(
    ["Submitted", "Version", ...columns.map((column) => column.label)].map(cell).join(","),
  );

  for (const response of responses) {
    const fields = fieldsByVersion.get(response.version_id) ?? [];
    const present = new Set(fields.map((field) => field.id));
    const answers =
      response.answers && typeof response.answers === "object" && !Array.isArray(response.answers)
        ? (response.answers as Record<string, unknown>)
        : {};

    const row = [
      response.submitted_at.toISOString(),
      numberByVersion.get(response.version_id)?.toString() ?? "",
      ...columns.map((column) => (present.has(column.id) ? answers[column.id] : undefined)),
    ];
    lines.push(row.map(cell).join(","));
  }

  // The BOM makes Excel read the file as UTF-8 rather than guessing.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
