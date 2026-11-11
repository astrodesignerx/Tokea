import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import {
  ArrowRight, BarChart3, CalendarCheck, Check, ClipboardList,
  FileText, IdCard, ListChecks, ListTodo, Lock, QrCode,
} from "lucide-react";
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
    "NikoForm gives your organisation short links and QR codes for business cards, events, forms, files and service lists, with every reply in one dashboard.",
};

const SERVICE_GROUPS = [
  {
    label: "Hand out",
    services: [
      {
        icon: IdCard,
        name: "Digital business cards",
        summary: "A page per person with a QR code that never changes. Update a title or phone number and every printed card keeps working.",
        points: [
          "Saves straight into phone contacts",
          "Company logo and colours on every card",
          "Works on NFC tags",
        ],
        href: "/dashboard/companies",
      },
      {
        icon: QrCode,
        name: "Dynamic QR codes",
        summary: "Print a code once and change where it points whenever you like.",
        points: [
          "Swap the link without reprinting",
          "Scan counts for each code",
          "Download for print in high resolution",
        ],
        href: "/dashboard/qr",
      },
      {
        icon: CalendarCheck,
        name: "Events and RSVPs",
        summary: "A public page per event, one magic link per guest, and QR check-in at the door.",
        points: [
          "Import the guest list from a spreadsheet",
          "RSVP tracking with reminders",
          "Optional paid tickets and deposits",
        ],
        href: "/dashboard/events",
      },
      {
        icon: FileText,
        name: "Pages",
        summary: "Upload a PDF, HTML, images, video or an Office file and share it full screen on a permanent link and QR code.",
        points: [
          "PDFs and video open right in the browser",
          "Replace the file, keep the link",
          "Hidden from search engines",
        ],
        href: "/dashboard/pages",
      },
    ],
  },
  {
    label: "Collect",
    services: [
      {
        icon: ClipboardList,
        name: "Forms",
        summary: "Build a form, publish it on its own link, and read the answers as a table, a chart or a spreadsheet.",
        points: ["Export answers to a spreadsheet"],
        href: "/dashboard/forms",
      },
      {
        icon: ListTodo,
        name: "To-do lists",
        summary: "Share a list of your services. Clients tick what they need and send it straight to you.",
        points: [
          "List or visual layout",
          "Prices optional",
          "Requests arrive in your inbox",
        ],
        href: "/dashboard/todo",
      },
      {
        icon: ListChecks,
        name: "Checklists",
        summary: "Personal to-do lists or shared team lists, with owners and due dates.",
        points: [
          "Repeating lists and sub-tasks",
          "Event prep lists",
          "Morning email of what is due",
        ],
        href: "/dashboard/checklists",
      },
      {
        icon: BarChart3,
        name: "Analytics",
        summary: "Every scan of every card and code in one place.",
        points: [
          "Which links get used",
          "Where the activity comes from",
          "Scan counts over time",
        ],
        href: "/dashboard/analytics",
      },
    ],
  },
];

const STEPS = [
  ["Make it", "Pick a tool, add your details and your brand. Ready in a few minutes."],
  ["Share it", "Send the link, print the QR code, or put it on an NFC tag."],
  ["See what comes back", "Scans, RSVPs, answers, views and requests arrive in your dashboard."],
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
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
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

          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 py-20 sm:py-28 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="rise nf-eyebrow">Made in Nairobi</p>
              <h1
                className="rise mt-5 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
                style={{ animationDelay: "60ms" }}
              >
                Hand it out.
                <br />
                <span className="text-brand">See what comes back.</span>
              </h1>
              <p
                className="rise mt-6 max-w-lg text-base leading-relaxed text-muted-foreground"
                style={{ animationDelay: "120ms" }}
              >
                {PRODUCT} puts the things your organisation hands to people on
                short links and QR codes: business cards, event invitations,
                forms, files and service lists. When people scan, reply, RSVP or
                pick what they need, it lands in one dashboard.
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
              <ul
                className="rise mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"
                style={{ animationDelay: "220ms" }}
              >
                {["Printed codes never break", "Guests never need an account", "Works on any phone"].map((check) => (
                  <li key={check} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-brand" aria-hidden="true" />
                    {check}
                  </li>
                ))}
              </ul>
            </div>

            {/* The card lands last, so the sentence is read before the object. */}
            <div className="rise" style={{ animationDelay: "260ms" }}>
              <TiltCard qrDataUrl={qrDataUrl} qrLabel={originHost} />
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="border-b">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="reveal">
              <p className="nf-eyebrow">What&apos;s inside</p>
              <h2 className="mt-4 max-w-2xl font-display text-2xl font-medium tracking-tight sm:text-3xl">
                Seven tools. One account.
              </h2>
              <p className="mt-3 text-muted-foreground">Use one, or all of them.</p>
            </div>

            <div className="mt-12 space-y-10">
              {SERVICE_GROUPS.map(({ label, services }) => (
                <div key={label}>
                  <h3 className="nf-eyebrow">{label}</h3>
                  <div className="service-grid mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {services.map(({ icon: Icon, name, summary, points, href }) => (
                      <div key={name} className="reveal flex">
                        <div className="service-card nf-panel nf-panel-interactive flex w-full flex-col p-6">
                        <Icon className="size-5 shrink-0 text-brand" aria-hidden="true" />
                        <h4 className="mt-4 font-display text-lg font-medium">{name}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{summary}</p>
                        <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
                          {points.map((point) => (
                            <li key={point} className="flex gap-3">
                              <span aria-hidden="true" className="mt-[0.4rem] size-1 shrink-0 rounded-full bg-brand" />
                              {point}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-auto pt-7">
                          <Button asChild variant="outline" size="sm">
                            <Link href={signedIn ? href : "/login"}>
                              {signedIn ? (
                                <>Open <ArrowRight className="service-arrow size-3.5" /></>
                              ) : (
                                <><Lock className="size-3.5" /> Sign in to set up</>
                              )}
                            </Link>
                          </Button>
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-24">
            <div className="reveal"><h2 className="nf-eyebrow">How it works</h2></div>
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
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 text-center sm:py-24">
            <h2 className="reveal font-display text-2xl font-medium tracking-tight sm:text-3xl">
              Start with one tool. Add the rest when you need them.
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-8 text-sm text-muted-foreground">
          <Wordmark className="opacity-70" />
          <div className="flex items-center gap-5">
            <Link href={signedIn ? "/dashboard" : "/login"} className="hover:underline">
              {signedIn ? "Dashboard" : "Sign in"}
            </Link>
            <span>Nairobi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
