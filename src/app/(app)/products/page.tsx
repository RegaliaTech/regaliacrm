import Link from "next/link";
import { Package, Plus, Search } from "lucide-react";
import { requireUser, can, WRITE_ROLES } from "@/lib/rbac";
import { getProducts } from "@/lib/products";
import { buttonClasses } from "@/components/ui/button";
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            Products
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Browse models, hosts, photographers, rental equipment, and bespoke creations.
          </p>
        </div>
        {canWrite && (
          <Link href="/products/new" className={buttonClasses("primary", "md")}>
            <Plus className="h-4 w-4" /> New product
          </Link>
        )}
      </div>

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

        <form className="relative" action="/products" method="get">
          {activeTab !== "all" && (
            <input type="hidden" name="tab" value={activeTab} />
          )}
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search products…"
            className="h-10 w-64 rounded-2xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm shadow-[var(--shadow-sm)] outline-none backdrop-blur-xl transition-all placeholder:text-slate-400 hover:bg-white/80 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
          />
        </form>
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] px-6 py-16 text-center backdrop-blur-xl shadow-[var(--shadow-sm)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Package className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-900">
            No products found
          </p>
          <p className="text-sm text-[var(--muted)]">
            {query
              ? "Try a different search term."
              : "Add your first product to get started."}
          </p>
          {canWrite && (
            <Link
              href="/products/new"
              className={buttonClasses("primary", "sm", "mt-2")}
            >
              <Plus className="h-4 w-4" /> New product
            </Link>
          )}
        </div>
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
