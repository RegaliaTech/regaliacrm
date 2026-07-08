import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { mockRecentQuotes, mockQuotationDetails } from "@/lib/mock";

export type QuotationView = {
  id: string;
  number: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
  };
  status: string;
  currency: string;
  taxRate: number;
  discountRate: number;
  notes: string | null;
  validUntil: Date | null;
  issuedAt: Date | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  items: QuotationItemView[];
  createdAt: Date;
  updatedAt: Date;
};

export type QuotationItemView = {
  id: string;
  quotationId: string;
  productId: string | null;
  product?: {
    id: string;
    sku: string;
    name: string;
    kind: string;
  } | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  position: number;
};

export type QuotationListItem = {
  id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  createdAt: Date;
  customer: {
    name: string;
    company: string | null;
  };
};

function num(v: unknown): number {
  return v == null ? 0 : Number(v);
}

function fetchQuotationRow(id: string) {
  return prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: { product: true },
        orderBy: { position: "asc" },
      },
    },
  });
}

function normalizeFetchedQuotation(
  row: Awaited<ReturnType<typeof fetchQuotationRow>>
): QuotationView | null {
  if (!row) return null;
  return {
    id: row.id,
    number: row.number,
    customerId: row.customerId,
    customer: {
      id: row.customer.id,
      name: row.customer.name,
      company: row.customer.company,
      email: row.customer.email,
    },
    status: row.status,
    currency: row.currency,
    taxRate: num(row.taxRate),
    discountRate: num(row.discountRate),
    notes: row.notes,
    validUntil: row.validUntil,
    issuedAt: row.issuedAt,
    subtotal: num(row.subtotal),
    discountTotal: num(row.discountTotal),
    taxTotal: num(row.taxTotal),
    total: num(row.total),
    items: (row.items ?? []).map((item) => ({
      id: item.id,
      quotationId: item.quotationId,
      productId: item.productId,
      product: item.product
        ? {
            id: item.product.id,
            sku: item.product.sku,
            name: item.product.name,
            kind: item.product.kind,
          }
        : null,
      description: item.description,
      quantity: num(item.quantity),
      unitPrice: num(item.unitPrice),
      lineTotal: num(item.lineTotal),
      position: item.position,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getQuotations(): Promise<QuotationListItem[]> {
  const res = await safeQuery(
    async () => {
      const rows = await prisma.quotation.findMany({
        orderBy: { createdAt: "desc" },
        include: { customer: true },
      });
      return rows.map((row) => ({
        id: row.id,
        number: row.number,
        status: row.status,
        total: num(row.total),
        currency: row.currency,
        createdAt: row.createdAt,
        customer: {
          name: row.customer.name,
          company: row.customer.company,
        },
      }));
    },
    mockRecentQuotes as QuotationListItem[],
  );
  return res.data;
}

export async function getQuotation(
  id: string
): Promise<QuotationView | null> {
  const res = await safeQuery(
    async () => {
      const row = await fetchQuotationRow(id);
      return normalizeFetchedQuotation(row);
    },
    mockQuotationDetails.find((q) => q.id === id) ?? null
  );
  return res.data;
}

export async function getQuotationsByStatus(
  status: string
): Promise<QuotationListItem[]> {
  const res = await safeQuery(
    async () => {
      const rows = await prisma.quotation.findMany({
        where: { status: status as any },
        orderBy: { createdAt: "desc" },
        include: { customer: true },
      });
      return rows.map((row) => ({
        id: row.id,
        number: row.number,
        status: row.status,
        total: num(row.total),
        currency: row.currency,
        createdAt: row.createdAt,
        customer: {
          name: row.customer.name,
          company: row.customer.company,
        },
      }));
    },
    mockRecentQuotes.filter((q) => q.status === status) as QuotationListItem[]
  );
  return res.data;
}

/** Calculate totals based on items, tax, and discount rates */
export function calculateTotals(
  items: { quantity: number; unitPrice: number }[],
  taxRate: number,
  discountRate: number
): { subtotal: number; discountTotal: number; taxTotal: number; total: number } {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const discountTotal = (subtotal * discountRate) / 100;
  const afterDiscount = subtotal - discountTotal;
  const taxTotal = (afterDiscount * taxRate) / 100;
  const total = afterDiscount + taxTotal;

  return {
    subtotal,
    discountTotal,
    taxTotal,
    total,
  };
}
