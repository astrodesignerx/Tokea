"use client";

import { ChevronDown } from "lucide-react";

/**
 * One folding row of the QR form. The header always shows a short summary of
 * the current setting, so a closed section never hides what a code does.
 *
 * The body stays mounted while closed (made inert rather than removed), so its
 * inputs are still submitted with the form. Motion lives in globals.css under
 * .qr-section.
 */
export function FormSection({
  id,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  summary: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const bodyId = `qr-section-${id}`;

  return (
    <div className="qr-section" data-open={open}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-200 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
        >
          <span className="shrink-0 text-sm font-medium">{title}</span>
          <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{summary}</span>
            <ChevronDown className="qr-section-chevron size-4 shrink-0" aria-hidden="true" />
          </span>
        </button>
      </h3>
      <div id={bodyId} className="qr-section-body" inert={!open}>
        <div className="qr-section-inner">
          <div className="space-y-3 px-4 pb-4 pt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
