import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";

export type VendorListItem = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
};

export type VendorReceiptView = {
  id: string;
  receiptNumber: string | null;
  description: string;
  amount: number;
  currency: string;
  receiptDate: Date;
  fileUrl: string | null;
  notes: string | null;
};

export type VendorStockView = {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  reorderLevel: number | null;
  lastRestockedAt: Date | null;
  productId: string | null;
  productName: string | null;
};

export type VendorDetail = VendorListItem & {
  address: string | null;
  notes: string | null;
  receipts: VendorReceiptView[];
  stock: VendorStockView[];
};

function num(v: unknown): number {
  return v == null ? 0 : Number(v);
}

export async function getVendors(): Promise<VendorListItem[]> {
  const res = await safeQuery(
    () =>
      prisma.vendor.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          contactName: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
      }),
    [],
  );
  return res.data;
}

export async function getVendor(id: string): Promise<VendorDetail | null> {
  const res = await safeQuery(
    async () => {
      const row = await prisma.vendor.findUnique({
        where: { id },
        include: {
          receipts: { orderBy: { receiptDate: "desc" } },
          stock: { include: { product: { select: { name: true } } }, orderBy: { itemName: "asc" } },
        },
      });
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        contactName: row.contactName,
        email: row.email,
        phone: row.phone,
        address: row.address,
        notes: row.notes,
        isActive: row.isActive,
        createdAt: row.createdAt,
        receipts: row.receipts.map((r) => ({
          id: r.id,
          receiptNumber: r.receiptNumber,
          description: r.description,
          amount: num(r.amount),
          currency: r.currency,
          receiptDate: r.receiptDate,
          fileUrl: r.fileUrl,
          notes: r.notes,
        })),
        stock: row.stock.map((s) => ({
          id: s.id,
          itemName: s.itemName,
          quantity: s.quantity,
          unit: s.unit,
          reorderLevel: s.reorderLevel,
          lastRestockedAt: s.lastRestockedAt,
          productId: s.productId,
          productName: s.product?.name ?? null,
        })),
      };
    },
    null,
  );
  return res.data;
}
