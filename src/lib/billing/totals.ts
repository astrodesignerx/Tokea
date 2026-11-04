export const VAT_MODES = ["none", "exclusive", "inclusive"] as const;
export type VatMode = (typeof VAT_MODES)[number];
export const MAX_AMOUNT = 2_147_483_647;

function integer(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_AMOUNT) {
    throw new RangeError(`${name} must be a non-negative database integer.`);
  }
  return BigInt(value);
}

function cents(value: bigint): number {
  if (value > BigInt(MAX_AMOUNT)) throw new RangeError("The document exceeds the supported amount.");
  return Number(value);
}

// All operands are non-negative. The remainder rounds half up, never to even.
function roundHalfUp(n: bigint, d: bigint) {
  return (n + d / BigInt(2)) / d;
}

export function lineTotal(quantityMilli: number, unitPrice: number): number {
  return cents(roundHalfUp(integer(quantityMilli, "Quantity") * integer(unitPrice, "Price"), BigInt(1000)));
}

export function documentTotals(
  items: readonly { quantity_milli: number; unit_price: number }[],
  vatMode: VatMode,
  vatRateBp: number,
) {
  const sum = items.reduce((s, item) => s + BigInt(lineTotal(item.quantity_milli, item.unit_price)), BigInt(0));
  const rate = integer(vatRateBp, "VAT rate");
  const base = BigInt(10_000);
  if (!VAT_MODES.includes(vatMode)) throw new RangeError("Choose a VAT mode.");
  if (vatMode === "inclusive") {
    const vat = roundHalfUp(sum * rate, base + rate);
    return { subtotal: cents(sum - vat), vatAmount: cents(vat), total: cents(sum) };
  }
  const vat = vatMode === "exclusive" ? roundHalfUp(sum * rate, base) : BigInt(0);
  return { subtotal: cents(sum), vatAmount: cents(vat), total: cents(sum + vat) };
}
