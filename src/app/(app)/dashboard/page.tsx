import Link from "next/link";
import {
  Users,
  Package,
  FileText,
  Clock,
  TrendingUp,
  Plus,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { safeQuery } from "@/lib/safe-query";
import { formatCurrency, formatCurrencyCompact, formatDate } from "@/lib/utils";
import { requireUser } from "@/lib/rbac";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { quotationStatusTone } from "@/lib/status";

export default async function DashboardPage() {
  const user = await requireUser();

  const [customers, products, quotations, followups, pipeline, recentQuotes] =
    await Promise.all([
      safeQuery(() => prisma.customer.count(), 0),
      safeQuery(() => prisma.product.count(), 0),
      safeQuery(() => prisma.quotation.count(), 0),
      safeQuery(
        () => prisma.followUp.count({ where: { status: "SCHEDULED" } }),
        0,
      ),
      safeQuery(
        () =>
          prisma.quotation.aggregate({
            _sum: { total: true },
            where: { status: { in: ["SENT", "ACCEPTED"] } },
          }),
        { _sum: { total: new Prisma.Decimal(0) } },
      ),
      safeQuery(
        () =>
          prisma.quotation.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: { customer: true },
          }),
        [] as Prisma.QuotationGetPayload<{
          include: { customer: true };
        }>[],
      ),
    ]);

  const pipelineValue = Number(pipeline.data._sum.total ?? 0);

  return (
    <div className="animate-in mx-auto max-w-7xl space-y-7">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--primary)]">
            {formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-0.5 text-[26px] font-semibold tracking-tight text-slate-900">
            Welcome back, {user.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Here&apos;s what&apos;s happening across your business today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/customers/new"
            className={buttonClasses("outline", "md")}
          >
            <Plus className="h-4 w-4" /> Customer
          </Link>
          <Link
            href="/quotations/new"
            className={buttonClasses("primary", "md")}
          >
            <Plus className="h-4 w-4" /> New quotation
          </Link>
        </div>
      </div>

      {/* Open pipeline */}
      <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 p-6 shadow-xl shadow-indigo-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/40">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl transition-all duration-500 group-hover:scale-150" />
        <div className="relative">
          <div className="flex items-center gap-2 text-indigo-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Open pipeline</span>
          </div>
          <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums text-white">
            {formatCurrencyCompact(pipelineValue)}
          </p>
          <p className="mt-2 text-sm text-indigo-100/80">
            {formatCurrency(pipelineValue)} · sent &amp; accepted
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total customers"
          value={customers.data}
          icon={Users}
          accent="indigo"
          delta={12}
          hint="vs last month"
        />
        <StatCard
          label="Products"
          value={products.data}
          icon={Package}
          accent="sky"
          delta={4}
          hint="vs last month"
        />
        <StatCard
          label="Quotations"
          value={quotations.data}
          icon={FileText}
          accent="emerald"
          delta={8}
          hint="vs last month"
        />
        <StatCard
          label="Pending follow-ups"
          value={followups.data}
          icon={Clock}
          accent="amber"
          hint="scheduled"
        />
      </div>

      {/* Main content */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent quotations</CardTitle>
            <Link
              href="/quotations"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {recentQuotes.data.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-slate-900">
                  No quotations yet
                </p>
                <p className="text-sm text-[var(--muted)]">
                  Create your first quotation to see it here.
                </p>
                <Link
                  href="/quotations/new"
                  className={buttonClasses("primary", "sm", "mt-2")}
                >
                  <Plus className="h-4 w-4" /> New quotation
                </Link>
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Number</TH>
                    <TH>Customer</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Total</TH>
                  </TR>
                </THead>
                <TBody>
                  {recentQuotes.data.map((q) => (
                    <TR key={q.id}>
                      <TD className="font-medium">
                        <Link
                          href={`/quotations/${q.id}`}
                          className="hover:underline"
                        >
                          {q.number}
                        </Link>
                      </TD>
                      <TD>
                        <span className="block font-medium text-slate-900">
                          {q.customer?.company ?? q.customer?.name ?? "—"}
                        </span>
                        <span className="text-xs text-[var(--muted)]">
                          {formatDate(q.createdAt)}
                        </span>
                      </TD>
                      <TD>
                        <Badge tone={quotationStatusTone(q.status)}>
                          {q.status}
                        </Badge>
                      </TD>
                      <TD className="whitespace-nowrap text-right tabular-nums">
                        {formatCurrency(Number(q.total), q.currency)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 sm:grid-cols-2">
            {[
              { href: "/customers/new", label: "Add customer", icon: Users },
              { href: "/products/new", label: "Add product", icon: Package },
              {
                href: "/followups/new",
                label: "Schedule follow-up",
                icon: Clock,
              },
              { href: "/emails", label: "Compose email", icon: FileText },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-white/40 hover:backdrop-blur-xl hover:shadow-sm"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/20 transition-all group-hover:scale-110 group-hover:bg-indigo-500/20">
                    <Icon className="h-4 w-4" />
                  </span>
                  {action.label}
                  <ArrowRight className="ml-auto h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-600" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
