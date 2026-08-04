import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with the email you used for Tokea.
          </p>
        </div>
        <AuthForm mode="signin" />
      </div>
    </main>
  );
}
