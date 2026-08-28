"use server";

import { z } from "zod";
import { PAYMENT_KINDS, startPayment } from "@/lib/payments";

const schema = z.object({
  token: z.string().min(1),
  // The browser chooses which option, never the amount.
  kind: z.enum(PAYMENT_KINDS),
});

export async function startPaymentAction(input: z.infer<typeof schema>) {
  const parsed = schema.parse(input);
  return startPayment(parsed);
}
