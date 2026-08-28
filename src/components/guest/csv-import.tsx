"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { importGuestsAction } from "@/lib/actions/guests";
import { toast } from "sonner";

type Props = { eventId: string };

type CsvRow = {
  name?: string;
  email?: string;
  phone?: string;
  Name?: string;
  Email?: string;
  Phone?: string;
  NAME?: string;
  EMAIL?: string;
  PHONE?: string;
};

function pick(row: CsvRow, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k as keyof CsvRow];
    if (v && typeof v === "string") return v;
  }
  return undefined;
}

export function CsvImport({ eventId }: Props) {
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<{ name: string; email: string; phone?: string }[] | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  function handleFile(file: File) {
    setFilename(file.name);
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = res.data
          .map((r) => ({
            name: (pick(r, "name", "Name", "NAME") ?? "").trim(),
            email: (pick(r, "email", "Email", "EMAIL") ?? "").trim(),
            phone: pick(r, "phone", "Phone", "PHONE")?.trim(),
          }))
          .filter((r) => r.name || r.email);
        setPreview(rows);
      },
      error: (err) => {
        toast.error("Could not parse CSV: " + err.message);
      },
    });
  }

  function commit() {
    if (!preview) return;
    startTransition(async () => {
      try {
        const result = await importGuestsAction(eventId, preview);
        toast.success(
          `Added ${result.added}. Skipped ${result.duplicates} duplicates, ${result.invalid} invalid.`,
        );
        setPreview(null);
        setFilename(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="csv">CSV file</Label>
        <p className="text-xs text-muted-foreground">
          Header row required: <code>name,email,phone</code>. Phone is optional.{" "}
          <a
            href="/guest-list-template.csv"
            download
            className="underline underline-offset-2 hover:text-foreground"
          >
            Download a template
          </a>
          .
        </p>
      </div>
      <input
        id="csv"
        type="file"
        accept=".csv,text/csv"
        className="text-sm file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-secondary-foreground hover:file:bg-secondary/80"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      {filename && <p className="text-xs text-muted-foreground">{filename}</p>}
      {preview && (
        <div className="rounded-md border bg-muted/40 p-3 space-y-2">
          <p className="text-sm font-medium">{preview.length} rows parsed</p>
          <ul className="text-xs text-muted-foreground max-h-32 overflow-y-auto space-y-0.5">
            {preview.slice(0, 8).map((r, i) => (
              <li key={i}>
                {r.name} &lt;{r.email}&gt;
                {r.phone ? ` · ${r.phone}` : ""}
              </li>
            ))}
            {preview.length > 8 && <li>…and {preview.length - 8} more</li>}
          </ul>
          <Button type="button" onClick={commit} disabled={pending}>
            {pending ? "Importing…" : `Import ${preview.length} guests`}
          </Button>
        </div>
      )}
    </div>
  );
}
