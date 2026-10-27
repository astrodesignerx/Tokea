"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HoldToConfirm } from "@/components/ui/hold-to-confirm";
import { LocalTime } from "@/components/qr-codes/local-time";
import { deleteAllResponsesAction, deleteResponseAction } from "@/lib/actions/forms";
import type { SummaryQuestion } from "@/lib/forms/data";
import { parseFields } from "@/lib/forms/fields";
import { answerText, responseColumns } from "@/lib/forms/csv";

/**
 * Responses tab: totals, a chart per choice or rating question, then the table.
 *
 * Charts are plain elements rather than a chart library: the shapes are small,
 * and transform-only bars stay smooth on a phone.
 */

type VersionProp = { id: string; number: number; fields: unknown };

type ResponseProp = {
  id: string;
  version_id: string;
  answers: unknown;
  /** ISO string, pre-formatted on the server. */
  submitted_at: string;
};

type Props = {
  formId: string;
  versions: VersionProp[];
  responses: ResponseProp[];
  summary: { total: number; questions: SummaryQuestion[] };
  page: number;
  pages: number;
  total: number;
};

export function ResponseSummary({
  formId,
  versions,
  responses,
  summary,
  page,
  pages,
  total,
}: Props) {
  const columns = responseColumns(versions);
  const fieldsByVersion = new Map(
    versions.map((version) => {
      const parsed = parseFields(version.fields);
      return [
        version.id,
        "error" in parsed ? [] : parsed.fields.map((field) => field.id),
      ];
    }),
  );

  return (
    <div className="mt-6 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="nf-panel px-5 py-4">
          <p className="font-display text-3xl font-medium tabular-nums">{summary.total}</p>
          <p className="text-sm text-muted-foreground">
            {summary.total === 1 ? "response" : "responses"}
          </p>
        </div>
        <Button asChild variant="outline">
          <a href={`/api/forms/${formId}/export`}>
            <Download className="size-4" /> Download CSV
          </a>
        </Button>
      </div>

      {summary.questions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {summary.questions.map((question) => (
            <Chart key={question.id} question={question} />
          ))}
        </div>
      )}

      {total === 0 ? (
        <div className="rounded-lg border border-dashed px-5 py-10 text-center">
          <p className="text-sm font-medium">No responses yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Share the form and answers will appear here, newest first.
          </p>
        </div>
      ) : (
        <>
          <div className="nf-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">Version</th>
                    {columns.map((column) => (
                      <th key={column.id} className="px-4 py-3 font-medium">
                        {column.label}
                      </th>
                    ))}
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {responses.map((response) => {
                    const present = fieldsByVersion.get(response.version_id) ?? [];
                    const answers =
                      response.answers &&
                      typeof response.answers === "object" &&
                      !Array.isArray(response.answers)
                        ? (response.answers as Record<string, unknown>)
                        : {};
                    const version = versions.find((item) => item.id === response.version_id);

                    return (
                      <tr
                        key={response.id}
                        className="align-top transition-colors duration-200 hover:bg-muted/40"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          <LocalTime iso={response.submitted_at} />
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {version?.number ?? ""}
                        </td>
                        {columns.map((column) => {
                          const shown = present.includes(column.id)
                            ? answerText(answers[column.id])
                            : "";
                          return (
                            <td key={column.id} className="max-w-[18rem] px-4 py-3">
                              {shown ? (
                                <span className="line-clamp-3 break-words">{shown}</span>
                              ) : (
                                <span className="text-muted-foreground">No answer</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3">
                          <form action={deleteResponseAction}>
                            <input type="hidden" name="form_id" value={formId} />
                            <input type="hidden" name="response_id" value={response.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              aria-label="Delete response"
                              title="Delete response"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm">
              {page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/forms/${formId}?tab=responses&page=${page - 1}`}>
                    Previous
                  </Link>
                </Button>
              ) : null}
              <span className="text-muted-foreground">
                Page {page} of {pages}
              </span>
              {page < pages ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/forms/${formId}?tab=responses&page=${page + 1}`}>
                    Next
                  </Link>
                </Button>
              ) : null}
            </div>

            <div className="w-full max-w-xs">
              <HoldToConfirm
                label="Hold to delete all responses"
                icon={<Trash2 className="size-4" />}
                onConfirm={async () => {
                  const data = new FormData();
                  data.set("form_id", formId);
                  await deleteAllResponsesAction(data);
                  toast.success("Responses deleted");
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Chart({ question }: { question: SummaryQuestion }) {
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="nf-panel p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">{question.label}</h3>
        {question.type === "rating" && question.average !== undefined && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {question.average} average
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {question.answered} {question.answered === 1 ? "answer" : "answers"}
      </p>

      <div className="mt-4 space-y-2">
        {question.rows.map((row, index) => (
          <div key={row.label} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 truncate text-muted-foreground" title={row.label}>
              {row.label}
            </span>
            <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-brand transition-transform duration-[220ms] ease-[cubic-bezier(0,0,0.2,1)] motion-reduce:transition-none"
                style={{
                  transform: `scaleX(${grown ? row.share : 0})`,
                  transitionDelay: `${Math.min(index, 6) * 30}ms`,
                }}
              />
            </span>
            <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {row.count} ({Math.round(row.share * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
