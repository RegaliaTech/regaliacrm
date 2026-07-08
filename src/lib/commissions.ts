import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { getSettings } from "@/lib/settings";

export type CommissionRow = {
  userId: string;
  userName: string;
  revenue: number;
  rate: number;
  commission: number;
};

/** Per-rep commission breakdown for accepted quotations within [from, to). */
export async function getCommissionReport(
  from: Date,
  to: Date,
): Promise<CommissionRow[]> {
  const settings = await getSettings();

  const res = await safeQuery(
    () =>
      prisma.quotation.findMany({
        where: {
          status: "ACCEPTED",
          updatedAt: { gte: from, lt: to },
          creatorId: { not: null },
        },
        select: {
          total: true,
          creator: {
            select: { id: true, name: true, commissionRate: true },
          },
        },
      }),
    [],
  );

  const byRep = new Map<string, CommissionRow>();
  for (const q of res.data) {
    if (!q.creator) continue;
    const rate = q.creator.commissionRate
      ? Number(q.creator.commissionRate)
      : settings.defaultCommissionRate;
    const existing = byRep.get(q.creator.id);
    const revenue = Number(q.total);
    if (existing) {
      existing.revenue += revenue;
      existing.commission += (revenue * rate) / 100;
    } else {
      byRep.set(q.creator.id, {
        userId: q.creator.id,
        userName: q.creator.name,
        revenue,
        rate,
        commission: (revenue * rate) / 100,
      });
    }
  }

  return Array.from(byRep.values()).sort((a, b) => b.commission - a.commission);
}
