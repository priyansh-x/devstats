import { redirect } from "next/navigation";
import Link from "next/link";
import { SpecCard } from "@/components/spec-card";
import { LoginForm } from "@/components/login-form";
import { ensureDevUser, getCurrentUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const supabaseConfigured = !!createSupabaseServer();

  async function devLoginAction() {
    "use server";
    // Dev-only escape hatch. When Supabase auth is configured (prod), refuse —
    // otherwise this action could be replayed to mint throwaway accounts that
    // bypass GitHub sign-in.
    if (createSupabaseServer()) redirect("/login");
    await ensureDevUser();
    redirect("/dashboard");
  }

  return (
    <main className="max-w-md mx-auto px-4 sm:px-6 py-10 sm:py-16">
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
