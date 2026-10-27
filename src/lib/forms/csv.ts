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

type ParsedVersion = {
  id: string;
  number: number;
  fields: FormField[];
};

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

function render(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((item) => String(item)).join("; ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return "";
}

function cell(value: unknown): string {
  return quote(guard(render(value)));
}

export function responsesToCsv(
  versions: CsvVersion[],
  responses: CsvResponse[],
): string {
  const parsed: ParsedVersion[] = versions.map((version) => {
    const result = parseFields(version.fields);
    return {
      id: version.id,
      number: version.number,
      fields: "error" in result ? [] : result.fields,
    };
  });

  // Newest first, so the first time a field id appears gives its newest label.
  const byNumber = [...parsed].sort((a, b) => b.number - a.number);
  const columns: { id: string; label: string }[] = [];
  const seen = new Set<string>();

  for (const version of byNumber) {
    for (const field of version.fields) {
      // Headings are labels on a group, not questions with answers.
      if (field.type === "heading" || seen.has(field.id)) continue;
      seen.add(field.id);
      columns.push({ id: field.id, label: field.label });
    }
  }

  const versionFields = new Map(parsed.map((version) => [version.id, version.fields]));
  const versionNumber = new Map(parsed.map((version) => [version.id, version.number]));

  const lines: string[] = [];
  lines.push(["Submitted", "Version", ...columns.map((column) => column.label)].map(cell).join(","));

  for (const response of responses) {
    const fields = versionFields.get(response.version_id) ?? [];
    const present = new Set(fields.map((field) => field.id));
    const answers =
      response.answers && typeof response.answers === "object" && !Array.isArray(response.answers)
        ? (response.answers as Record<string, unknown>)
        : {};
    const row = [
      response.submitted_at.toISOString(),
      versionNumber.get(response.version_id)?.toString() ?? "",
      ...columns.map((column) =>
        present.has(column.id) ? answers[column.id] : undefined,
      ),
    ];
    lines.push(row.map(cell).join(","));
  }

  // The BOM makes Excel read the file as UTF-8 rather than guessing.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
