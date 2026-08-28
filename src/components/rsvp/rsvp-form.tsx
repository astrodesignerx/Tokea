"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, HelpCircle, CreditCard } from "lucide-react";
import { submitRsvpAction } from "@/lib/actions/rsvp";
import { startPaymentAction } from "@/lib/actions/payments";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

type Pricing = {
  currency: string;
  price: number;
  deposit: number | null;
  balanceAfterDeposit: number | null;
};

type Props = {
  token: string;
  guestName: string;
  customQuestion: string | null;
  currentStatus: string | null;
  /** Present only when the organiser made this a paid event. */
  pricing?: Pricing | null;
};

type Status = "yes" | "no" | "maybe";

const OPTIONS: { value: Status; label: string; icon: typeof Check }[] = [
  { value: "yes", label: "I'll be there", icon: Check },
  { value: "maybe", label: "Maybe", icon: HelpCircle },
  { value: "no", label: "Can't make it", icon: X },
];

export function RsvpForm({ token, guestName, customQuestion, currentStatus, pricing }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status | null>((currentStatus as Status) ?? null);
  const [customAnswer, setCustomAnswer] = useState("");
  const [message, setMessage] = useState("");

  // On a paid event attending is bought, not declared, so the only answer left
  // to give here is "no". Everything else goes through checkout.
  const options = pricing ? OPTIONS.filter((o) => o.value === "no") : OPTIONS;

  function pay(kind: "deposit" | "full") {
    startTransition(async () => {
      const result = await startPaymentAction({ token, kind });
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      window.location.href = result.authorizationUrl;
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!status) {
      toast.error("Pick a response");
      return;
    }
    startTransition(async () => {
      try {
        const { redirectTo } = await submitRsvpAction({
          token,
          status,
          customAnswer: customQuestion ? customAnswer : undefined,
          message: message || undefined,
        });
        router.push(redirectTo);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not submit");
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Hi {guestName},</p>
            <Label>Will you join us?</Label>

            {pricing && (
              <div className="grid gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => pay("full")}
                  disabled={pending}
                  className="flex items-center justify-between gap-3 rounded-md border border-foreground bg-foreground text-background px-4 py-3 text-left transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <span className="flex items-center gap-3">
                    <CreditCard className="size-4" />
                    <span className="text-sm font-medium">Pay in full</span>
                  </span>
                  <span className="text-sm font-medium">
                    {formatMoney(pricing.price, pricing.currency)}
                  </span>
                </button>

                {pricing.deposit != null && (
                  <button
                    type="button"
                    onClick={() => pay("deposit")}
                    disabled={pending}
                    className="flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-left transition-colors hover:border-foreground/40 disabled:opacity-50"
                  >
                    <span className="flex flex-col">
                      <span className="text-sm font-medium">Pay a deposit</span>
                      <span className="text-xs text-muted-foreground">
                        {formatMoney(pricing.balanceAfterDeposit ?? 0, pricing.currency)} due at the
                        door
                      </span>
                    </span>
                    <span className="text-sm font-medium">
                      {formatMoney(pricing.deposit, pricing.currency)}
                    </span>
                  </button>
                )}
                <p className="text-xs text-muted-foreground">
                  Pay by card or M-Pesa. Your spot is held once payment goes through.
                </p>
              </div>
            )}

            <div className="grid gap-2">
              {options.map((o) => {
                const Icon = o.icon;
                const selected = status === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setStatus(o.value)}
                    className={`flex items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors ${
                      selected ? "border-foreground bg-accent" : "hover:border-foreground/40"
                    }`}
                  >
                    <Icon className="size-4" />
                    <span className="text-sm font-medium">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {customQuestion && (
            <div className="space-y-2">
              <Label htmlFor="custom">{customQuestion}</Label>
              <Input id="custom" value={customAnswer} onChange={(e) => setCustomAnswer(e.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">A note for the host (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Anything they should know?"
            />
          </div>

          <Button type="submit" className="w-full" disabled={pending || !status}>
            {pending ? "Sending…" : "Send RSVP"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
