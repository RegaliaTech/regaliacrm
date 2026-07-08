"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { sendEmail } from "@/lib/mailer";
import { getAiClient } from "@/lib/ai";
import { markEmailReplied } from "@/lib/emails";

const emailSchema = z.object({
  customerId: z.string().optional(),
  quotationId: z.string().optional(),
  toEmail: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
  aiGenerated: z.boolean().default(false),
});

export type EmailFormState = { error?: string };

export type GenerateEmailResult = {
  subject?: string;
  body?: string;
  error?: string;
};

/** Generate an email subject + body from a freeform prompt using AI. */
export async function generateEmailDraft(input: {
  purpose: string;
  tone?: "friendly" | "formal" | "concise";
  customerId?: string;
  quotationId?: string;
}): Promise<GenerateEmailResult> {
  const user = await requireRole(WRITE_ROLES);

  const purpose = input.purpose?.trim();
  if (!purpose) {
    return { error: "Please describe what the email should say." };
  }

  let customerName: string | undefined;
  let company: string | undefined;
  let context: string | undefined;

  try {
    if (input.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: input.customerId },
        select: { name: true, company: true },
      });
      customerName = customer?.name ?? undefined;
      company = customer?.company ?? undefined;
    }

    if (input.quotationId) {
      const quotation = await prisma.quotation.findUnique({
        where: { id: input.quotationId },
        select: { number: true, total: true, currency: true },
      });
      if (quotation) {
        context = `This email relates to quotation ${quotation.number} (total ${quotation.currency} ${quotation.total}).`;
      }
    }
  } catch {
    // Database may be unavailable in preview; continue without extra context.
  }

  try {
    const aiClient = getAiClient();
    const draft = await aiClient.draftEmail({
      purpose,
      tone: input.tone,
      customerName,
      company,
      senderName: user.name ?? undefined,
      context,
    });
    return { subject: draft.subject, body: draft.body };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to generate email",
    };
  }
}

export async function saveEmail(
  _prev: EmailFormState,
  formData: FormData,
): Promise<EmailFormState> {
  const user = await requireRole(WRITE_ROLES);

  const action = formData.get("action");
  const isDraft = action === "draft";

  const parsed = emailSchema.safeParse({
    customerId: formData.get("customerId") || undefined,
    quotationId: formData.get("quotationId") || undefined,
    toEmail: formData.get("toEmail"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    aiGenerated: formData.get("aiGenerated") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const d = parsed.data;

  try {
    if (!isDraft) {
      // Send the email first
      await sendEmail({
        to: d.toEmail,
        subject: d.subject,
        body: d.body,
      });
    }

    // Log the email
    await prisma.emailLog.create({
      data: {
        customerId: d.customerId || null,
        quotationId: d.quotationId || null,
        senderId: user.id,
        toEmail: d.toEmail,
        subject: d.subject,
        body: d.body,
        status: isDraft ? "DRAFT" : "SENT",
        aiGenerated: d.aiGenerated,
        sentAt: isDraft ? null : new Date(),
      },
    });

    revalidatePath("/emails");
  } catch (error) {
    // Log failed email
    await prisma.emailLog.create({
      data: {
        customerId: d.customerId || null,
        quotationId: d.quotationId || null,
        senderId: user.id,
        toEmail: d.toEmail,
        subject: d.subject,
        body: d.body,
        status: "FAILED",
        aiGenerated: d.aiGenerated,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return { error: error instanceof Error ? error.message : "Failed to send email" };
  }

  redirect("/emails");
}

// Legacy functions kept for backwards compatibility
export async function composeAndSendEmail(
  _prev: EmailFormState,
  formData: FormData,
): Promise<EmailFormState> {
  const user = await requireRole(WRITE_ROLES);

  const parsed = emailSchema.safeParse({
    customerId: formData.get("customerId") || undefined,
    quotationId: formData.get("quotationId") || undefined,
    toEmail: formData.get("toEmail"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    aiGenerated: formData.get("aiGenerated") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const d = parsed.data;

  try {
    // Send the email first
    await sendEmail({
      to: d.toEmail,
      subject: d.subject,
      body: d.body,
    });

    // Log the email
    await prisma.emailLog.create({
      data: {
        customerId: d.customerId || null,
        quotationId: d.quotationId || null,
        senderId: user.id,
        toEmail: d.toEmail,
        subject: d.subject,
        body: d.body,
        status: "SENT",
        aiGenerated: d.aiGenerated,
        sentAt: new Date(),
      },
    });

    revalidatePath("/emails");
  } catch (error) {
    // Log failed email
    await prisma.emailLog.create({
      data: {
        customerId: d.customerId || null,
        quotationId: d.quotationId || null,
        senderId: user.id,
        toEmail: d.toEmail,
        subject: d.subject,
        body: d.body,
        status: "FAILED",
        aiGenerated: d.aiGenerated,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return { error: error instanceof Error ? error.message : "Failed to send email" };
  }

  redirect("/emails");
}

export async function saveDraftEmail(
  _prev: EmailFormState,
  formData: FormData,
): Promise<EmailFormState> {
  const user = await requireRole(WRITE_ROLES);

  const parsed = emailSchema.safeParse({
    customerId: formData.get("customerId") || undefined,
    quotationId: formData.get("quotationId") || undefined,
    toEmail: formData.get("toEmail"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    aiGenerated: formData.get("aiGenerated") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const d = parsed.data;

  try {
    await prisma.emailLog.create({
      data: {
        customerId: d.customerId || null,
        quotationId: d.quotationId || null,
        senderId: user.id,
        toEmail: d.toEmail,
        subject: d.subject,
        body: d.body,
        status: "DRAFT",
        aiGenerated: d.aiGenerated,
      },
    });

    revalidatePath("/emails");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save draft" };
  }

  redirect("/emails");
}

export async function deleteEmailAction(
  emailId: string,
): Promise<{ error?: string }> {
  await requireRole(WRITE_ROLES);

  try {
    await prisma.emailLog.delete({
      where: { id: emailId },
    });

    revalidatePath("/emails");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to delete email" };
  }
}

export async function resendEmail(emailId: string): Promise<{ error?: string }> {
  const user = await requireRole(WRITE_ROLES);

  try {
    const email = await prisma.emailLog.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      return { error: "Email not found" };
    }

    // Send the email
    await sendEmail({
      to: email.toEmail,
      subject: email.subject,
      body: email.body,
    });

    // Update status
    await prisma.emailLog.update({
      where: { id: emailId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        error: null,
      },
    });

    revalidatePath("/emails");
    revalidatePath(`/emails/${emailId}`);
    return {};
  } catch (error) {
    // Update with error
    await prisma.emailLog.update({
      where: { id: emailId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return { error: error instanceof Error ? error.message : "Failed to resend email" };
  }
}

/**
 * Record that the customer replied to this email. Stops any active AI
 * follow-up sequences for the customer so we stop chasing them.
 */
export async function markRepliedAction(
  emailId: string,
): Promise<{ error?: string }> {
  await requireRole(WRITE_ROLES);

  try {
    await markEmailReplied(emailId);
    revalidatePath("/emails");
    revalidatePath(`/emails/${emailId}`);
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to mark as replied",
    };
  }
}
