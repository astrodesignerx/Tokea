"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";

export function TodoShare({ url, slug }: { url: string; slug: string }) {
  const [qr, setQr] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 1000, margin: 4, errorCorrectionLevel: "M" })
      .then((data) => { if (active) setQr(data); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [url]);
  return <div className="nf-panel mt-6 flex flex-wrap items-center gap-5 p-4">
    {qr && <Image src={qr} alt="QR code for this service list" width={100} height={100} unoptimized className="rounded-md" />}
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium">Share your list</p>
      <div className="mt-1 flex min-w-0 items-center gap-1"><span className="min-w-0 truncate font-mono text-xs">{url}</span><CopyButton value={url} /></div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline"><a href={url} target="_blank" rel="noreferrer">View live page</a></Button>
        {qr && <Button asChild size="sm" variant="outline"><a href={qr} download={`${slug}-qr.png`}>Download QR code</a></Button>}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">The link stays fixed. Open the list before sharing it with clients.</p>
      {failed && <p role="alert" className="mt-2 text-xs text-destructive">Could not create the QR code. Reload to try again.</p>}
    </div>
  </div>;
}
