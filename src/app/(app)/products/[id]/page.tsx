import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Package, Clock, Boxes } from "lucide-react";
import { requireUser, can, WRITE_ROLES } from "@/lib/rbac";
import { getProduct } from "@/lib/products";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlbumGallery } from "@/components/products/album-gallery";
import {
  availabilityTone,
  productKindLabel,
  productKindTone,
} from "@/lib/status";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const canWrite = can(user.role, WRITE_ROLES);
  const margin = product.unitPrice - product.unitCost;
  const marginPct =
    product.unitPrice > 0 ? Math.round((margin / product.unitPrice) * 100) : 0;
  const available =
    product.qtyTotal != null
      ? Math.max(0, product.qtyTotal - product.qtyOnRent)
      : null;
  const specs = product.specs
    ? Object.entries(product.specs).filter(([, v]) => v != null && v !== "")
    : [];
  const isTalent =
    product.kind === "MODEL" || product.kind === "PHOTOGRAPHER";
  const talentRows: [string, string][] = isTalent
    ? ([
        ["Height", product.height],
        ["Weight", product.weight],
        ["Nationality", product.nationality],
        [
          "Languages",
          product.languages.length ? product.languages.join(", ") : null,
        ],
      ].filter(([, v]) => v != null && v !== "") as [string, string][])
    : [];

  return (
    <div className="animate-in mx-auto max-w-7xl space-y-6">
      <div className="glass rounded-3xl px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to products
        </Link>
        {canWrite && (
          <Link
            href={`/products/${product.id}/edit`}
            className={buttonClasses("outline", "sm")}
          >
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        )}
      </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Gallery */}
        <div className="lg:col-span-7 lg:sticky lg:top-6 lg:self-start">
          <AlbumGallery
            images={product.images}
            cover={product.coverImage}
            name={product.name}
          />
        </div>

        {/* Info */}
        <div className="space-y-5 lg:col-span-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={productKindTone(product.kind)}>
                {productKindLabel(product.kind)}
              </Badge>
              {product.category && <Badge>{product.category}</Badge>}
              {product.tier && (
                <Badge tone="primary">
                  {product.tier.charAt(0) + product.tier.slice(1).toLowerCase()}
                </Badge>
              )}
              {!product.isActive && <Badge tone="muted">Inactive</Badge>}
              <Badge tone="muted">SKU {product.sku}</Badge>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {product.name}
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {[product.model && `Model ${product.model}`, product.figure]
                .filter(Boolean)
                .join(" · ") || product.sku}
            </p>
          </div>

          {product.description && (
            <p className="text-base leading-relaxed text-slate-600">
              {product.description}
            </p>
          )}

          {/* Pricing */}
          {product.kind === "RENTAL" ? (
            <Card>
              <CardContent className="grid grid-cols-1 gap-4 p-5 pt-5 sm:grid-cols-2">
                <Metric
                  label="Daily rate"
                  value={formatCurrencyCompact(product.dailyRate ?? 0, product.currency)}
                  hint={formatCurrency(product.dailyRate ?? 0, product.currency)}
                />
                <Metric
                  label="Weekly rate"
                  value={formatCurrencyCompact(product.weeklyRate ?? 0, product.currency)}
                  hint={formatCurrency(product.weeklyRate ?? 0, product.currency)}
                />
                <Metric
                  label="Deposit"
                  value={formatCurrencyCompact(product.deposit ?? 0, product.currency)}
                  hint={formatCurrency(product.deposit ?? 0, product.currency)}
                />
                <div>
                  <p className="text-xs font-medium text-[var(--muted)]">
                    Availability
                  </p>
                  {available != null && product.qtyTotal != null ? (
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone={availabilityTone(available, product.qtyTotal)}>
                        {available} / {product.qtyTotal} free
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                        <Boxes className="h-3.5 w-3.5" />
                        {product.qtyOnRent} on rent
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">—</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="grid grid-cols-1 gap-4 p-5 pt-5 sm:grid-cols-2 2xl:grid-cols-3">
                <Metric
                  label="Price"
                  value={formatCurrencyCompact(product.unitPrice, product.currency)}
                  hint={formatCurrency(product.unitPrice, product.currency)}
                />
                <Metric
                  label="Cost"
                  value={formatCurrencyCompact(product.unitCost, product.currency)}
                  hint={formatCurrency(product.unitCost, product.currency)}
                />
                <Metric label="Margin" value={`${marginPct}%`} />
              </CardContent>
            </Card>
          )}

          {product.kind === "CUSTOM" && product.leadTimeDays != null && (
            <div className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--primary)]">
              <Clock className="h-4 w-4" />
              {product.leadTimeDays}-day production lead time
            </div>
          )}

          {/* Talent profile */}
          {talentRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-[var(--muted)]" />
                  {product.kind === "PHOTOGRAPHER"
                    ? "Photographer profile"
                    : "Model / host profile"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <dl className="divide-y divide-[var(--border)]">
                  {talentRows.map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between gap-4 py-2 text-sm"
                    >
                      <dt className="text-[var(--muted)]">{k}</dt>
                      <dd className="max-w-[65%] text-right font-medium text-slate-900">
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Specs */}
          {specs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-[var(--muted)]" />
                  Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <dl className="divide-y divide-[var(--border)]">
                  {specs.map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between gap-4 py-2 text-sm"
                    >
                      <dt className="text-[var(--muted)]">{k}</dt>
                      <dd className="max-w-[65%] text-right font-medium text-slate-900">
                        {String(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold leading-tight tabular-nums text-slate-900">
        {value}
      </p>
      {hint && hint !== value && (
        <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
      )}
    </div>
  );
}
