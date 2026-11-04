export const DOCUMENT_TYPES = ["quote", "invoice", "receipt"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export const STORED_STATUSES = {
  quote: ["draft", "sent", "accepted", "declined", "void"],
  invoice: ["draft", "sent", "part_paid", "paid", "void"],
  receipt: ["issued"],
} as const;

// Payment-derived states deliberately have no manual transition.
export const TRANSITIONS: Record<DocumentType, Record<string, readonly string[]>> = {
  quote: { draft: ["sent", "void"], sent: ["accepted", "declined", "void"] },
  invoice: { draft: ["sent"], sent: ["void"] },
  receipt: {},
};

export function canTransition(type: string, from: string, to: string): boolean {
  return DOCUMENT_TYPES.includes(type as DocumentType) &&
    (TRANSITIONS[type as DocumentType][from]?.includes(to) ?? false);
}

export function canEditDocument(doc: { type: string; status: string }) {
  return (doc.type === "quote" || doc.type === "invoice") && ["draft", "sent"].includes(doc.status);
}

export function dateKey(date: Date | string): string {
  return typeof date === "string" ? date.slice(0, 10) : date.toISOString().slice(0, 10);
}

export function displayStatus(doc: {
  type: string; status: string; due_date?: Date | string | null;
  valid_until?: Date | string | null; total: number; amount_paid: number;
}, today: Date | string): string {
  if (doc.type === "invoice" && !["draft", "void"].includes(doc.status) &&
      doc.total > doc.amount_paid && doc.due_date && dateKey(doc.due_date) < dateKey(today)) return "overdue";
  if (doc.type === "quote" && doc.status === "sent" && doc.valid_until &&
      dateKey(doc.valid_until) < dateKey(today)) return "expired";
  return doc.status;
}

export function statusLabel(status: string) {
  return status === "part_paid" ? "Part paid" : status.charAt(0).toUpperCase() + status.slice(1);
}

// Billing dates follow Kenyan time, so a document made just after midnight in
// Nairobi gets that day's date rather than the previous UTC day.
export function billingToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
