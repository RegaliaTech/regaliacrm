import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireRole, FINANCE_ROLES } from "@/lib/rbac";
import { getExpense } from "@/lib/expenses";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { deleteExpense } from "@/app/(app)/expenses/actions";
import { buttonClasses } from "@/components/ui/button";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(FINANCE_ROLES);
  const { id } = await params;
  const expense = await getExpense(id);
  if (!expense) notFound();

  return (
    <div className="animate-in mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Link
            href="/expenses"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to expenses
          </Link>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900">
            Edit {expense.title}
          </h1>
        </div>
        <form action={deleteExpense}>
          <input type="hidden" name="id" value={expense.id} />
          <button type="submit" className={buttonClasses("danger", "sm")}>
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </form>
      </div>
      <ExpenseForm expense={expense} />
    </div>
  );
}
