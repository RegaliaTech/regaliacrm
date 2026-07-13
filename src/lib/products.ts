import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import type { ProductView } from "@/lib/view-types";

export type { ProductView } from "@/lib/view-types";

type PrismaProductWithImages = Awaited<
  ReturnType<typeof fetchProductRows>
>[number];

function fetchProductRows() {
  return prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { images: { orderBy: { position: "asc" } } },
  });
}

function num(v: unknown): number {
  return v == null ? 0 : Number(v);
}

function numOrNull(v: unknown): number | null {
  return v == null ? null : Number(v);
}

function normalize(row: PrismaProductWithImages): ProductView {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    kind: row.kind,
    model: row.model,
    figure: row.figure,
    category: row.category,
    description: row.description,
    coverImage: row.coverImage,
    specs: (row.specs as Record<string, string> | null) ?? null,
    height: row.height,
    weight: row.weight,
    nationality: row.nationality,
    languages: row.languages ?? [],
    unitPrice: num(row.unitPrice),
    unitCost: num(row.unitCost),
    currency: row.currency,
    isActive: row.isActive,
    dailyRate: numOrNull(row.dailyRate),
    weeklyRate: numOrNull(row.weeklyRate),
    deposit: numOrNull(row.deposit),
    qtyTotal: row.qtyTotal,
    qtyOnRent: row.qtyOnRent,
    isBespoke: row.isBespoke,
    leadTimeDays: row.leadTimeDays,
    images: row.images.map((img) => ({
      id: img.id,
      url: img.url,
      caption: img.caption,
      position: img.position,
    })),
    createdAt: row.createdAt,
  };
}

export async function getProducts(): Promise<ProductView[]> {
  const res = await safeQuery(
    async () => (await fetchProductRows()).map(normalize),
    [],
  );
  return res.data;
}

export async function getProduct(id: string): Promise<ProductView | null> {
  const res = await safeQuery(
    async () => {
      const row = await prisma.product.findUnique({
        where: { id },
        include: { images: { orderBy: { position: "asc" } } },
      });
      return row ? normalize(row) : null;
    },
    null,
  );
  return res.data;
}
