/**
 * Money handling for Tokea.
 *
 * Amounts are stored and passed around as integers in the currency's minor
 * unit (KES cents), never as floats. 0.1 * 100 is 10.000000000000002, and
 * that class of error is unacceptable anywhere near a price.
 *
 * Organisers think in shillings, so conversion happens once at the form edge:
 * `toMinorUnits` on the way in, `formatMoney` on the way out.
 */

export const PAYMENT_MODES = ["free", "paid"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const DEFAULT_CURRENCY = "KES";

/**
 * Guards against a typo turning into a life-changing ticket price.
 *
 * Kept well under the hard limit: `price_amount` is a Prisma `Int`, which is a
 * Postgres int4 and overflows above 2,147,483,647 minor units, or KES 21,474,836.
 * Anything approaching that needs a BigInt column, not a bigger constant.
 */
const MAX_MINOR_UNITS = 1_000_000_000; // KES 10,000,000.00

/**
 * Parses what an organiser typed into minor units.
 *
 * Deliberately string-based: splitting on the decimal point and padding keeps
 * the conversion exact, where `Math.round(parseFloat(x) * 100)` does not.
 * Returns null when the input is not a usable amount.
 */
export function toMinorUnits(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, "").trim();
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const [whole, fraction = ""] = cleaned.split(".");
  const cents = Number(`${fraction}00`.slice(0, 2));
  const total = Number(whole) * 100 + cents;

  if (!Number.isSafeInteger(total) || total > MAX_MINOR_UNITS) return null;
  return total;
}

/** Minor units back to a plain editable string, e.g. 300050 -> "3000.50". */
export function toMajorUnitsInput(minor: number): string {
  const whole = Math.floor(minor / 100);
  const cents = minor % 100;
  return cents === 0 ? String(whole) : `${whole}.${String(cents).padStart(2, "0")}`;
}

/** Display form, e.g. "KES 3,000.00". */
export function formatMoney(minor: number, currency = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(minor / 100);
}

export type EventPricing = {
  currency: string;
  price: number;
  /** Null when the organiser is not offering a part-payment. */
  deposit: number | null;
  /** What is still owed at the door if only the deposit is paid. */
  balanceAfterDeposit: number | null;
};

/**
 * The single place anything is allowed to decide an event costs money.
 *
 * Amounts survive a switch back to free, so `payment_mode` is checked first,
 * reading `price_amount` directly would charge for a free event.
 */
export function eventPricing(event: {
  payment_mode: string;
  currency: string;
  price_amount: number | null;
  deposit_amount: number | null;
}): EventPricing | null {
  if (event.payment_mode !== "paid") return null;
  if (event.price_amount == null || event.price_amount <= 0) return null;

  const deposit =
    event.deposit_amount != null && event.deposit_amount > 0 && event.deposit_amount < event.price_amount
      ? event.deposit_amount
      : null;

  return {
    currency: event.currency,
    price: event.price_amount,
    deposit,
    balanceAfterDeposit: deposit == null ? null : event.price_amount - deposit,
  };
}
