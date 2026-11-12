import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

const adapter = PrismaAdapter(prisma);

/*
  Auth.js deletes the old session when someone signs in again. If that row is
  already gone (expired and cleaned up, or two tabs racing), Prisma throws
  "record not found" and Auth.js shows its "Server error" page. A session that
  is already deleted is the result we wanted, so ignore that one error.
*/
const deleteSession = adapter.deleteSession!;
adapter.deleteSession = async (sessionToken): Promise<void> => {
  try {
    await deleteSession(sessionToken);
  } catch (e) {
    // P2025 is Prisma's "record not found" code.
    if ((e as { code?: unknown })?.code === "P2025") {
      return;
    }
    throw e;
  }
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter,
  session: { strategy: "database" },
});
