"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FormField } from "@/lib/forms/fields";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function TodoControl({ field, answer, onChange }: {
  field: FormField;
  answer: Record<string, number>;
  onChange: (answer: Record<string, number>) => void;
}) {
  function quantity(serviceId: string, count: number) {
    onChange({ ...answer, [serviceId]: count });
  }
  return (
    <fieldset aria-describedby={field.help ? "f-" + field.id + "-help" : undefined}>
      <legend className="text-sm font-medium">{field.label}{field.required ? " (required)" : ""}</legend>
      {field.help && <p id={"f-" + field.id + "-help"} className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
      <div className="-mx-4 mt-2 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2 sm:mx-0">
        {(field.services ?? []).map((service) => {
          const count = answer[service.id] ?? 0;
          return (
            <div key={service.id} className="min-w-0">
              <input type="hidden" name={field.id + "." + service.id} value={count} />
              <button type="button" aria-pressed={count > 0} onClick={() => quantity(service.id, count > 0 ? 0 : 1)}
                className={cn("relative flex w-full flex-col overflow-hidden rounded-panel border bg-background text-left transition-[transform,box-shadow] duration-(--dur-2) ease-(--ease-out) active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none", count > 0 && "ring-2 ring-primary")}>
                {service.image_url ? <Image src={service.image_url} alt="" width={320} height={320} unoptimized className="aspect-square w-full object-cover" />
                  : <span aria-hidden="true" className="flex aspect-square w-full items-center justify-center bg-muted text-3xl text-muted-foreground">{service.name.charAt(0)}</span>}
                {count > 0 && <Badge className="absolute right-2 top-2 bg-primary text-primary-foreground"><Check aria-hidden="true" className="size-4" /><span className="sr-only">Picked</span></Badge>}
                <span className="flex w-full flex-1 flex-col gap-1 p-3">
                  <span className="break-words text-sm font-medium">{service.name}</span>
                  {service.note && <span className="line-clamp-2 text-xs text-muted-foreground">{service.note}</span>}
                  {field.price_display !== "hidden" && service.price !== undefined && <span className="nums mt-1 text-xs">{field.price_display === "from" ? "From " : ""}{formatMoney(service.price)}</span>}
                </span>
              </button>
              {count > 0 && service.max_qty > 1 && (
                <div role="group" aria-label={service.name + " quantity"} className="mt-2 flex items-center justify-between gap-1 rounded-panel border bg-background">
                  <Button type="button" variant="ghost" className="size-11 p-0" aria-label={"Decrease " + service.name} onClick={() => quantity(service.id, count - 1)}>-</Button>
                  <output aria-live="polite" className="nums text-sm">{count}</output>
                  <Button type="button" variant="ghost" className="size-11 p-0" aria-label={"Increase " + service.name} disabled={count >= service.max_qty} onClick={() => quantity(service.id, count + 1)}>+</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
