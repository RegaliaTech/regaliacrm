"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { WRITE_ROLES } from "@/lib/rbac";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  company: z.string().trim().optional(),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  website: z.string().trim().optional(),
  address: z.string().trim().optional(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE", "CHURNED"]).default("LEAD"),
  tags: z.string().trim().optional(),
});

export type CustomerFormState = { error?: string };

export async function saveCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const user = await requireRole(WRITE_ROLES);

  const parsed = customerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const d = parsed.data;
  const tags = (d.tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  let customerId: string;

  try {
    const created = await prisma.customer.create({
      data: {
        name: d.name,
        company: d.company || null,
        email: d.email || null,
        phone: d.phone || null,
        website: d.website || null,
        address: d.address || null,
        status: d.status,
        tags,
        ownerId: user.id === "preview-user" ? null : user.id,
      },
    });
    customerId = created.id;
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to save customer",
    };
  }

  revalidatePath("/customers");
  revalidatePath("/dashboard");

  const intent = formData.get("intent");
  if (intent === "create-and-quote") {
    redirect(`/quotations/new?customerId=${customerId}&status=SENT`);
  }

  redirect("/customers");
}

export async function convertLeadToCustomerAndQuote(
  formData: FormData,
): Promise<void> {
  const user = await requireRole(WRITE_ROLES);

  const id = formData.get("id");
  const name = String(formData.get("name") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();

  const tags = tagsRaw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  let customerId: string | null = null;

  if (typeof id === "string" && id) {
    try {
      const updated = await prisma.customer.update({
        where: { id },
        data: { status: "ACTIVE" },
        select: { id: true },
      });
      customerId = updated.id;
    } catch {
      // Fall through and try create if this was a mock customer.
    }
  }

  if (!customerId) {
    try {
      const created = await prisma.customer.create({
        data: {
          name: name || "Converted Lead",
          company: company || null,
          email: email || null,
          phone: phone || null,
          website: website || null,
          address: address || null,
          status: "ACTIVE",
          tags,
          ownerId: user.id === "preview-user" ? null : user.id,
        },
        select: { id: true },
      });
      customerId = created.id;
    } catch {
      // In preview/offline mode the customers list may come from mock data.
      // Reuse that lead id so the quotation form can still be prefilled.
      if (typeof id === "string" && id) {
        customerId = id;
      } else {
        redirect("/customers?tab=lead");
      }
    }
  }

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  revalidatePath("/quotations");
  redirect(`/quotations/new?customerId=${customerId}&status=SENT`);
}
