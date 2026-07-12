"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { sendEmail } from "@/lib/mailer";
import { getAiClient } from "@/lib/ai";
import { toCsv } from "@/lib/csv";

const bulkSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
  useAi: z.boolean().default(false),
  tone: z.enum(["friendly", "formal", "concise"]).optional(),
  customerIds: z.array(z.string()).min(1, "Select at least one recipient"),
});

export type BulkEmailFormState = { error?: string };

export async function createBulkEmailAction(
  _prev: BulkEmailFormState,
  formData: FormData,
): Promise<BulkEmailFormState> {
  const user = await requireRole(WRITE_ROLES);

  const parsed = bulkSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    useAi: formData.get("useAi") === "true",
    tone: formData.get("tone") || undefined,
    customerIds: formData.getAll("customerIds").map(String),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const d = parsed.data;
  let bulkId: string;

  try {
    const customers = await prisma.customer.findMany({
      where: { id: { in: d.customerIds }, email: { not: null } },
      select: { id: true, email: true },
    });

    // Dedupe by email address.
    const seen = new Set<string>();
    const recipients = customers
      .filter((c) => c.email && !seen.has(c.email) && seen.add(c.email))
      .map((c) => ({ customerId: c.id, toEmail: c.email as string }));

    if (recipients.length === 0) {
      return { error: "None of the selected customers have an email address." };
    }

    const bulk = await prisma.bulkEmail.create({
      data: {
        name: d.name,
        subject: d.subject,
        body: d.body,
        useAi: d.useAi,
        tone: d.tone ?? null,
        createdById: user.id,
        total: recipients.length,
        recipients: { create: recipients },
      },
    });
    bulkId = bulk.id;
    revalidatePath("/emails/bulk");
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create campaign",
    };
  }

  redirect(`/emails/bulk/${bulkId}`);
}

/** Send all pending recipients of a bulk email sequentially. */
export async function sendBulkEmailAction(
  bulkId: string,
): Promise<{ error?: string }> {
  const user = await requireRole(WRITE_ROLES);

  try {
    const bulk = await prisma.bulkEmail.findUnique({
      where: { id: bulkId },
      include: {
        recipients: {
          where: { status: "PENDING" },
          include: { customer: { select: { name: true, company: true } } },
        },
      },
    });

    if (!bulk) return { error: "Campaign not found" };
    if (bulk.recipients.length === 0) return { error: "No pending recipients" };

    await prisma.bulkEmail.update({
      where: { id: bulkId },
      data: { status: "SENDING" },
    });

    const aiClient = bulk.useAi ? getAiClient() : null;
    let sent = 0;
    let failed = 0;

    for (const rec of bulk.recipients) {
      let subject = bulk.subject;
      let body = bulk.body;

      try {
        if (aiClient) {
          const draft = await aiClient.draftEmail({
            purpose: bulk.subject,
            customerName: rec.customer?.name,
            company: rec.customer?.company ?? undefined,
            senderName: user.name ?? undefined,
            tone: (bulk.tone as "friendly" | "formal" | "concise") ?? "friendly",
            context: bulk.body,
          });
          subject = draft.subject || subject;
          body = draft.body || body;
        }

        await sendEmail({ to: rec.toEmail, subject, body });

        const log = await prisma.emailLog.create({
          data: {
            customerId: rec.customerId,
            senderId: user.id,
            bulkEmailId: bulkId,
            toEmail: rec.toEmail,
            subject,
            body,
            status: "SENT",
            aiGenerated: bulk.useAi,
            sentAt: new Date(),
          },
        });

        await prisma.bulkEmailRecipient.update({
          where: { id: rec.id },
          data: { status: "SENT", sentAt: new Date(), emailLogId: log.id, error: null },
        });
        if (rec.customerId) {
          await prisma.customer.update({
            where: { id: rec.customerId },
            data: { lastContactedAt: new Date() },
          });
        }
        sent++;
      } catch (error) {
        await prisma.bulkEmailRecipient.update({
          where: { id: rec.id },
          data: {
            status: "FAILED",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
        failed++;
      }
    }

    const remaining = await prisma.bulkEmailRecipient.count({
      where: { bulkEmailId: bulkId, status: "PENDING" },
    });

    await prisma.bulkEmail.update({
      where: { id: bulkId },
      data: {
        status: remaining > 0 ? "SENDING" : failed > 0 && sent === 0 ? "FAILED" : "SENT",
        sentCount: { increment: sent },
        failedCount: { increment: failed },
      },
    });

    revalidatePath(`/emails/bulk/${bulkId}`);
    revalidatePath("/emails/bulk");
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to send campaign",
    };
  }
}

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
  /** All customers that should be added to the recipient selection. */
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
 * Import CSV rows as Customer records (upsert by email), fill any provided
 * fields, and return the resulting customer options so the client can add
 * them to the campaign's recipient selection.
 *
 * "Based on availability" — every field except `email` is optional. When
 * updating an existing customer, only overwrite fields that are currently
 * empty so we don't clobber curated data.
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

  // Dedupe input by email up-front.
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

  if (parsed.length === 0) {
    return result;
  }

  // Preload existing customers by email in one query.
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
  const existingByEmail = new Map(existing.map((c) => [c.email!.toLowerCase(), c]));

  for (const row of parsed) {
    try {
      const prior = existingByEmail.get(row.email);
      if (prior) {
        // Only fill fields that are currently blank on the customer.
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
            // Fall back to the email's local-part when no name is supplied.
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
 * CSV export of all bulk campaigns. Returned as a string so the client can
 * trigger a download via a Blob URL — avoids a dedicated route handler.
 */
export async function exportBulkEmailsCsvAction(): Promise<{
  csv: string;
  filename: string;
}> {
  await requireRole(WRITE_ROLES);
  const rows = await prisma.bulkEmail.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      name: true,
      subject: true,
      status: true,
      total: true,
      sentCount: true,
      failedCount: true,
      useAi: true,
      createdAt: true,
    },
  });

  const header = [
    "Name",
    "Subject",
    "Status",
    "Recipients",
    "Sent",
    "Failed",
    "AI",
    "Created",
  ];
  const data = rows.map((r) => [
    r.name,
    r.subject,
    r.status,
    r.total,
    r.sentCount,
    r.failedCount,
    r.useAi ? "yes" : "no",
    r.createdAt.toISOString(),
  ]);
  const stamp = new Date().toISOString().slice(0, 10);
  return { csv: toCsv(header, data), filename: `bulk-campaigns-${stamp}.csv` };
}

export async function deleteBulkEmailAction(
  bulkId: string,
): Promise<{ error?: string }> {
  await requireRole(WRITE_ROLES);
  try {
    await prisma.bulkEmail.delete({ where: { id: bulkId } });
    revalidatePath("/emails/bulk");
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete campaign",
    };
  }
}
