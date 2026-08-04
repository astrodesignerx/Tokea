"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertCircle, ScanLine } from "lucide-react";
import { toast } from "sonner";

type CheckResult =
  | { kind: "ok"; guestName: string; firstTime: boolean }
  | { kind: "denied"; reason: string };

type Props = {
  eventId: string;
  initial: { total: number; yes: number; checkedIn: number };
};

type FeedItem = { id: string; result: CheckResult; at: number };

export function CheckinClient({ eventId, initial }: Props) {
  const [counts, setCounts] = useState(initial);
  const [paused, setPaused] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [pending, startTransition] = useTransition();
  const recentTokens = useRef<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/counts`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { total: number; yes: number; checkedIn: number };
          setCounts((prev) => {
            if (prev.checkedIn !== data.checkedIn) {
              return data;
            }
            return prev;
          });
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [eventId]);

  function handleScan(detectedCodes: { rawValue: string }[]) {
    if (paused || pending) return;
    const code = detectedCodes[0]?.rawValue;
    if (!code) return;
    if (recentTokens.current.has(code)) return;
    recentTokens.current.add(code);
    setTimeout(() => recentTokens.current.delete(code), 8000);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/checkin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrToken: code, eventId }),
        });
        const data = await res.json();
        if (!res.ok) {
          const result: CheckResult = { kind: "denied", reason: data?.error ?? "Unknown error" };
          setFeed((f) => [{ id: crypto.randomUUID(), result, at: Date.now() }, ...f].slice(0, 20));
          setPaused(true);
          toast.error(result.reason);
          setTimeout(() => setPaused(false), 2000);
          return;
        }
        const result: CheckResult = {
          kind: "ok",
          guestName: data.guestName as string,
          firstTime: data.alreadyCheckedIn === false,
        };
        setFeed((f) => [{ id: crypto.randomUUID(), result, at: Date.now() }, ...f].slice(0, 20));
        if (result.firstTime) {
          setCounts((c) => ({ ...c, checkedIn: c.checkedIn + 1 }));
          toast.success(`Checked in ${result.guestName}`);
        } else {
          toast.message(`${result.guestName} was already checked in`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Network error");
      }
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="aspect-square w-full overflow-hidden rounded-md bg-black">
            <Scanner
              onScan={handleScan}
              paused={paused}
              formats={["qr_code"]}
              constraints={{ facingMode: "environment" }}
              styles={{ container: { width: "100%", height: "100%" }, video: { objectFit: "cover" } }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            <ScanLine className="inline size-3" /> Point the camera at a guest&apos;s QR code.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <CountTile label="Checked in" value={counts.checkedIn} highlight />
          <CountTile label="Confirmed" value={counts.yes} />
          <CountTile label="Total" value={counts.total} />
        </div>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground px-1 pb-2">Recent</p>
            {feed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No scans yet.</p>
            ) : (
              <ul className="space-y-1.5 max-h-96 overflow-y-auto">
                {feed.map((item) => (
                  <li
                    key={item.id}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                      item.result.kind === "ok" ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    {item.result.kind === "ok" ? (
                      item.result.firstTime ? (
                        <Check className="size-4 text-green-700" />
                      ) : (
                        <AlertCircle className="size-4 text-amber-700" />
                      )
                    ) : (
                      <X className="size-4 text-red-700" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {item.result.kind === "ok" ? item.result.guestName : "Not recognized"}
                      </div>
                      {item.result.kind === "denied" && (
                        <div className="text-xs text-red-700 truncate">{item.result.reason}</div>
                      )}
                    </div>
                    <Badge variant={item.result.kind === "ok" ? "success" : "destructive"}>
                      {item.result.kind === "ok" ? (item.result.firstTime ? "in" : "dup") : "denied"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CountTile({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-md p-3 ${
        highlight ? "bg-green-100 text-green-900" : "bg-muted text-foreground"
      }`}
    >
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}
