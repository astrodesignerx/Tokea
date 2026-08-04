"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { sendAllInvitesAction } from "@/lib/actions/guests";
import { toast } from "sonner";
import { Send } from "lucide-react";

type Props = { eventId: string; unsent: number };

export function SendInvitesButton({ eventId, unsent }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<{ sent: number; failed: number; total: number } | null>(null);

  if (unsent === 0 && !done) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            try {
              const result = await sendAllInvitesAction(eventId);
              setDone(result);
              toast.success(
                result.failed > 0
                  ? `Sent ${result.sent}, ${result.failed} failed (check email config)`
                  : `Sent ${result.sent} invite${result.sent === 1 ? "" : "s"}`,
              );
              router.refresh();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not send");
            }
          });
        }}
      >
        <Send className="size-4" /> {pending ? "Sending…" : `Send ${unsent} invite${unsent === 1 ? "" : "s"}`}
      </Button>
    </div>
  );
}
