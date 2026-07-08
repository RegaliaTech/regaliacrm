"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { calculateTotals } from "@/lib/quotations";

const quotationItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be > 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be ≥ 0"),
});

const quotationSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().min(1, "Customer is required"),
  status: z
    .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"])
    .default("DRAFT"),
  currency: z.string().default("AED"),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  discountRate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  validUntil: z.string().optional(),
  items: z.array(quotationItemSchema).min(1, "At least one item is required"),
});

export type QuotationFormState = { error?: string };

function parseJson<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (typeof raw !== "string" || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function generateQuotationNumber(): string {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `Q-${timestamp}${random}`;
}

export async function saveQuotation(
  _prev: QuotationFormState,
  formData: FormData
): Promise<QuotationFormState> {
  await requireRole(WRITE_ROLES);

  const itemsData = parseJson<z.infer<typeof quotationItemSchema>[]>(
    formData.get("items"),
    []
  );

  const parsed = quotationSchema.safeParse({
    id: formData.get("id"),
    customerId: formData.get("customerId"),
    status: formData.get("status"),
    currency: formData.get("currency"),
    taxRate: formData.get("taxRate"),
    discountRate: formData.get("discountRate"),
    notes: formData.get("notes"),
    validUntil: formData.get("validUntil"),
    items: itemsData,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const d = parsed.data;

  // Calculate totals
  const totals = calculateTotals(d.items, d.taxRate, d.discountRate);

  try {
    let quotationId = d.id;

    if (d.id) {
      // Update existing quotation
      await prisma.quotation.update({
        where: { id: d.id },
        data: {
          customerId: d.customerId,
          status: d.status,
          currency: d.currency,
          taxRate: d.taxRate,
          discountRate: d.discountRate,
          notes: d.notes || null,
          validUntil: d.validUntil ? new Date(d.validUntil) : null,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
        },
      });

      // Delete existing items and recreate
      await prisma.quotationItem.deleteMany({
        where: { quotationId: d.id },
      });

      await prisma.quotationItem.createMany({
        data: d.items.map((item, index) => ({
          quotationId: d.id!,
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
          position: index,
        })),
      });
    } else {
      // Create new quotation
      const created = await prisma.quotation.create({
        data: {
          number: generateQuotationNumber(),
          customerId: d.customerId,
          status: d.status,
          currency: d.currency,
          taxRate: d.taxRate,
          discountRate: d.discountRate,
          notes: d.notes || null,
          validUntil: d.validUntil ? new Date(d.validUntil) : null,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
          items: {
            create: d.items.map((item, index) => ({
              productId: item.productId || null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.quantity * item.unitPrice,
              position: index,
            })),
          },
        },
      });
      quotationId = created.id;
    }

    revalidatePath("/quotations");
    if (quotationId) revalidatePath(`/quotations/${quotationId}`);
    redirect(quotationId ? `/quotations/${quotationId}` : "/quotations");
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to save quotation",
    };
  }
}

export async function deleteQuotation(formData: FormData): Promise<void> {
  await requireRole(WRITE_ROLES);
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;
  try {
    await prisma.quotation.delete({ where: { id } });
  } catch {
    // ignore — DB may be offline in preview
  }
  revalidatePath("/quotations");
  redirect("/quotations");
}

export async function updateQuotationStatus(
  quotationId: string,
  newStatus: string
): Promise<QuotationFormState> {
  await requireRole(WRITE_ROLES);

  if (!["DRAFT", "SENT", "ACCEPTED", "REJECTED"].includes(newStatus)) {
    return { error: "Invalid status" };
  }

  try {
    await prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: newStatus as any,
        issuedAt: newStatus === "SENT" ? new Date() : undefined,
      },
    });
    revalidatePath("/quotations");
    revalidatePath(`/quotations/${quotationId}`);
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to update status",
    };
  }
}
