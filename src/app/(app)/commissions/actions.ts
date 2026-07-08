"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, FINANCE_ROLES } from "@/lib/rbac";

const rateSchema = z.object({
  userId: z.string().min(1),
  rate: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? Number(v) : null)),
});

export async function setCommissionRate(formData: FormData): Promise<void> {
  await requireRole(FINANCE_ROLES);

  const parsed = rateSchema.safeParse({
    userId: formData.get("userId"),
    rate: formData.get("rate"),
  });
  if (!parsed.success) return;

  const { userId, rate } = parsed.data;
  if (rate !== null && (Number.isNaN(rate) || rate < 0 || rate > 100)) return;

  await prisma.user.update({
    where: { id: userId },
    data: { commissionRate: rate },
  });

  revalidatePath("/commissions");
}
