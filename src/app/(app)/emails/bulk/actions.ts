"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { sendEmail } from "@/lib/mailer";
import { getAiClient } from "@/lib/ai";

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
