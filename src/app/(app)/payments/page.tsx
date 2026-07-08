import Link from "next/link";
import { Receipt, Send, AlertTriangle } from "lucide-react";
import { requireRole, FINANCE_ROLES } from "@/lib/rbac";
import { getOutstandingInvoices } from "@/lib/payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecordPaymentForm } from "@/components/payments/record-payment-form";
import { setDueDate, sendReminder } from "./actions";

function overdueTone(days: number | null): "muted" | "warning" | "danger" {
  if (days === null) return "muted";
  if (days > 0) return "danger";
  if (days > -3) return "warning";
  return "muted";
}

export default async function PaymentsPage() {
  await requireRole(FINANCE_ROLES);
  const invoices = await getOutstandingInvoices();

  const totalOutstanding = invoices.reduce((sum, i) => sum + i.balance, 0);
  const overdueCount = invoices.filter(
    (i) => i.daysOverdue !== null && i.daysOverdue > 0,
  ).length;

  return (
    <div className="animate-in mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Payment reminders"
        description="Outstanding balances on sent and accepted quotations."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total outstanding"
          value={formatCurrency(totalOutstanding)}
          icon={Receipt}
          accent="rose"
          hint="across all customers"
        />
        <StatCard
          label="Overdue invoices"
          value={overdueCount}
          icon={AlertTriangle}
          accent="amber"
          hint="past due date"
        />
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          title="No outstanding balances"
          description="All sent and accepted quotations are fully paid."
        />
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/quotations/${inv.id}`}
                      className="font-semibold text-slate-900 hover:underline"
                    >
                      {inv.number}
                    </Link>
                    {inv.daysOverdue !== null && (
                      <Badge tone={overdueTone(inv.daysOverdue)}>
                        {inv.daysOverdue > 0
                          ? `${inv.daysOverdue}d overdue`
                          : `due in ${-inv.daysOverdue}d`}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-[var(--muted)]">
                    {inv.customer.company ?? inv.customer.name}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-right text-sm">
                  <div>
                    <p className="text-[var(--muted)]">Total</p>
                    <p className="font-medium">{formatCurrency(inv.total, inv.currency)}</p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Paid</p>
                    <p className="font-medium">{formatCurrency(inv.paid, inv.currency)}</p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Balance</p>
                    <p className="font-semibold text-[var(--danger)]">
                      {formatCurrency(inv.balance, inv.currency)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-3">
                <form action={setDueDate} className="flex items-center gap-1.5">
                  <input type="hidden" name="quotationId" value={inv.id} />
                  <span className="text-xs text-[var(--muted)]">Due date</span>
                  <Input
                    name="dueDate"
                    type="date"
                    defaultValue={
                      inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : ""
                    }
                    className="h-8 w-36 text-sm"
                  />
                  <button type="submit" className={buttonClasses("outline", "sm")}>
                    Save
                  </button>
                </form>

                <form action={sendReminder}>
                  <input type="hidden" name="quotationId" value={inv.id} />
                  <button
                    type="submit"
                    disabled={!inv.customer.email}
                    className={buttonClasses("outline", "sm")}
                    title={inv.customer.email ?? "Customer has no email"}
                  >
                    <Send className="h-3.5 w-3.5" /> Send reminder
                  </button>
                </form>

                <RecordPaymentForm quotationId={inv.id} />
              </div>

              {inv.payments.length > 0 && (
                <div className="mt-3 border-t border-[var(--border)] pt-3">
                  <Table>
                    <THead>
                      <TR>
                        <TH>Paid on</TH>
                        <TH>Method</TH>
                        <TH className="text-right">Amount</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {inv.payments.map((p) => (
                        <TR key={p.id}>
                          <TD>{formatDate(p.paidAt)}</TD>
                          <TD>{p.method ?? "—"}</TD>
                          <TD className="text-right tabular-nums">
                            {formatCurrency(p.amount, inv.currency)}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
