import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { requireUser, can, WRITE_ROLES } from "@/lib/rbac";
import { getProducts } from "@/lib/products";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { ProductCard } from "@/components/products/product-card";
import { cn } from "@/lib/utils";
import type { ProductKind } from "@prisma/client";

type TabKey = "all" | "models" | "photographers" | "rental" | "custom";

const TABS: { key: TabKey; label: string; kind?: ProductKind }[] = [
  { key: "all", label: "All" },
  { key: "models", label: "Models & Hosts", kind: "MODEL" },
  { key: "photographers", label: "Photographers", kind: "PHOTOGRAPHER" },
  { key: "rental", label: "Equipment Rental", kind: "RENTAL" },
  { key: "custom", label: "Custom", kind: "CUSTOM" },
];

export default async function ProductsPage({
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

  const all = await getProducts();
  const activeKind = TABS.find((t) => t.key === activeTab)?.kind;

  const products = all.filter((p) => {
    if (activeKind && p.kind !== activeKind) return false;
    if (query) {
      const haystack = [p.name, p.sku, p.model, p.figure, p.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const counts = {
    all: all.length,
    models: all.filter((p) => p.kind === "MODEL").length,
    photographers: all.filter((p) => p.kind === "PHOTOGRAPHER").length,
    rental: all.filter((p) => p.kind === "RENTAL").length,
    custom: all.filter((p) => p.kind === "CUSTOM").length,
  } satisfies Record<TabKey, number>;

  return (
    <div className="animate-in mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <PageHeader
        title="Products"
        description="Browse models, hosts, photographers, rental equipment, and bespoke creations."
        action={
          canWrite && (
            <Link
              href="/products/new"
              className={buttonClasses("primary", "md")}
            >
              <Plus className="h-4 w-4" /> New product
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
              ? `/products?${params.toString()}`
              : "/products";
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
          action="/products"
          defaultValue={query}
          placeholder="Search products…"
          hidden={activeTab !== "all" ? { tab: activeTab } : undefined}
        />
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description={
            query
              ? "Try a different search term."
              : "Add your first product to get started."
          }
          action={
            canWrite && (
              <Link
                href="/products/new"
                className={buttonClasses("primary", "sm")}
              >
                <Plus className="h-4 w-4" /> New product
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
