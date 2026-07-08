import Link from "next/link";
import { Plus, Users } from "lucide-react";
import type { CustomerStatus } from "@prisma/client";
import { requireUser, can, WRITE_ROLES } from "@/lib/rbac";
import { getCustomers } from "@/lib/customers";
import { convertLeadToCustomerAndQuote } from "@/app/(app)/customers/actions";
import { customerStatusTone } from "@/lib/status";
import { formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";

type TabKey = "all" | "lead" | "active" | "inactive" | "churned";

const TABS: { key: TabKey; label: string; status?: CustomerStatus }[] = [
  { key: "all", label: "All" },
  { key: "lead", label: "Lead", status: "LEAD" },
  { key: "active", label: "Active", status: "ACTIVE" },
  { key: "inactive", label: "Inactive", status: "INACTIVE" },
  { key: "churned", label: "Churned", status: "CHURNED" },
];

export default async function CustomersPage({
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

  const all = await getCustomers();
  const activeStatus = TABS.find((t) => t.key === activeTab)?.status;

  const customers = all.filter((c) => {
    if (activeStatus && c.status !== activeStatus) return false;
    if (query) {
      const haystack = [c.name, c.company, c.email, c.phone, c.ownerName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const counts = {
    all: all.length,
    lead: all.filter((c) => c.status === "LEAD").length,
    active: all.filter((c) => c.status === "ACTIVE").length,
    inactive: all.filter((c) => c.status === "INACTIVE").length,
    churned: all.filter((c) => c.status === "CHURNED").length,
  } satisfies Record<TabKey, number>;

  return (
    <div className="animate-in mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Customers"
        description="Manage leads and active accounts in one place."
        action={
          canWrite && (
            <Link
              href="/customers/new"
              className={buttonClasses("primary", "md")}
            >
              <Plus className="h-4 w-4" /> New customer
            </Link>
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="glass flex flex-wrap gap-1 rounded-2xl p-1">
          {TABS.map((t) => {
            const params = new URLSearchParams();
            if (t.key !== "all") params.set("tab", t.key);
            if (query) params.set("q", query);
            const href = params.toString()
              ? `/customers?${params.toString()}`
              : "/customers";
            const active = t.key === activeTab;
            return (
              <Link
                key={t.key}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs",
                    active ? "bg-white/20" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {counts[t.key]}
                </span>
              </Link>
            );
          })}
        </div>

        <SearchInput
          action="/customers"
          defaultValue={query}
          placeholder="Search customers…"
          hidden={activeTab !== "all" ? { tab: activeTab } : undefined}
        />
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description={
            query
              ? "Try a different search term."
              : "Add your first customer to get started."
          }
          action={
            canWrite && (
              <Link
                href="/customers/new"
                className={buttonClasses("primary", "sm")}
              >
                <Plus className="h-4 w-4" /> New customer
              </Link>
            )
          }
        />
      ) : (
        <div className="glass overflow-hidden rounded-3xl">
          <Table>
            <THead>
              <TR>
                <TH>Customer</TH>
                <TH>Contact</TH>
                <TH>Status</TH>
                <TH>Owner</TH>
                {canWrite && <TH className="whitespace-nowrap">Action</TH>}
                <TH className="text-right">Updated</TH>
              </TR>
            </THead>
            <TBody>
              {customers.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link
                      href={`/customers/${c.id}`}
                      className="block font-medium text-slate-900 hover:text-[var(--primary)] hover:underline"
                    >
                      {c.name}
                    </Link>
                    <span className="text-xs text-[var(--muted)]">{c.company ?? "—"}</span>
                  </TD>
                  <TD>
                    <span className="block text-slate-900">{c.email ?? "—"}</span>
                    <span className="text-xs text-[var(--muted)]">{c.phone ?? "—"}</span>
                  </TD>
                  <TD>
                    <Badge tone={customerStatusTone(c.status)}>{c.status}</Badge>
                  </TD>
                  <TD>{c.ownerName ?? "—"}</TD>
                  {canWrite && (
                    <TD className="whitespace-nowrap">
                      {c.status === "LEAD" ? (
                        <form action={convertLeadToCustomerAndQuote}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="name" value={c.name} />
                          <input
                            type="hidden"
                            name="company"
                            value={c.company ?? ""}
                          />
                          <input
                            type="hidden"
                            name="email"
                            value={c.email ?? ""}
                          />
                          <input
                            type="hidden"
                            name="phone"
                            value={c.phone ?? ""}
                          />
                          <input
                            type="hidden"
                            name="website"
                            value={c.website ?? ""}
                          />
                          <input
                            type="hidden"
                            name="address"
                            value={c.address ?? ""}
                          />
                          <input
                            type="hidden"
                            name="tags"
                            value={c.tags.join(", ")}
                          />
                          <button
                            type="submit"
                            className={buttonClasses(
                              "outline",
                              "sm",
                              "whitespace-nowrap",
                            )}
                          >
                            Convert lead
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">—</span>
                      )}
                    </TD>
                  )}
                  <TD className="whitespace-nowrap text-right text-[var(--muted)]">
                    {formatDate(c.updatedAt)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
