import type {
  Form,
  FormResponse,
  FormVersion,
  Organisation,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseFields, todoPicks, type FormField } from "@/lib/forms/fields";

/**
 * Read side of forms. Every owner-facing query takes the owner id, so one
 * account can never read another's forms or the answers people gave them.
 */

export type { Form, FormResponse, FormVersion };

export const RESPONSES_PER_PAGE = 50;

export async function findOwnedForm(id: string, ownerId: string): Promise<Form | null> {
  return prisma.form.findFirst({ where: { id, owner_id: ownerId } });
}

export type FormListRow = Form & { responses: number; lastResponse: Date | null };

export async function listForms(
  ownerId: string,
  options?: { includeArchived?: boolean },
): Promise<FormListRow[]> {
  const forms = await prisma.form.findMany({
    where: {
      owner_id: ownerId,
      ...(options?.includeArchived ? {} : { status: { not: "archived" } }),
    },
    include: { _count: { select: { responses: true } } },
    orderBy: { created_at: "desc" },
  });

  if (forms.length === 0) return [];

  const last = await prisma.formResponse.groupBy({
    by: ["form_id"],
    where: { form_id: { in: forms.map((form) => form.id) } },
    _max: { submitted_at: true },
  });
  const lastById = new Map(last.map((row) => [row.form_id, row._max.submitted_at]));

  return forms.map(({ _count, ...form }) => ({
    ...form,
    responses: _count.responses,
    lastResponse: lastById.get(form.id) ?? null,
  }));
}

export async function countArchivedForms(ownerId: string): Promise<number> {
  return prisma.form.count({ where: { owner_id: ownerId, status: "archived" } });
}

export type LiveForm = {
  form: Form;
  /** The published version people currently see, or null for a draft. */
  version: FormVersion | null;
  organisation: Organisation | null;
};

export async function getLiveForm(slug: string): Promise<LiveForm | null> {
  const form = await prisma.form.findUnique({
    where: { slug },
    include: { organisation: true },
  });
  if (!form) return null;

  const { organisation, ...rest } = form;
  const version =
    rest.live_version === null
      ? null
      : await prisma.formVersion.findUnique({
          where: { form_id_number: { form_id: rest.id, number: rest.live_version } },
        });

  return { form: rest, version, organisation };
}

/** Status, schedule and limit are the only things that stop a live form. */
export function isFormAccepting(
  form: Pick<Form, "status" | "live_version" | "closes_at" | "response_limit">,
  count: number,
  now = new Date(),
): boolean {
  if (form.status !== "open") return false;
  if (form.live_version === null) return false;
  if (form.closes_at && form.closes_at.getTime() <= now.getTime()) return false;
  if (form.response_limit !== null && count >= form.response_limit) return false;
  return true;
}

export async function listVersions(formId: string): Promise<FormVersion[]> {
  return prisma.formVersion.findMany({
    where: { form_id: formId },
    orderBy: { number: "desc" },
  });
}

export async function listResponses(formId: string, page = 1) {
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;

  const [total, responses] = await Promise.all([
    prisma.formResponse.count({ where: { form_id: formId } }),
    prisma.formResponse.findMany({
      where: { form_id: formId },
      orderBy: { submitted_at: "desc" },
      skip: (safePage - 1) * RESPONSES_PER_PAGE,
      take: RESPONSES_PER_PAGE,
    }),
  ]);

  return {
    responses,
    total,
    page: safePage,
    pages: Math.max(1, Math.ceil(total / RESPONSES_PER_PAGE)),
  };
}

export type SummaryRow = { label: string; count: number; share: number; quantity?: number };

export type SummaryQuestion = {
  id: string;
  label: string;
  type: "single_choice" | "dropdown" | "yes_no" | "rating" | "todo";
  /** How many responses answered this question. */
  answered: number;
  /** Ratings only. */
  average?: number;
  rows: SummaryRow[];
};

const SUMMARY_TYPES: SummaryQuestion["type"][] = [
  "todo",
  "single_choice",
  "dropdown",
  "yes_no",
  "rating",
];

/**
 * Counts for the bar charts. Answers are counted against each response's own
 * version, so a question renamed or removed later still charts the answers it
 * actually collected. The newest version supplies the labels and options.
 */
