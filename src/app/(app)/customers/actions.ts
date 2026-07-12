"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { WRITE_ROLES } from "@/lib/rbac";
import { toCsv } from "@/lib/csv";

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

// ---------------------------------------------------------------------------
// CSV import / export
// ---------------------------------------------------------------------------

const csvRowSchema = z.object({
  email: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .refine((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), "Invalid email"),
  name: z.string().trim().optional(),
  company: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  website: z.string().trim().optional(),
});

export type ImportCustomerRow = z.infer<typeof csvRowSchema>;

export type ImportCustomersResult = {
  created: number;
  updated: number;
  skipped: number;
  invalid: number;
  customers: Array<{
    id: string;
    name: string;
    company: string | null;
    email: string;
    status: "LEAD" | "ACTIVE" | "INACTIVE" | "CHURNED";
    tags: string[];
  }>;
  errors: string[];
};

/**
 * Upsert Customer rows from a CSV. Email is required; every other field is
 * filled in based on availability. Existing customers keep any fields that
 * are already set — the import only fills blanks so curated data isn't
 * clobbered.
 */
export async function importCustomersFromCsvAction(
  rows: unknown[],
): Promise<ImportCustomersResult> {
  const user = await requireRole(WRITE_ROLES);

  const result: ImportCustomersResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    invalid: 0,
    customers: [],
    errors: [],
  };

  const seen = new Set<string>();
  const parsed: ImportCustomerRow[] = [];
  for (const raw of rows) {
    const p = csvRowSchema.safeParse(raw);
    if (!p.success) {
      result.invalid++;
      continue;
    }
    if (seen.has(p.data.email)) {
      result.skipped++;
      continue;
    }
    seen.add(p.data.email);
    parsed.push(p.data);
  }

  if (parsed.length === 0) return result;

  const existing = await prisma.customer.findMany({
    where: { email: { in: parsed.map((p) => p.email) } },
    select: {
      id: true,
      name: true,
      company: true,
      email: true,
      phone: true,
      address: true,
      website: true,
      status: true,
      tags: true,
    },
  });
  const existingByEmail = new Map(
    existing.map((c) => [c.email!.toLowerCase(), c]),
  );

  for (const row of parsed) {
    try {
      const prior = existingByEmail.get(row.email);
      if (prior) {
        const patch: Record<string, string> = {};
        if (!prior.name && row.name) patch.name = row.name;
        if (!prior.company && row.company) patch.company = row.company;
        if (!prior.phone && row.phone) patch.phone = row.phone;
        if (!prior.address && row.address) patch.address = row.address;
        if (!prior.website && row.website) patch.website = row.website;

        let updated = prior;
        if (Object.keys(patch).length > 0) {
          updated = await prisma.customer.update({
            where: { id: prior.id },
            data: patch,
            select: {
              id: true,
              name: true,
              company: true,
              email: true,
              phone: true,
              address: true,
              website: true,
              status: true,
              tags: true,
            },
          });
          result.updated++;
        } else {
          result.skipped++;
        }
        result.customers.push({
          id: updated.id,
          name: updated.name,
          company: updated.company,
          email: updated.email!,
          status: updated.status,
          tags: updated.tags,
        });
      } else {
        const created = await prisma.customer.create({
          data: {
            name: row.name || row.email.split("@")[0] || row.email,
            email: row.email,
            company: row.company || null,
            phone: row.phone || null,
            address: row.address || null,
            website: row.website || null,
            status: "LEAD",
            ownerId: user.id === "preview-user" ? null : user.id,
          },
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
            status: true,
            tags: true,
          },
        });
        result.created++;
        result.customers.push({
          id: created.id,
          name: created.name,
          company: created.company,
          email: created.email!,
          status: created.status,
          tags: created.tags,
        });
      }
    } catch (err) {
      result.errors.push(
        err instanceof Error ? err.message : "Unknown upsert error",
      );
    }
  }

  revalidatePath("/customers");
  return result;
}

/**
 * CSV export of all customers. Returns the CSV string so the client can
 * download via a Blob URL.
 */
export async function exportCustomersCsvAction(): Promise<{
  csv: string;
  filename: string;
}> {
  await requireRole(WRITE_ROLES);
  const rows = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      name: true,
      company: true,
      email: true,
      phone: true,
      address: true,
      website: true,
      status: true,
      tags: true,
      owner: { select: { name: true } },
      createdAt: true,
    },
  });

  const header = [
    "Name",
    "Company",
    "Email",
    "Phone",
    "Address",
    "Website",
    "Status",
    "Tags",
    "Owner",
    "Created",
  ];
  const data = rows.map((r) => [
    r.name,
    r.company ?? "",
    r.email ?? "",
    r.phone ?? "",
    r.address ?? "",
    r.website ?? "",
    r.status,
    r.tags.join("; "),
    r.owner?.name ?? "",
    r.createdAt.toISOString(),
  ]);
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    csv: toCsv(header, data),
    filename: `customers-${stamp}.csv`,
  };
}
