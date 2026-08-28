"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertCircle, ScanLine, Wallet } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

type CheckResult =
  | {
      kind: "ok";
      guestName: string;
      firstTime: boolean;
      /** Minor units still owed at the door. 0 when nothing is outstanding. */
      balanceDue: number;
      currency: string | null;
    }
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
          balanceDue: typeof data.balanceDue === "number" ? data.balanceDue : 0,
          currency: (data.currency as string | null) ?? null,
        };
        setFeed((f) => [{ id: crypto.randomUUID(), result, at: Date.now() }, ...f].slice(0, 20));

        const owed =
          result.balanceDue > 0 && result.currency
            ? ` — collect ${formatMoney(result.balanceDue, result.currency)}`
            : "";

        if (result.firstTime) {
          setCounts((c) => ({ ...c, checkedIn: c.checkedIn + 1 }));
          if (owed) toast.warning(`${result.guestName}${owed}`);
          else toast.success(`Checked in ${result.guestName}`);
        } else {
          toast.message(`${result.guestName} was already checked in${owed}`);
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
        {feed[0] && <LastScan key={feed[0].id} item={feed[0]} />}
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
                      {item.result.kind === "ok" &&
                        item.result.balanceDue > 0 &&
                        item.result.currency && (
                          <div className="text-xs text-amber-800 truncate">
                            Collect {formatMoney(item.result.balanceDue, item.result.currency)}
                          </div>
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

/**
 * The most recent scan, sized for someone standing at a door.
 *
 * Whoever is scanning is looking at a phone at arm's length with a queue
 * behind them, so the amount to collect is the largest thing here — reading it
 * off a toast or a list row is too easy to miss.
 */
function LastScan({ item }: { item: FeedItem }) {
  if (item.result.kind === "denied") {
    return (
      <div className="scan-result rounded-md bg-red-600 text-white px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <X className="size-4" /> Denied
        </div>
        <p className="text-sm text-red-50 mt-0.5">{item.result.reason}</p>
      </div>
    );
  }

  const { guestName, firstTime, balanceDue, currency } = item.result;
  const owes = balanceDue > 0 && currency;

  if (owes) {
    return (
      <div className="scan-result rounded-md bg-amber-500 text-amber-950 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{guestName}</div>
            <div className="text-xs opacity-80">
              {firstTime ? "Checked in" : "Already checked in"}
            </div>
          </div>
          <Wallet className="size-5 shrink-0" />
        </div>
        <div className="mt-2 pt-2 border-t border-amber-950/20">
          <div className="text-xs uppercase tracking-wide opacity-80">Collect at the door</div>
          <div className="text-3xl font-semibold tabular-nums leading-tight">
            {formatMoney(balanceDue, currency)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scan-result rounded-md bg-green-600 text-white px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{guestName}</div>
        <div className="text-xs text-green-50">
          {firstTime ? "Checked in · nothing to collect" : "Already checked in"}
        </div>
      </div>
      <Check className="size-5 shrink-0" />
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
