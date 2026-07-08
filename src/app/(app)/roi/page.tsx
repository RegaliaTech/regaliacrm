import Link from "next/link";
import { TrendingUp, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { requireRole, FINANCE_ROLES } from "@/lib/rbac";
import { getProductRoi } from "@/lib/roi";
import { formatCurrency } from "@/lib/utils";
import { productKindLabel } from "@/lib/status";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default async function RoiPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  await requireRole(FINANCE_ROLES);
  const { year: yearParam, month: monthParam } = await searchParams;

  const now = new Date();
  const year = Number(yearParam) || now.getFullYear();
  const month = (Number(monthParam) || now.getMonth() + 1) - 1;

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const prevStart = new Date(year, month - 1, 1);
  const nextStart = new Date(year, month + 1, 1);

  const rows = await getProductRoi(start, end);

  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  const totalCost = rows.reduce((sum, r) => sum + r.cost, 0);
  const blendedRoi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : null;

  const periodHref = (d: Date) =>
    `/roi?year=${d.getFullYear()}&month=${d.getMonth() + 1}`;

  return (
    <div className="animate-in mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
          ROI by product
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Revenue booked vs. cost basis for each model, photographer, or rental item.
        </p>
      </div>

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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Revenue booked"
          value={formatCurrency(totalRevenue)}
          icon={TrendingUp}
          accent="emerald"
          hint="this period"
        />
        <StatCard
          label="Cost basis"
          value={formatCurrency(totalCost)}
          icon={BarChart3}
          accent="rose"
          hint="products booked this period"
        />
        <StatCard
          label="Blended ROI"
          value={blendedRoi === null ? "—" : `${blendedRoi.toFixed(0)}%`}
          icon={TrendingUp}
          accent={blendedRoi !== null && blendedRoi < 0 ? "rose" : "indigo"}
          hint="across all products"
        />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] px-6 py-16 text-center backdrop-blur-xl shadow-[var(--shadow-sm)]">
          <p className="text-sm font-medium text-slate-900">
            No bookings in this period
          </p>
          <p className="text-sm text-[var(--muted)]">
            ROI is computed from accepted quotations that include products.
          </p>
        </div>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Product</TH>
              <TH>Type</TH>
              <TH className="text-right">Bookings</TH>
              <TH className="text-right">Cost</TH>
              <TH className="text-right">Revenue</TH>
              <TH className="text-right">ROI</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.productId}>
                <TD className="font-medium">
                  {r.productName}
                  <span className="ml-2 text-xs text-[var(--muted)]">{r.sku}</span>
                </TD>
                <TD>{productKindLabel(r.kind)}</TD>
                <TD className="text-right tabular-nums">{r.bookings}</TD>
                <TD className="whitespace-nowrap text-right tabular-nums">
                  {formatCurrency(r.cost)}
                </TD>
                <TD className="whitespace-nowrap text-right tabular-nums">
                  {formatCurrency(r.revenue)}
                </TD>
                <TD className="text-right">
                  {r.roiPercent === null ? (
                    <span className="text-[var(--muted)]">—</span>
                  ) : (
                    <Badge tone={r.roiPercent >= 0 ? "success" : "danger"}>
                      {r.roiPercent >= 0 ? "+" : ""}
                      {r.roiPercent.toFixed(0)}%
                    </Badge>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
