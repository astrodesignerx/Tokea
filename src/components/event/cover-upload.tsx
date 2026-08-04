"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import Image from "next/image";

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
};

export function CoverUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const presignRes = await fetch("/api/uploads/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, contentLength: file.size }),
      });
      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Could not get upload URL");
      }
      const { uploadUrl, publicUrl, headers } = await presignRes.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers,
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status})`);
      }
      onChange(publicUrl);
      toast.success("Cover image uploaded");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {value ? (
        <div className="relative w-full h-48 rounded-md overflow-hidden border bg-muted">
          <Image src={value} alt="Cover" fill className="object-cover" unoptimized />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={() => onChange(null)}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-4" /> {uploading ? "Uploading…" : "Upload image"}
          </Button>
          <span className="text-xs text-muted-foreground">JPEG, PNG, WebP, or AVIF. Up to 8MB.</span>
        </div>
      )}
    </div>
  );
}
