"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, WRITE_ROLES, ADMIN_ROLES } from "@/lib/rbac";
import { sendEmail } from "@/lib/mailer";
import { getAiClient } from "@/lib/ai";
import { runMaintainer } from "@/lib/ai/maintainer";

const followUpSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  caseSubject: z.string().min(1, "Case subject is required"),
  notes: z.string().optional(),
  emailSubject: z.string().min(1, "Email subject is required"),
  emailBody: z.string().optional(),
  useAi: z.boolean().default(false),
  scheduledAt: z.string().min(1, "Scheduled date is required"),
});

export type FollowUpFormState = { error?: string };

export async function saveFollowUp(
  _prev: FollowUpFormState,
  formData: FormData,
): Promise<FollowUpFormState> {
  const user = await requireRole(WRITE_ROLES);

  const parsed = followUpSchema.safeParse({
    customerId: formData.get("customerId"),
    caseSubject: formData.get("caseSubject"),
    notes: formData.get("notes") || undefined,
    emailSubject: formData.get("emailSubject"),
    emailBody: formData.get("emailBody") || undefined,
    useAi: formData.get("useAi") === "true",
    scheduledAt: formData.get("scheduledAt"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const d = parsed.data;

  try {
    await prisma.followUp.create({
      data: {
        customerId: d.customerId,
        creatorId: user.id,
        caseSubject: d.caseSubject,
        notes: d.notes || null,
        emailSubject: d.emailSubject,
        emailBody: d.emailBody || null,
        useAi: d.useAi,
        scheduledAt: new Date(d.scheduledAt),
        status: "SCHEDULED",
      },
    });

    revalidatePath("/followups");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create follow-up" };
  }

  redirect("/followups");
}

export async function updateFollowUp(
  id: string,
  _prev: FollowUpFormState,
  formData: FormData,
): Promise<FollowUpFormState> {
  await requireRole(WRITE_ROLES);

  const parsed = followUpSchema.safeParse({
    customerId: formData.get("customerId"),
    caseSubject: formData.get("caseSubject"),
    notes: formData.get("notes") || undefined,
    emailSubject: formData.get("emailSubject"),
    emailBody: formData.get("emailBody") || undefined,
    useAi: formData.get("useAi") === "true",
    scheduledAt: formData.get("scheduledAt"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const d = parsed.data;

  try {
    await prisma.followUp.update({
      where: { id },
      data: {
        customerId: d.customerId,
        caseSubject: d.caseSubject,
        notes: d.notes || null,
        emailSubject: d.emailSubject,
        emailBody: d.emailBody || null,
        useAi: d.useAi,
        scheduledAt: new Date(d.scheduledAt),
      },
    });

    revalidatePath("/followups");
    revalidatePath(`/followups/${id}`);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update follow-up" };
  }

  redirect("/followups");
}

export async function cancelFollowUp(followUpId: string): Promise<{ error?: string }> {
  await requireRole(WRITE_ROLES);

  try {
    await prisma.followUp.update({
      where: { id: followUpId },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/followups");
    revalidatePath(`/followups/${followUpId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to cancel follow-up" };
  }
}

export async function deleteFollowUpAction(
  followUpId: string,
): Promise<{ error?: string }> {
  await requireRole(WRITE_ROLES);

  try {
    await prisma.followUp.delete({
      where: { id: followUpId },
    });

    revalidatePath("/followups");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to delete follow-up" };
  }
}

export async function approveFollowUp(followUpId: string): Promise<{ error?: string }> {
  await requireRole(WRITE_ROLES);

  try {
    await prisma.followUp.update({
      where: { id: followUpId },
      data: { reviewStatus: "APPROVED" },
    });

    revalidatePath("/followups");
    revalidatePath(`/followups/${followUpId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to approve follow-up" };
  }
}

export type MaintainerRunActionResult = {
  error?: string;
  scanned?: number;
  created?: number;
  skipped?: number;
};

/**
 * Manual trigger for the AI maintainer, independent of AI_MAINTAINER_ENABLED
 * (that flag only gates the automatic cron run). Admin-only since it's a
 * bulk action that creates follow-ups across every customer with a gap.
 */
export async function runMaintainerNowAction(): Promise<MaintainerRunActionResult> {
  await requireRole(ADMIN_ROLES);

  try {
    const requireReview = process.env.AI_MAINTAINER_REQUIRE_REVIEW === "true";
    const result = await runMaintainer({ requireReview });
    revalidatePath("/followups");
    return {
      scanned: result.scanned,
      created: result.created,
      skipped: result.skipped,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to run AI maintainer",
    };
  }
}

export async function sendFollowUpNow(followUpId: string): Promise<{ error?: string }> {
  const user = await requireRole(WRITE_ROLES);

  try {
    const followUp = await prisma.followUp.findUnique({
      where: { id: followUpId },
      include: {
        customer: true,
      },
    });

    if (!followUp) {
      return { error: "Follow-up not found" };
    }

    if (!followUp.customer.email) {
      return { error: "Customer email not found" };
    }

    // Get email content (use AI if enabled, otherwise use stored content)
    let emailSubject = followUp.emailSubject;
    let emailBody = followUp.emailBody || "";
    
    if (followUp.useAi) {
      try {
        const aiClient = getAiClient();
        const draft = await aiClient.draftEmail({
          purpose: followUp.caseSubject,
          customerName: followUp.customer.name,
          company: followUp.customer.company || undefined,
          senderName: "Regalia CRM Team",
          tone: "friendly",
          context: followUp.notes || undefined,
        });
        
        // Use AI-generated content, or fall back to existing
        emailSubject = draft.subject || emailSubject;
        emailBody = draft.body || emailBody;
      } catch (aiError) {
        console.error("AI generation failed, using fallback:", aiError);
        // Fall back to template if AI fails
        if (!emailBody) {
          emailBody = `Dear ${followUp.customer.name},\n\nThis is a follow-up regarding: ${followUp.caseSubject}\n\n${followUp.notes || ""}\n\nBest regards,\nRegalia CRM Team`;
        }
      }
    }

    if (!emailBody) {
      return { error: "Email body is required" };
    }

    // Send the email
    await sendEmail({
      to: followUp.customer.email,
      subject: emailSubject,
      body: emailBody,
    });

    // Update follow-up status
    await prisma.followUp.update({
      where: { id: followUpId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        error: null,
      },
    });

    // Log the email
    await prisma.emailLog.create({
      data: {
        customerId: followUp.customerId,
        senderId: user.id,
        toEmail: followUp.customer.email,
        subject: followUp.emailSubject,
        body: emailBody,
        status: "SENT",
        aiGenerated: followUp.useAi,
        sentAt: new Date(),
      },
    });

    revalidatePath("/followups");
    revalidatePath(`/followups/${followUpId}`);
    revalidatePath("/emails");
    return {};
  } catch (error) {
    // Update with error
    await prisma.followUp.update({
      where: { id: followUpId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return { error: error instanceof Error ? error.message : "Failed to send follow-up" };
  }
}
