import { redirect } from "next/navigation";
import Link from "next/link";
import { SpecCard } from "@/components/spec-card";
import { LoginForm } from "@/components/login-form";
import { ensureDevUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

export default function LoginPage() {
  const supabaseConfigured = !!createSupabaseServer();

  async function devLoginAction() {
    "use server";
    await ensureDevUser();
    redirect("/dashboard");
  }

  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <Link href="/" className="block text-sm text-ink/60 mb-6 hover:text-ink">← Back home</Link>
      <SpecCard label="Sign in" variant="bone">
        {supabaseConfigured ? (
          <LoginForm />
        ) : (
          <form action={devLoginAction} className="space-y-4">
            <p className="text-sm leading-relaxed">
              Supabase keys not yet configured. Spin up a local operator to
              click through the dashboard:
            </p>
            <button
              type="submit"
              className="w-full bg-ink text-bone font-bold py-3 border border-ink hover:bg-hazard hover:text-ink transition-colors"
            >
              Create dev operator →
            </button>
          </form>
        )}
      </SpecCard>
    </main>
  );
}
