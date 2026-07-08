import { Percent, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import Link from "next/link";
import { requireRole, can, FINANCE_ROLES } from "@/lib/rbac";
import { getCommissionReport } from "@/lib/commissions";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { formatCurrency } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { buttonClasses } from "@/components/ui/button";
import { setCommissionRate } from "./actions";

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const user = await requireRole(FINANCE_ROLES);
  const { year: yearParam, month: monthParam } = await searchParams;

  const now = new Date();
  const year = Number(yearParam) || now.getFullYear();
  const month = (Number(monthParam) || now.getMonth() + 1) - 1;

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const prevStart = new Date(year, month - 1, 1);
  const nextStart = new Date(year, month + 1, 1);

  const [report, settings, repsRes] = await Promise.all([
    getCommissionReport(start, end),
    getSettings(),
    safeQuery(
      () =>
        prisma.user.findMany({
          where: { isActive: true, role: { in: ["SALES", "ADMIN"] } },
          select: { id: true, name: true, commissionRate: true },
          orderBy: { name: "asc" },
        }),
      [],
    ),
  ]);

  const reportByUser = new Map(report.map((r) => [r.userId, r]));
  const rows = repsRes.data.map((rep) => {
    const existing = reportByUser.get(rep.id);
    const rate = rep.commissionRate
      ? Number(rep.commissionRate)
      : settings.defaultCommissionRate;
    return {
      userId: rep.id,
      userName: rep.name,
      hasOverride: rep.commissionRate != null,
      revenue: existing?.revenue ?? 0,
      rate,
      commission: existing?.commission ?? 0,
    };
  });

  const totalCommission = rows.reduce((sum, r) => sum + r.commission, 0);
  const canWrite = can(user.role, FINANCE_ROLES);

  const periodHref = (d: Date) =>
    `/commissions?year=${d.getFullYear()}&month=${d.getMonth() + 1}`;

  return (
    <div className="animate-in mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Commissions"
        description="Sales commission owed per rep, based on accepted quotations."
      />

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

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total commission owed"
          value={formatCurrency(totalCommission)}
          icon={Wallet}
          accent="indigo"
          hint="this period"
        />
        <StatCard
          label="Default rate"
          value={`${settings.defaultCommissionRate}%`}
          icon={Percent}
          accent="sky"
          hint="applied unless overridden below"
        />
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Rep</TH>
            <TH>Rate</TH>
            <TH className="text-right">Revenue</TH>
            <TH className="text-right">Commission</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TR key={r.userId}>
              <TD className="font-medium">{r.userName}</TD>
              <TD>
                {canWrite ? (
                  <form
                    action={setCommissionRate}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="userId" value={r.userId} />
                    <Input
                      name="rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      defaultValue={r.rate}
                      className="h-8 w-20 text-sm"
                    />
                    <button
                      type="submit"
                      className={buttonClasses("outline", "sm")}
                    >
                      Save
                    </button>
                  </form>
                ) : (
                  <span>{r.rate}%</span>
                )}
              </TD>
              <TD className="whitespace-nowrap text-right tabular-nums">
                {formatCurrency(r.revenue)}
              </TD>
              <TD className="whitespace-nowrap text-right font-medium tabular-nums">
                {formatCurrency(r.commission)}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
