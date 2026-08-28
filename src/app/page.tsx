import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, IdCard, Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PRODUCT, TAGLINE } from "@/lib/brand";
import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: `${PRODUCT} - ${TAGLINE}` },
  description:
    "NikoForm gives your organisation shareable pages with QR codes: digital business cards that never go out of date, and event invitations with RSVPs and check-in at the door.",
};

/**
 * Features are described in full to anyone, signed in or not. Setting one up
 * needs an account, so the call to action changes rather than the content:
 * hiding what the product does from the people deciding whether to sign up
 * helps nobody.
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

export default async function HomePage() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <div className="landing flex-1">
      <main>
        <section className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <p className="rise text-sm font-medium text-muted-foreground">
            {PRODUCT}
          </p>
          <h1
            className="rise mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
            style={{ animationDelay: "60ms" }}
          >
            Shareable pages, with a QR code on the front.
          </h1>
          <p
            className="rise mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground"
            style={{ animationDelay: "120ms" }}
          >
            {PRODUCT} is where your organisation keeps the things it hands to
            people. Right now that means digital business cards and event
            invitations. More is coming.
          </p>

          <div
            className="rise mt-10 flex flex-wrap items-center justify-center gap-3"
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
                    Get started <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">I have an account</Link>
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
            <div className="grid gap-8 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, name, summary, points, href }, i) => (
                <div
                  key={name}
                  className="rise flex flex-col rounded-2xl border bg-background p-7 transition-shadow duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-md"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <Icon className="size-5" />
                  <h2 className="mt-4 text-lg font-medium">{name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {summary}
                  </p>

                  <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                    {points.map((point) => (
                      <li key={point} className="flex gap-2.5">
                        <span
                          aria-hidden="true"
                          className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60"
                        />
                        {point}
                      </li>
                    ))}
                  </ul>

                  {/* mt-auto, so both cards' buttons sit on the same line
                      however much their descriptions differ in length. */}
                  <div className="mt-auto pt-7">
                    {signedIn ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={href}>
                          Open <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild variant="outline" size="sm">
                        <Link href="/login">
                          <Lock className="size-3.5" /> Sign in to set up
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-10 text-center text-sm text-muted-foreground">
              Anyone can read about a feature. Setting one up needs an account.
            </p>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto max-w-5xl px-6 py-20 text-center sm:py-24">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Start with one feature. Add the rest when you need them.
            </h2>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg">
                <Link href={signedIn ? "/dashboard" : "/signup"}>
                  {signedIn ? "Go to dashboard" : "Get started"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-muted-foreground">
          {PRODUCT}, Nairobi
        </div>
      </footer>
    </div>
  );
}
