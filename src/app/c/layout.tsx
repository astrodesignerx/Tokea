import { Jost, Source_Serif_4 } from "next/font/google";
import "./cards.css";

/* Jost stands in for the Futura-style geometric sans on the printed card. */
const jost = Jost({
  subsets: ["latin"],
  variable: "--font-card-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-card-serif",
  display: "swap",
});

/**
 * Public card pages sit outside the app's chrome entirely: no nav, no theme
 * toggle, no dark mode. They are client-branded surfaces that happen to be
 * served by this app, so they get their own fonts and their own palette.
 */
export default function CardsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`cards-surface ${jost.variable} ${sourceSerif.variable}`}
      style={{ fontFamily: "var(--font-card-sans), ui-sans-serif, system-ui, sans-serif" }}
    >
      {children}
    </div>
  );
}
