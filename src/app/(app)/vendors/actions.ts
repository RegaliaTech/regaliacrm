"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";

const vendorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.coerce.boolean().default(true),
});

export type VendorFormState = { error?: string };

export async function saveVendor(
  _prev: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  await requireRole(WRITE_ROLES);

  const parsed = vendorSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const data = {
    name: d.name,
    contactName: d.contactName || null,
    email: d.email || null,
    phone: d.phone || null,
    address: d.address || null,
    notes: d.notes || null,
    isActive: d.isActive,
  };

  let vendorId = d.id;
  if (d.id) {
    await prisma.vendor.update({ where: { id: d.id }, data });
  } else {
    const created = await prisma.vendor.create({ data });
    vendorId = created.id;
  }

  revalidatePath("/vendors");
  redirect(`/vendors/${vendorId}`);
}

export async function deleteVendor(formData: FormData): Promise<void> {
  await requireRole(WRITE_ROLES);
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;
  await prisma.vendor.delete({ where: { id } }).catch(() => {});
  revalidatePath("/vendors");
  redirect("/vendors");
}

// ---------------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------------

const receiptSchema = z.object({
  vendorId: z.string().min(1),
  receiptNumber: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive(),
  currency: z.string().default("AED"),
  receiptDate: z.string().min(1, "Date is required"),
  fileUrl: z.string().optional(),
  notes: z.string().optional(),
});

export async function addReceipt(formData: FormData): Promise<void> {
  const user = await requireRole(WRITE_ROLES);
  const parsed = receiptSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  const d = parsed.data;

  await prisma.vendorReceipt.create({
    data: {
      vendorId: d.vendorId,
      receiptNumber: d.receiptNumber || null,
      description: d.description,
      amount: d.amount,
      currency: d.currency || "AED",
      receiptDate: new Date(d.receiptDate),
      fileUrl: d.fileUrl || null,
      notes: d.notes || null,
      createdById: user.id,
    },
  });

  revalidatePath(`/vendors/${d.vendorId}`);
}

export async function deleteReceipt(formData: FormData): Promise<void> {
  await requireRole(WRITE_ROLES);
  const id = formData.get("id");
  const vendorId = formData.get("vendorId");
  if (typeof id !== "string" || typeof vendorId !== "string") return;
  await prisma.vendorReceipt.delete({ where: { id } }).catch(() => {});
  revalidatePath(`/vendors/${vendorId}`);
}

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------

const stockSchema = z.object({
  vendorId: z.string().min(1),
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.coerce.number().int(),
  unit: z.string().default("pcs"),
  reorderLevel: z.coerce.number().int().optional(),
  notes: z.string().optional(),
});

export async function addStock(formData: FormData): Promise<void> {
  await requireRole(WRITE_ROLES);
  const parsed = stockSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  const d = parsed.data;

  await prisma.vendorStock.create({
    data: {
      vendorId: d.vendorId,
      itemName: d.itemName,
      quantity: d.quantity,
      unit: d.unit || "pcs",
      reorderLevel: d.reorderLevel ?? null,
      notes: d.notes || null,
      lastRestockedAt: new Date(),
    },
  });

  revalidatePath(`/vendors/${d.vendorId}`);
}

const adjustStockSchema = z.object({
  id: z.string().min(1),
  vendorId: z.string().min(1),
  delta: z.coerce.number().int(),
});

export async function adjustStock(formData: FormData): Promise<void> {
  await requireRole(WRITE_ROLES);
  const parsed = adjustStockSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  const d = parsed.data;

  await prisma.vendorStock.update({
    where: { id: d.id },
    data: {
      quantity: { increment: d.delta },
      lastRestockedAt: d.delta > 0 ? new Date() : undefined,
    },
  });

  revalidatePath(`/vendors/${d.vendorId}`);
}

export async function deleteStock(formData: FormData): Promise<void> {
  await requireRole(WRITE_ROLES);
  const id = formData.get("id");
  const vendorId = formData.get("vendorId");
  if (typeof id !== "string" || typeof vendorId !== "string") return;
  await prisma.vendorStock.delete({ where: { id } }).catch(() => {});
  revalidatePath(`/vendors/${vendorId}`);
}
