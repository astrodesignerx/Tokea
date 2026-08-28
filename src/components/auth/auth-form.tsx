"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { signInLinkExpiryLabel } from "@/lib/sign-in-link";
import { toast } from "sonner";

type Mode = "signin" | "signup";

const COPY: Record<
  Mode,
  {
    heading: string;
    sub: string;
    emailCta: string;
    emailPending: string;
    sentTitle: string;
    altPrompt: string;
    altCta: string;
    altHref: string;
  }
> = {
  signin: {
    heading: "Welcome back",
    sub: "Sign in with the email you used for Tokea.",
    emailCta: "Send sign-in link",
    emailPending: "Sending…",
    sentTitle: "Check your inbox",
    altPrompt: "New to Tokea?",
    altCta: "Create an account",
    altHref: "/signup",
  },
  signup: {
    heading: "Create your account",
    sub: "We'll email you a magic link. No password needed.",
    emailCta: "Create account",
    emailPending: "Creating…",
    sentTitle: "Check your inbox to confirm",
    altPrompt: "Already have an account?",
    altCta: "Sign in",
    altHref: "/login",
  },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";

  function onEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    startTransition(async () => {
      const result = await signIn("resend", { email, redirect: false });
      if (result?.error) {
        toast.error("We couldn't send your sign-in link. Please try again in a moment.");
        return;
      }
      setSent(true);

      // In development, email delivery is optional. If it failed, the server
      // parked the link for us rather than leaving it only in the terminal.
      if (process.env.NODE_ENV !== "production") {
        try {
          const res = await fetch(`/api/dev/sign-in-link?email=${encodeURIComponent(email)}`);
          if (res.ok) setDevLink(((await res.json()) as { url: string | null }).url);
        } catch {
          // Nothing to show; the terminal still has it.
        }
      }
    });
  }

  function onGoogle() {
    startTransition(async () => {
      await signIn("google", { redirectTo: "/dashboard" });
    });
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border bg-card p-4 text-sm space-y-1">
          <p className="font-medium">{copy.sentTitle}</p>
          <p className="text-muted-foreground">
            We sent a link to <strong>{email}</strong>. It expires in {signInLinkExpiryLabel()}.
          </p>
        </div>

        {devLink && (
          <div className="rounded-md border border-dashed border-amber-500/60 bg-amber-500/5 p-4 text-sm space-y-2">
            <p className="font-medium text-amber-700 dark:text-amber-500">
              Development only — the email could not be sent
            </p>
            <p className="text-muted-foreground text-xs">
              Your email provider rejected the message, so the link is shown here instead. This
              never appears in production.
            </p>
            <a
              href={devLink}
              className="block break-all font-mono text-xs underline underline-offset-2 hover:text-foreground"
            >
              {devLink}
            </a>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setSent(false);
            setDevLink(null);
          }}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {googleEnabled && (
        <>
          <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={pending}>
            Continue with Google
          </Button>
          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>
        </>
      )}
      <form onSubmit={onEmailSubmit} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? copy.emailPending : copy.emailCta}
        </Button>
      </form>
      <p className="text-sm text-center text-muted-foreground">
        {copy.altPrompt}{" "}
        <Link href={copy.altHref} className="text-foreground font-medium hover:underline">
          {copy.altCta}
        </Link>
      </p>
    </div>
  );
}
