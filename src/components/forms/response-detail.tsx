"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createChecklistFromResponseAction } from "@/lib/actions/checklists";
import { todoPicks, todoTotal, type FormField } from "@/lib/forms/fields";
import { answerText } from "@/lib/forms/csv";
import { formatMoney } from "@/lib/money";

export function ResponseDetail({ response, fields }: {
  response: { id: string; answers: unknown };
  fields: FormField[];
}) {
  const [state, action, pending] = useActionState(createChecklistFromResponseAction, { error: null });
  const answers = response.answers && typeof response.answers === "object" && !Array.isArray(response.answers) ? response.answers as Record<string, unknown> : {};
  const hasServices = fields.some((field) => field.type === "todo" && todoPicks(field, answers[field.id]).length > 0);
  return (
    <details className="mb-3 min-w-48 max-w-sm rounded-panel border p-3">
      <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View response</summary>
      <dl className="mt-3 space-y-4 text-sm">
        {fields.filter((field) => field.type !== "heading").map((field) => {
          const total = field.type === "todo" ? todoTotal(field, answers[field.id]) : null;
          const picks = field.type === "todo" ? todoPicks(field, answers[field.id]) : [];
          return (
            <div key={field.id}>
              <dt className="font-medium">{field.label}</dt>
              <dd className="mt-1 break-words text-muted-foreground">
                {field.type === "todo" ? <>
                  {picks.length === 0 ? "No answer" : <ul className="space-y-1">{picks.map(({ service, quantity }) => <li key={service.id} className="nums">{service.name} x {quantity}{field.price_display !== "hidden" && service.price !== undefined ? ", " + (field.price_display === "from" ? "From " : "") + formatMoney(service.price * quantity) : ""}</li>)}</ul>}
                  {total !== null && <p className="nums mt-2 font-medium text-foreground">Estimated total: {formatMoney(total)}</p>}
                </> : answerText(answers[field.id]) || "No answer"}
              </dd>
            </div>
          );
        })}
      </dl>
      {hasServices && <form action={action} className="mt-4 space-y-2">
        <input type="hidden" name="response_id" value={response.id} />
        <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Turn into checklist"}</Button>
        {state.error && <p role="alert" className="text-xs text-destructive">{state.error}</p>}
      </form>}
    </details>
  );
}