export async function getResponseSummary(
  formId: string,
): Promise<{ total: number; questions: SummaryQuestion[] }> {
  const [total, versions, responses] = await Promise.all([
    prisma.formResponse.count({ where: { form_id: formId } }),
    prisma.formVersion.findMany({
      where: { form_id: formId },
      orderBy: { number: "desc" },
    }),
    prisma.formResponse.findMany({
      where: { form_id: formId },
      select: { version_id: true, answers: true },
    }),
  ]);

  const newest = versions[0];
  if (!newest) return { total, questions: [] };

  const parsedNewest = parseFields(newest.fields);
  if ("error" in parsedNewest) return { total, questions: [] };

  const fieldsByVersion = new Map<string, FormField[]>();
  for (const version of versions) {
    const parsed = parseFields(version.fields);
    fieldsByVersion.set(version.id, "error" in parsed ? [] : parsed.fields);
  }
  const idsByVersion = new Map(
    [...fieldsByVersion].map(([versionId, fields]) => [
      versionId,
      new Set(fields.map((field) => field.id)),
    ]),
  );

  const questions: SummaryQuestion[] = [];

  const summaryFields = [...parsedNewest.fields];
  for (const fields of fieldsByVersion.values()) {
    for (const field of fields) {
      if (field.type === "todo" && !summaryFields.some((item) => item.id === field.id)) summaryFields.push(field);
    }
  }
  for (const field of summaryFields) {
    if (!SUMMARY_TYPES.includes(field.type as SummaryQuestion["type"])) continue;
    const type = field.type as SummaryQuestion["type"];

    if (type === "todo") {
      const counts = new Map<string, { label: string; count: number; quantity: number }>();
      for (const service of field.services ?? []) counts.set(service.id, { label: service.name, count: 0, quantity: 0 });
      let answered = 0;
      for (const response of responses) {
        const frozen = fieldsByVersion.get(response.version_id)?.find((item) => item.id === field.id && item.type === "todo");
        if (!frozen) continue;
        const answers = response.answers && typeof response.answers === "object" && !Array.isArray(response.answers) ? response.answers as Record<string, unknown> : {};
        const picks = todoPicks(frozen, answers[field.id]);
        if (picks.length > 0) answered++;
        for (const { service, quantity } of picks) {
          const row = counts.get(service.id) ?? { label: service.name, count: 0, quantity: 0 };
          row.count++;
          row.quantity += quantity;
          counts.set(service.id, row);
        }
      }
      questions.push({ id: field.id, label: field.label, type, answered,
        rows: [...counts.values()].sort((first, second) => second.count - first.count).map((row) => ({ ...row, share: answered ? row.count / answered : 0 })),
      });
      continue;
    }

    const values: unknown[] = [];
    for (const response of responses) {
      if (!idsByVersion.get(response.version_id)?.has(field.id)) continue;
      const answers =
        response.answers && typeof response.answers === "object" && !Array.isArray(response.answers)
          ? (response.answers as Record<string, unknown>)
          : {};
      const value = answers[field.id];
      if (value === undefined || value === null || value === "") continue;
      values.push(value);
    }

    const answered = values.length;
    const share = (count: number) => (answered === 0 ? 0 : count / answered);

    if (type === "yes_no") {
      const yes = values.filter((value) => value === true || value === "true").length;
      const no = values.filter((value) => value === false || value === "false").length;
      questions.push({
        id: field.id,
        label: field.label,
        type,
        answered,
        rows: [
          { label: "Yes", count: yes, share: share(yes) },
          { label: "No", count: no, share: share(no) },
        ],
      });
      continue;
    }

    if (type === "rating") {
      const numbers = values
        .map((value) => (typeof value === "number" ? value : Number(value)))
        .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5);
      const rows = [5, 4, 3, 2, 1].map((rating) => {
        const count = numbers.filter((value) => value === rating).length;
        return { label: String(rating), count, share: share(count) };
      });
      questions.push({
        id: field.id,
        label: field.label,
        type,
        answered,
        average:
          numbers.length === 0
            ? undefined
            : Math.round((numbers.reduce((sum, value) => sum + value, 0) / numbers.length) * 10) / 10,
        rows,
      });
      continue;
    }

    // One choice and dropdown. A value an older version offered, now removed,
    // keeps its own row rather than disappearing from the totals.
    const labels = [...(field.options ?? [])];
    const counts = new Map<string, number>(labels.map((label) => [label, 0]));
    for (const value of values) {
      const key = String(value);
      if (!counts.has(key)) {
        labels.push(key);
        counts.set(key, 0);
      }
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    questions.push({
      id: field.id,
      label: field.label,
      type,
      answered,
      rows: labels.map((label) => {
        const count = counts.get(label) ?? 0;
        return { label, count, share: share(count) };
      }),
    });
  }

  return { total, questions };
}
