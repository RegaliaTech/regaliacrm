import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { mockExpenses, type MockExpense } from "@/lib/mock";
import { Prisma } from "@prisma/client";

/** Unified, serializable shape used by the expenses UI. */
export type ExpenseView = MockExpense;

type PrismaExpenseWithCreator = Awaited<
  ReturnType<typeof fetchExpenseRows>
>[number];

function fetchExpenseRows(where?: Prisma.ExpenseWhereInput) {
  return prisma.expense.findMany({
    where,
    orderBy: { incurredAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

function normalize(row: PrismaExpenseWithCreator): ExpenseView {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    amount: Number(row.amount),
    currency: row.currency,
    incurredAt: row.incurredAt,
    notes: row.notes,
    createdById: row.createdById,
    createdByName: row.createdBy?.name ?? null,
    createdAt: row.createdAt,
  };
}

export async function getExpenses(filters?: {
  from?: Date;
  to?: Date;
}): Promise<ExpenseView[]> {
  const where: Prisma.ExpenseWhereInput | undefined =
    filters?.from || filters?.to
      ? {
          incurredAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lt: filters.to } : {}),
          },
        }
      : undefined;

  const fallback = filters
    ? mockExpenses.filter((e) => {
        if (filters.from && e.incurredAt < filters.from) return false;
        if (filters.to && e.incurredAt >= filters.to) return false;
        return true;
      })
    : mockExpenses;

  const res = await safeQuery(
    async () => (await fetchExpenseRows(where)).map(normalize),
    fallback,
  );
  return res.data;
}

export async function getExpense(id: string): Promise<ExpenseView | null> {
  const res = await safeQuery(
    async () => {
      const row = await prisma.expense.findUnique({
        where: { id },
        include: { createdBy: { select: { id: true, name: true } } },
      });
      return row ? normalize(row) : null;
    },
    mockExpenses.find((e) => e.id === id) ?? null,
  );
  return res.data;
}

/** Total realized revenue (accepted quotations) within [from, to). */
export async function getRevenueTotal(from: Date, to: Date): Promise<number> {
  const res = await safeQuery(
    () =>
      prisma.quotation.aggregate({
        _sum: { total: true },
        where: { status: "ACCEPTED", updatedAt: { gte: from, lt: to } },
      }),
    { _sum: { total: new Prisma.Decimal(0) } },
  );
  return Number(res.data._sum.total ?? 0);
}

/** Total expenses within [from, to). */
export async function getExpenseTotal(from: Date, to: Date): Promise<number> {
  const res = await safeQuery(
    () =>
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { incurredAt: { gte: from, lt: to } },
      }),
    { _sum: { amount: new Prisma.Decimal(0) } },
  );
  return Number(res.data._sum.amount ?? 0);
}
