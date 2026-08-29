/**
 * Verifies the Paystack setup and the parts of settlement that can be proven
 * without taking real money.
 *
 *   pnpm check:paystack
 *
 * The webhook is the only path that confirms an M-Pesa charge, so its
 * signature check and its idempotency are worth testing on every change.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });

import { createHmac } from "node:crypto";

const pass = (m: string) => console.log(`  PASS  ${m}`);
const fail = (m: string) => {
  console.log(`  FAIL  ${m}`);
  failures += 1;
};
const warn = (m: string) => console.log(`  WARN  ${m}`);

let failures = 0;

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3012";
const SECRET = process.env["PAYSTACK_SECRET_KEY"] ?? "";

function sign(body: string, secret: string) {
  return createHmac("sha512", secret).update(body, "utf8").digest("hex");
}

async function postWebhook(body: string, signature: string | null) {
  return fetch(`${BASE}/api/webhooks/paystack`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(signature ? { "x-paystack-signature": signature } : {}),
    },
    body,
  });
}

async function main() {
  console.log("Checking Paystack setup...\n");

  console.log("1. Configuration");
  if (!SECRET) {
    warn("PAYSTACK_SECRET_KEY is not set, so live API checks are skipped.");
    warn("The webhook checks below still run and still prove signature handling.");
  } else if (!SECRET.startsWith("sk_")) {
    fail("PAYSTACK_SECRET_KEY does not look like a secret key (expected sk_test_ or sk_live_).");
  } else {
    pass(`Secret key present (${SECRET.startsWith("sk_live_") ? "LIVE" : "test"} mode)`);
    if (SECRET.startsWith("sk_live_")) {
      warn("This is a LIVE key. Real money will move.");
    }
  }

  if (SECRET) {
    console.log("\n2. Paystack reachable");
    const res = await fetch("https://api.paystack.co/bank?currency=KES&perPage=1", {
      headers: { Authorization: `Bearer ${SECRET}` },
    }).catch(() => null);
    if (!res) fail("Could not reach api.paystack.co");
    else if (res.status === 401) fail("Paystack rejected the key (401)");
    else if (!res.ok) fail(`Paystack returned HTTP ${res.status}`);
    else pass("Key accepted, KES supported on this account");
  }

  console.log("\n3. Webhook signature");
  const body = JSON.stringify({
    event: "charge.success",
    data: { reference: "tokea-does-not-exist", amount: 300000, currency: "KES" },
  });

  const unsigned = await postWebhook(body, null).catch(() => null);
  if (!unsigned) {
    fail(`Could not reach ${BASE}/api/webhooks/paystack. Is the dev server running?`);
    console.log("\nStopping: the webhook checks need the app running.");
    process.exitCode = 1;
    return;
  }
  if (unsigned.status === 401) pass("Unsigned request rejected");
  else fail(`Unsigned request returned ${unsigned.status}, expected 401`);

  const wrong = await postWebhook(body, sign(body, "not-the-secret-key"));
  if (wrong.status === 401) pass("Wrongly signed request rejected");
  else fail(`Wrongly signed request returned ${wrong.status}, expected 401`);

  if (SECRET) {
    const good = await postWebhook(body, sign(body, SECRET));
    if (good.status === 401) {
      fail("Correctly signed request was rejected, so the signature logic is broken");
    } else {
      pass(`Correctly signed request accepted (HTTP ${good.status})`);
    }

    const tampered = await postWebhook(`${body} `, sign(body, SECRET));
    if (tampered.status === 401) pass("Tampered body rejected");
    else fail(`Tampered body returned ${tampered.status}, expected 401`);
  } else {
    warn("Skipped positive signature check, which needs the real secret.");
  }

  console.log(
    failures === 0
      ? "\nAll checks passed.\n"
      : `\n${failures} check(s) failed.\n`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error("\nCheck crashed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
