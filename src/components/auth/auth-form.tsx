"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

  const providerId = mode === "signin" ? "resend" : "resend";
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";

  function onEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    startTransition(async () => {
      const result = await signIn(providerId, { email, redirect: false });
      if (result?.error) {
        toast.error("Could not send link. Check the email provider configuration.");
      } else {
        setSent(true);
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
            We sent a link to <strong>{email}</strong>. It expires in 10 minutes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSent(false)}
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
