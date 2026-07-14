import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { Sparkles, ShieldCheck, Zap } from "lucide-react";

export default async function LoginPage() {
  const session = await auth().catch(() => null);
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      {/* Left: brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[var(--sidebar)] p-12 text-white lg:flex">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div
          className="absolute -left-24 -top-24 h-96 w-96 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.45), transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-32 right-0 h-96 w-96 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)",
          }}
        />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center text-2xl">
            <span aria-hidden="true">💡</span>
          </div>
          <span className="text-xl font-semibold tracking-tight">
            Regalia Vows
          </span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Run your entire customer operation from one place.
          </h2>
          <p className="mt-3 text-[var(--sidebar-foreground)]">
            Manage customers, build quotations, and let AI handle the
            follow-ups — so your team can focus on closing.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { icon: Sparkles, text: "AI-drafted emails & smart follow-ups" },
              { icon: Zap, text: "Quotations to invoices in seconds" },
              { icon: ShieldCheck, text: "Role-based access for your whole team" },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.text} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                    <Icon className="h-[18px] w-[18px] text-indigo-300" />
                  </span>
                  <span className="text-sm text-[var(--sidebar-foreground)]">
                    {f.text}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative text-xs text-[var(--sidebar-muted)]">
          © {new Date().getFullYear()} Regalia. All rights reserved.
        </p>
      </div>

      {/* Right: form */}
      <div className="flex w-full items-center justify-center bg-[var(--background)] p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center text-2xl">
                <span aria-hidden="true">💡</span>
              </div>
              <span className="text-xl font-semibold tracking-tight">
                Regalia Vows
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Sign in to continue to your workspace.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
