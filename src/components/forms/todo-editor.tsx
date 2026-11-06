"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { MAX_SERVICES, newFieldId, type FormField, type ServiceItem } from "@/lib/forms/fields";
import { toMajorUnitsInput, toMinorUnits } from "@/lib/money";

export function TodoEditor({ field, onChange }: { field: FormField; onChange: (patch: Partial<FormField>) => void }) {
  const services = field.services ?? [];
  function update(serviceId: string, patch: Partial<ServiceItem>) {
    onChange({ services: services.map((service) => service.id === serviceId ? { ...service, ...patch } : service) });
  }
  function move(index: number, direction: -1 | 1) {
    const next = [...services];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange({ services: next });
  }
  return (
    <div className="space-y-4">
      <Label htmlFor={field.id + "-pricing"}>Pricing display</Label>
      <Select id={field.id + "-pricing"} value={field.price_display ?? "exact"}
        onChange={(event) => onChange({ price_display: event.target.value as FormField["price_display"] })}>
        <option value="exact">Exact prices</option>
        <option value="from">From prices</option>
        <option value="hidden">Hide prices and total</option>
      </Select>
      {services.map((service, index) => (
        <div key={service.id} className="space-y-3 rounded-panel border bg-muted/30 p-3">
          <div className="flex items-start gap-3">
            <TodoThumbnail value={service.image_url} onChange={(image_url) => update(service.id, { image_url })} />
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor={service.id + "-name"}>Name</Label>
              <Input id={service.id + "-name"} value={service.name} maxLength={80}
                onChange={(event) => update(service.id, { name: event.target.value })} />
              <Label htmlFor={service.id + "-note"}>Note (optional)</Label>
              <Input id={service.id + "-note"} value={service.note ?? ""} maxLength={200}
                onChange={(event) => update(service.id, { note: event.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TodoPrice service={service} onChange={(price) => update(service.id, { price })} />
            <div className="space-y-2">
              <Label htmlFor={service.id + "-quantity"}>Maximum quantity</Label>
              <Input id={service.id + "-quantity"} type="number" min={1} max={20} step={1} value={Number.isFinite(service.max_qty) ? service.max_qty : ""}
                onChange={(event) => update(service.id, { max_qty: event.target.value === "" ? NaN : Number(event.target.value) })} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={index === 0} aria-label={"Move " + service.name + " up"} onClick={() => move(index, -1)}>Up</Button>
            <Button type="button" variant="outline" size="sm" disabled={index === services.length - 1} aria-label={"Move " + service.name + " down"} onClick={() => move(index, 1)}>Down</Button>
            <Button type="button" variant="outline" size="sm" aria-label={"Remove " + service.name} onClick={() => onChange({ services: services.filter((item) => item.id !== service.id) })}>Remove</Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" disabled={services.length >= MAX_SERVICES} onClick={() => onChange({ services: [...services, { id: newFieldId(), name: "Service " + (services.length + 1), max_qty: 1 }] })}>Add service</Button>
    </div>
  );
}

function TodoPrice({ service, onChange }: { service: ServiceItem; onChange: (price: number | undefined) => void }) {
  const [text, setText] = useState(() => service.price === undefined ? "" : toMajorUnitsInput(service.price));
  const invalid = text.trim() !== "" && toMinorUnits(text) === null;
  return (
    <div className="space-y-2">
      <Label htmlFor={service.id + "-price"}>Price in KES (optional)</Label>
      <Input id={service.id + "-price"} type="text" inputMode="decimal" value={text} aria-invalid={invalid}
        onChange={(event) => { setText(event.target.value); onChange(event.target.value.trim() === "" ? undefined : toMinorUnits(event.target.value) ?? NaN); }} />
      {invalid && <p role="alert" className="text-xs text-destructive">Enter a price from 0 to 10,000,000 with at most two decimals.</p>}
    </div>
  );
}

function TodoThumbnail({ value, onChange }: { value?: string; onChange: (url: string | undefined) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  async function upload(file: File) {
    setUploading(true);
    try {
      const response = await fetch("/api/uploads/cover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentType: file.type, contentLength: file.size }) });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "Could not upload image.");
      }
      const { uploadUrl, publicUrl, headers } = await response.json();
      const uploaded = await fetch(uploadUrl, { method: "PUT", headers, body: file });
      if (!uploaded.ok) throw new Error("Could not upload image.");
      onChange(publicUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload image.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  return (
    <div className="shrink-0 space-y-1">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
      <Button type="button" variant="outline" className="size-10 overflow-hidden p-0 transition-opacity duration-(--dur-1) ease-(--ease-out) motion-reduce:transition-none" aria-label={value ? "Replace service image" : "Upload service image"} disabled={uploading} onClick={() => inputRef.current?.click()}>
        {value ? <Image src={value} alt="" width={40} height={40} unoptimized className="size-10 object-cover" /> : uploading ? "..." : "+"}
      </Button>
      {value && <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={() => onChange(undefined)} aria-label="Remove service image">Remove</Button>}
    </div>
  );
}
