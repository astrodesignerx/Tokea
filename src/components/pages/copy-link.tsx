"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyPageLink({ url, compact = false }: { url: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return <div className="shrink-0">
    <Button type="button" size={compact ? "icon" : "default"} variant="outline" aria-label={copied ? "Link copied" : "Copy link"} onClick={async () => {
      try {
        await navigator.clipboard.writeText(url);
        setError(false);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch { setError(true); }
    }}>
      <span className="pages-enter" key={String(copied)}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />}</span>
      {!compact && (copied ? "Copied" : "Copy")}
    </Button>
    {error && <span role="alert" className="block max-w-32 text-xs text-destructive">Select and copy the link.</span>}
  </div>;
}
