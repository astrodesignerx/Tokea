import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { sendEmail } from "@/lib/email";
import { magicLinkEmail } from "@/lib/emails";
import { rememberDevSignInLink } from "@/lib/dev-sign-in-links";
import { SIGN_IN_LINK_MAX_AGE_SECONDS } from "@/lib/sign-in-link";

const EMAIL_FROM = process.env.EMAIL_FROM ?? "NikoForm <hello@nikoform.co.ke>";
const isProduction = process.env.NODE_ENV === "production";

const providers: NextAuthConfig["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

providers.push(
  Resend({
    // The provider only needs a key to satisfy its own config check; delivery
    // goes through sendEmail() so magic links use the same branded template
    // and transport as every other Tokea email.
    apiKey: process.env.RESEND_API_KEY ?? "re_dev_placeholder",
    from: EMAIL_FROM,
    maxAge: SIGN_IN_LINK_MAX_AGE_SECONDS,
    async sendVerificationRequest({ identifier, url }) {
      const tpl = magicLinkEmail({ url });
      const result = await sendEmail({
        to: identifier,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
      if (result.ok) return;

      // In production a failed send must surface as an error, otherwise the UI
      // would tell the user to check an inbox that will never receive anything.
      if (isProduction) {
        throw new Error(`Could not send sign-in email (${result.reason})`);
      }

      // Local dev: email delivery is optional. Print the link, and hand it to
      // the dev-only store so the sign-in page can offer it directly instead of
      // sending the developer digging through terminal output.
      console.warn(
        `\n[auth] Email delivery failed (${result.reason}).\n[auth] Dev sign-in link for ${identifier}:\n${url}\n`,
      );
      rememberDevSignInLink(identifier, url);
    },
  }),
);

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  providers,
  trustHost: true,
};
