import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole, FINANCE_ROLES } from "@/lib/rbac";
import { ExpenseForm } from "@/components/expenses/expense-form";

export default async function NewExpensePage() {
  await requireRole(FINANCE_ROLES);

  return (
    <div className="animate-in mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/expenses"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to expenses
        </Link>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900">
          Add expense
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Record a business expense to include it in PNL calculations.
        </p>
      </div>
      <ExpenseForm />
    </div>
  );
}
