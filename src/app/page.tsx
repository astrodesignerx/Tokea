import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowRight, CalendarCheck, IdCard, Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/marketing/wordmark";
import { TiltCard } from "@/components/marketing/tilt-card";
import { DotField } from "@/components/marketing/dot-field";
import { PRODUCT, TAGLINE } from "@/lib/brand";
import { getCardsOrigin } from "@/lib/cards/links";
import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: `${PRODUCT} - ${TAGLINE}` },
  description:
    "NikoForm gives your organisation shareable pages with QR codes: digital business cards that never go out of date, and event invitations with RSVPs and check-in at the door.",
};

/**
 * Features are described in full to signed-out visitors. Only the call to
 * action changes, from "Open" to "Sign in to set up": hiding what the product
 * does from the people deciding whether to sign up helps nobody. The dashboard
 * routes are behind the auth guard, so nothing is reachable without an account.
 */
const FEATURES = [
  {
    icon: IdCard,
    name: "Digital business cards",
    summary:
      "A page per person, with a QR code that never changes. Update a job title or a phone number and every card already printed keeps working.",
    points: [
      "Saves straight into a phone's contacts",
      "Company logo, colours and tagline applied to every card at once",
      "Works on an NFC tag with no extra setup",
      "Scan counts per card",
    ],
    href: "/dashboard/companies",
  },
  {
    icon: CalendarCheck,
    name: "Event invitations and RSVPs",
    summary:
      "A public page per event, one magic link per guest, and QR check-in at the door. Guests never make an account.",
    points: [
      "Guest list import from a spreadsheet",
      "RSVP tracking with reminders",
      "Scan phones at the door to check people in",
      "Optional paid tickets and deposits",
    ],
    href: "/dashboard",
  },
];

const STEPS = [
  ["Add a company", "Its logo, colours and tagline. Every card underneath inherits them."],
  ["Add the people", "Each one gets a page, a saveable contact and a permanent QR code."],
  ["Share or print", "Send the link, put the QR on a card, or write it to an NFC tag."],
];

export default async function HomePage() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  // A real QR for the site itself, rendered on the card's reverse. Generated
  // here rather than shipped as a fixed asset so it follows the origin.
  const origin = await getCardsOrigin();
  const originHost = origin.replace(/^https?:\/\//, "");
  const qrDataUrl = await QRCode.toDataURL(origin, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#EDEFEE", light: "#00000000" },
  });

  return (
    <div className="landing flex-1">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" aria-label={PRODUCT}>
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2">
            {signedIn ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b">
          <div className="grid-backdrop absolute inset-0" aria-hidden="true" />
          <DotField />

          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 sm:py-28 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="rise nf-eyebrow">Cards, invites and everything after</p>
              <h1
                className="rise mt-5 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
                style={{ animationDelay: "60ms" }}
              >
                Shareable pages.
                <br />
                <span className="text-brand">A QR code on the front.</span>
              </h1>
              <p
                className="rise mt-6 max-w-lg text-base leading-relaxed text-muted-foreground"
                style={{ animationDelay: "120ms" }}
              >
                {PRODUCT} is where your organisation keeps the things it hands
                to people. Right now that means digital business cards and event
                invitations. More is coming.
              </p>

              <div
                className="rise mt-9 flex flex-wrap items-center gap-3"
                style={{ animationDelay: "180ms" }}
              >
                {signedIn ? (
                  <Button asChild size="lg">
                    <Link href="/dashboard">
                      Go to dashboard <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="lg">
                      <Link href="/signup">
                        Start building <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/login">Sign in</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* The card lands last, so the sentence is read before the object. */}
            <div className="rise" style={{ animationDelay: "260ms" }}>
              <TiltCard qrDataUrl={qrDataUrl} qrLabel={originHost} />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <p className="nf-eyebrow">Features</p>
            <h2 className="mt-4 max-w-2xl font-display text-2xl font-medium tracking-tight sm:text-3xl">
              Two of them today. The shape holds for the rest.
            </h2>

            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, name, summary, points, href }) => (
                <div key={name} className="nf-panel nf-panel-interactive flex flex-col p-7">
                  <Icon className="size-5 text-brand" />
                  <h3 className="mt-4 font-display text-lg font-medium">{name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {summary}
                  </p>

                  <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
                    {points.map((point) => (
                      <li key={point} className="flex gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-[0.4rem] size-1 shrink-0 rounded-full bg-brand"
                        />
                        {point}
                      </li>
                    ))}
                  </ul>

                  {/* mt-auto, so both cards' buttons sit on the same line. */}
                  <div className="mt-auto pt-7">
                    <Button asChild variant="outline" size="sm">
                      <Link href={signedIn ? href : "/login"}>
                        {signedIn ? (
                          <>
                            Open <ArrowRight className="size-3.5" />
                          </>
                        ) : (
                          <>
                            <Lock className="size-3.5" /> Sign in to set up
                          </>
                        )}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
              Anyone can read about a feature. Setting one up needs an account.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <p className="nf-eyebrow">How it works</p>
            <ol className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map(([title, body], index) => (
                <li key={title}>
                  <span className="font-mono text-xs text-brand">
                    0{index + 1}
                  </span>
                  <h3 className="mt-3 font-display text-base font-medium">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Close */}
        <section>
          <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:py-24">
            <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
              Start with one feature. Add the rest when you need them.
            </h2>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg">
                <Link href={signedIn ? "/dashboard" : "/signup"}>
                  {signedIn ? "Go to dashboard" : "Start building"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-sm text-muted-foreground">
          <Wordmark className="opacity-70" />
          <span>Nairobi</span>
        </div>
      </footer>
    </div>
  );
}
