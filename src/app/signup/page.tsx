import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Create your account" };

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ll email you a magic link. No password needed.
          </p>
        </div>
        <AuthForm mode="signup" />
      </div>
    </main>
  );
}
