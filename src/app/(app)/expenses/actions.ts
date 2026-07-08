"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, FINANCE_ROLES } from "@/lib/rbac";

const expenseSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  category: z.enum([
    "RENT",
    "UTILITIES",
    "SALARIES",
    "MARKETING",
    "MAINTENANCE",
    "OTHER",
  ]),
  amount: z.coerce.number().min(0),
  currency: z.string().default("AED"),
  incurredAt: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

export type ExpenseFormState = { error?: string };

export async function saveExpense(
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const user = await requireRole(FINANCE_ROLES);

  const parsed = expenseSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const data = {
    title: d.title,
    category: d.category,
    amount: d.amount,
    currency: d.currency || "AED",
    incurredAt: new Date(d.incurredAt),
    notes: d.notes || null,
  };

  try {
    if (d.id) {
      await prisma.expense.update({ where: { id: d.id }, data });
    } else {
      await prisma.expense.create({
        data: {
          ...data,
          createdById: user.id === "preview-user" ? null : user.id,
        },
      });
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to save expense",
    };
  }

  revalidatePath("/expenses");
  redirect("/expenses");
}

export async function deleteExpense(formData: FormData): Promise<void> {
  await requireRole(FINANCE_ROLES);
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;
  try {
    await prisma.expense.delete({ where: { id } });
  } catch {
    // ignore — DB may be offline in preview
  }
  revalidatePath("/expenses");
  redirect("/expenses");
}
