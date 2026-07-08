"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, FINANCE_ROLES } from "@/lib/rbac";
import { sendPaymentReminder } from "@/lib/payments";

const paymentSchema = z.object({
  quotationId: z.string().min(1),
  amount: z.coerce.number().positive(),
  paidAt: z.string().min(1),
  method: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentFormState = { error?: string };

export async function recordPayment(
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const user = await requireRole(FINANCE_ROLES);

  const parsed = paymentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  await prisma.payment.create({
    data: {
      quotationId: d.quotationId,
      amount: d.amount,
      paidAt: new Date(d.paidAt),
      method: d.method || null,
      notes: d.notes || null,
      createdById: user.id,
    },
  });

  revalidatePath("/payments");
  revalidatePath(`/quotations/${d.quotationId}`);
  return {};
}

const dueDateSchema = z.object({
  quotationId: z.string().min(1),
  dueDate: z.string().min(1),
});

export async function setDueDate(formData: FormData): Promise<void> {
  await requireRole(FINANCE_ROLES);
  const parsed = dueDateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  await prisma.quotation.update({
    where: { id: parsed.data.quotationId },
    data: { dueDate: new Date(parsed.data.dueDate) },
  });

  revalidatePath("/payments");
  revalidatePath(`/quotations/${parsed.data.quotationId}`);
}

export async function sendReminder(formData: FormData): Promise<void> {
  const user = await requireRole(FINANCE_ROLES);
  const quotationId = formData.get("quotationId");
  if (typeof quotationId !== "string" || !quotationId) return;

  await sendPaymentReminder(quotationId, user.id);
  revalidatePath("/payments");
}
