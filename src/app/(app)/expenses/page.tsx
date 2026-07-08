import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Receipt,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { requireRole, can, FINANCE_ROLES } from "@/lib/rbac";
import { getExpenses, getExpenseTotal, getRevenueTotal } from "@/lib/expenses";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { expenseCategoryLabel, expenseCategoryTone } from "@/lib/status";

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const user = await requireRole(FINANCE_ROLES);
  const { year: yearParam, month: monthParam } = await searchParams;

  const now = new Date();
  const year = Number(yearParam) || now.getFullYear();
  // Stored as 1-12 in the URL; JS Date months are 0-11.
  const month = (Number(monthParam) || now.getMonth() + 1) - 1;

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const prevStart = new Date(year, month - 1, 1);
  const nextStart = new Date(year, month + 1, 1);

  const [expenses, revenue, expenseTotal] = await Promise.all([
    getExpenses({ from: start, to: end }),
    getRevenueTotal(start, end),
    getExpenseTotal(start, end),
  ]);

  const profit = revenue - expenseTotal;
  const canWrite = can(user.role, FINANCE_ROLES);

  const periodHref = (d: Date) =>
    `/expenses?year=${d.getFullYear()}&month=${d.getMonth() + 1}`;

  return (
    <div className="animate-in mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            Expenses &amp; PNL
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Track business expenses and see profit vs. revenue by month.
          </p>
        </div>
        {canWrite && (
          <Link href="/expenses/new" className={buttonClasses("primary", "md")}>
            <Plus className="h-4 w-4" /> Add expense
          </Link>
        )}
      </div>

      {/* Period selector */}
      <div className="glass inline-flex items-center gap-1 rounded-2xl p-1">
        <Link
          href={periodHref(prevStart)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="px-3 text-sm font-medium text-slate-900">
          {monthLabel(year, month)}
        </span>
        <Link
          href={periodHref(nextStart)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* PNL stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Revenue"
          value={formatCurrency(revenue)}
          icon={TrendingUp}
          accent="emerald"
          hint="accepted quotations"
        />
        <StatCard
          label="Expenses"
          value={formatCurrency(expenseTotal)}
          icon={TrendingDown}
          accent="rose"
          hint="this period"
        />
        <StatCard
          label="Profit"
          value={formatCurrency(profit)}
          icon={Wallet}
          accent={profit >= 0 ? "indigo" : "rose"}
          hint="revenue − expenses"
        />
      </div>

      {/* Expense list */}
      {expenses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] px-6 py-16 text-center backdrop-blur-xl shadow-[var(--shadow-sm)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Receipt className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-900">
            No expenses recorded for this period
          </p>
          <p className="text-sm text-[var(--muted)]">
            Add an expense to start tracking PNL.
          </p>
          {canWrite && (
            <Link
              href="/expenses/new"
              className={buttonClasses("primary", "sm", "mt-2")}
            >
              <Plus className="h-4 w-4" /> Add expense
            </Link>
          )}
        </div>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Title</TH>
              <TH>Category</TH>
              <TH>Date</TH>
              <TH className="text-right">Amount</TH>
              {canWrite && <TH className="text-right">Actions</TH>}
            </TR>
          </THead>
          <TBody>
            {expenses.map((e) => (
              <TR key={e.id}>
                <TD className="font-medium">{e.title}</TD>
                <TD>
                  <Badge tone={expenseCategoryTone(e.category)}>
                    {expenseCategoryLabel(e.category)}
                  </Badge>
                </TD>
                <TD>{formatDate(e.incurredAt)}</TD>
                <TD className="whitespace-nowrap text-right tabular-nums">
                  {formatCurrency(e.amount, e.currency)}
                </TD>
                {canWrite && (
                  <TD className="text-right">
                    <Link
                      href={`/expenses/${e.id}/edit`}
                      className="text-sm font-medium text-[var(--primary)] hover:underline"
                    >
                      Edit
                    </Link>
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
