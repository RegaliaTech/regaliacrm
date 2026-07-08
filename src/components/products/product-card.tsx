import Link from "next/link";
import { ImageIcon } from "lucide-react";
import type { ProductView } from "@/lib/products";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  availabilityTone,
  productKindLabel,
  productKindTone,
} from "@/lib/status";

export function ProductCard({ product }: { product: ProductView }) {
  const available =
    product.qtyTotal != null
      ? Math.max(0, product.qtyTotal - product.qtyOnRent)
      : null;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group glass flex flex-col overflow-hidden rounded-3xl transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {product.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.coverImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <Badge tone={productKindTone(product.kind)}>
            {productKindLabel(product.kind)}
          </Badge>
          {!product.isActive && <Badge tone="muted">Inactive</Badge>}
        </div>
        {product.images.length > 1 && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
            <ImageIcon className="h-3 w-3" /> {product.images.length}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900">{product.name}</h3>
        </div>
        <p className="text-xs text-[var(--muted)]">
          {(product.kind === "MODEL" || product.kind === "PHOTOGRAPHER"
            ? [product.nationality, product.height]
            : [product.model, product.figure]
          )
            .filter(Boolean)
            .join(" · ") || product.sku}
        </p>

        <div className="mt-auto flex items-end justify-between pt-3">
          {product.kind === "RENTAL" ? (
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {formatCurrency(product.dailyRate ?? 0, product.currency)}
                <span className="text-xs font-normal text-[var(--muted)]">
                  {" "}
                  / day
                </span>
              </p>
              {available != null && product.qtyTotal != null && (
                <Badge
                  tone={availabilityTone(available, product.qtyTotal)}
                  className="mt-1"
                >
                  {available > 0
                    ? `${available} of ${product.qtyTotal} available`
                    : "Fully booked"}
                </Badge>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {formatCurrency(product.unitPrice, product.currency)}
              </p>
              {product.kind === "CUSTOM" && product.leadTimeDays != null && (
                <p className="text-xs text-[var(--muted)]">
                  {product.leadTimeDays}-day lead time
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
