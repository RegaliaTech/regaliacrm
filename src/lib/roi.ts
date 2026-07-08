import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import type { ProductKind } from "@prisma/client";

export type RoiRow = {
  productId: string;
  productName: string;
  sku: string;
  kind: ProductKind;
  cost: number;
  revenue: number;
  /** null when the product has no recorded cost basis */
  roiPercent: number | null;
  bookings: number;
};

/**
 * Per-product ROI: revenue booked (accepted quotations, period) vs. the
 * product's recorded unitCost (its investment/cost basis).
 */
export async function getProductRoi(from: Date, to: Date): Promise<RoiRow[]> {
  const res = await safeQuery(
    () =>
      prisma.quotationItem.findMany({
        where: {
          productId: { not: null },
          quotation: { status: "ACCEPTED", updatedAt: { gte: from, lt: to } },
        },
        select: {
          lineTotal: true,
          product: {
            select: { id: true, name: true, sku: true, kind: true, unitCost: true },
          },
        },
      }),
    [],
  );

  const byProduct = new Map<string, RoiRow>();
  for (const item of res.data) {
    if (!item.product) continue;
    const revenue = Number(item.lineTotal);
    const existing = byProduct.get(item.product.id);
    if (existing) {
      existing.revenue += revenue;
      existing.bookings += 1;
    } else {
      byProduct.set(item.product.id, {
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        kind: item.product.kind,
        cost: Number(item.product.unitCost),
        revenue,
        roiPercent: null,
        bookings: 1,
      });
    }
  }

  const rows = Array.from(byProduct.values()).map((r) => ({
    ...r,
    roiPercent: r.cost > 0 ? ((r.revenue - r.cost) / r.cost) * 100 : null,
  }));

  return rows.sort((a, b) => (b.roiPercent ?? -Infinity) - (a.roiPercent ?? -Infinity));
}
