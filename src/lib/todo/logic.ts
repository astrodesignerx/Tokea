export const LIST_STATUSES = ["draft", "open", "closed", "archived"] as const;
export const REQUEST_STATUSES = ["new", "contacted", "booked", "done", "archived"] as const;
export const MAX_TOTAL = 2_147_483_647;

export function tallyRequestItems(items: {
  request_id: string;
  item_id: string | null;
  name: string;
  quantity: number;
  item: { name: string } | null;
}[]) {
  const groups = new Map<string, { key: string; name: string; requests: Set<string>; quantity: number; hasQuantity: boolean }>();
  for (const item of items) {
    const key = item.item_id === null ? `name:${item.name}` : `item:${item.item_id}`;
    const group = groups.get(key) ?? { key, name: item.item?.name ?? item.name, requests: new Set<string>(), quantity: 0, hasQuantity: false };
    group.requests.add(item.request_id);
    group.quantity += item.quantity;
    group.hasQuantity ||= item.quantity > 1;
    groups.set(key, group);
  }
  return Array.from(groups.values(), (group) => ({ ...group, requests: group.requests.size }))
    .sort((a, b) => b.requests - a.requests || a.name.localeCompare(b.name, "en-GB"));
}

export function clampQuantity(quantity: number, perUnit: boolean, maximum: number): number {
  if (!perUnit) return 1;
  const safeMax = Number.isFinite(maximum) ? Math.max(1, Math.floor(maximum)) : 1;
  const safeQuantity = Number.isFinite(quantity) ? Math.floor(quantity) : 1;
  return Math.max(1, Math.min(safeMax, safeQuantity));
}

export function calculateEstimate(
  items: { price: number | null; quantity: number }[],
  showPrices: boolean,
): number | null {
  if (!showPrices || !items.length) return null;
  const total = items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
  if (!Number.isSafeInteger(total) || total < 0 || total > MAX_TOTAL) {
    throw new Error("This estimate is too large. Please contact the business directly.");
  }
  return total;
}

/** Kenyan local numbers and international numbers, with common punctuation. */
export function normalisePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!/^[+\d\s().-]+$/.test(trimmed)) return null;
  let phone = trimmed.replace(/[\s().-]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (/^0[1-9]\d{8}$/.test(phone)) phone = `+254${phone.slice(1)}`;
  if (/^254[17]\d{8}$/.test(phone)) phone = `+${phone}`;
  return /^\+?[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

export function validEventDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
