import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { requireUser, can, WRITE_ROLES } from "@/lib/rbac";
import { getQuotations, getQuotationsByStatus } from "@/lib/quotations";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { quotationStatusTone } from "@/lib/status";
import { formatCurrency } from "@/lib/utils";

type TabKey = "all" | "draft" | "sent" | "accepted" | "rejected";

const TABS: { key: TabKey; label: string; status?: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft", status: "DRAFT" },
  { key: "sent", label: "Sent", status: "SENT" },
  { key: "accepted", label: "Accepted", status: "ACCEPTED" },
  { key: "rejected", label: "Rejected", status: "REJECTED" },
];

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const user = await requireUser();
  const { tab, q } = await searchParams;
  const activeTab: TabKey =
    (TABS.find((t) => t.key === tab)?.key as TabKey) ?? "all";
  const query = (q ?? "").trim().toLowerCase();
  const canWrite = can(user.role, WRITE_ROLES);

  let all: Awaited<ReturnType<typeof getQuotations>>;

  if (activeTab === "all") {
    all = await getQuotations();
  } else {
    const statusFilter = TABS.find((t) => t.key === activeTab)?.status;
    all = statusFilter ? await getQuotationsByStatus(statusFilter) : [];
  }

  // Search filtering
  const quotations = all.filter((q) => {
    if (query) {
      const haystack = [q.number, q.customer.name, q.customer.company]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  // Count quotations by status
  const allQuotations = await getQuotations();
  const counts = {
    all: allQuotations.length,
    draft: allQuotations.filter((q) => q.status === "DRAFT").length,
    sent: allQuotations.filter((q) => q.status === "SENT").length,
    accepted: allQuotations.filter((q) => q.status === "ACCEPTED").length,
    rejected: allQuotations.filter((q) => q.status === "REJECTED").length,
  } satisfies Record<TabKey, number>;

  return (
    <div className="animate-in mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <PageHeader
        title="Quotations"
        description="Create and manage customer quotations and proposals."
        action={
          canWrite && (
            <Link
              href="/quotations/new"
              className={buttonClasses("primary", "md")}
            >
              <Plus className="h-4 w-4" /> New quotation
            </Link>
          )
        }
      />

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="glass flex flex-wrap gap-1 rounded-2xl p-1">
          {TABS.map((t) => {
            const params = new URLSearchParams();
            if (t.key !== "all") params.set("tab", t.key);
            if (query) params.set("q", query);
            const href = params.toString()
              ? `/quotations?${params.toString()}`
              : "/quotations";
            const active = t.key === activeTab;
            return (
              <Link
                key={t.key}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs",
                    active
                      ? "bg-white/20"
                      : "bg-slate-100 text-slate-500"
                  )}
                >
                  {counts[t.key]}
                </span>
              </Link>
            );
          })}
        </div>

        <SearchInput
          action="/quotations"
          defaultValue={query}
          placeholder="Search quotations…"
          hidden={activeTab !== "all" ? { tab: activeTab } : undefined}
        />
      </div>

      {/* Table or empty state */}
      {quotations.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotations found"
          description={
            query
              ? "Try a different search term."
              : "Create your first quotation to get started."
          }
          action={
            canWrite && (
              <Link
                href="/quotations/new"
                className={buttonClasses("primary", "sm")}
              >
                <Plus className="h-4 w-4" /> New quotation
              </Link>
            )
          }
        />
      ) : (
        <div className="glass overflow-hidden rounded-3xl">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted-background)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">
                  Quote #
                </th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">
                  Customer
                </th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">
                  Status
                </th>
                <th className="px-6 py-3 text-right font-semibold text-slate-900">
                  Total
                </th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {quotations.map((quote) => (
                <tr
                  key={quote.id}
                  className="hover:bg-[var(--row-hover)] transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/quotations/${quote.id}`}
                      className="font-semibold text-[var(--primary)] hover:underline"
                    >
                      {quote.number}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <p className="font-medium text-slate-900">
                        {quote.customer.name}
                      </p>
                      {quote.customer.company && (
                        <p className="text-xs text-[var(--muted)]">
                          {quote.customer.company}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge tone={quotationStatusTone(quote.status as any)}>
                      {quote.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900">
                    {formatCurrency(quote.total, quote.currency)}
                  </td>
                  <td className="px-6 py-4 text-[var(--muted)]">
                    {new Date(quote.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
