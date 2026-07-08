import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mailer";
import { getAiClient } from "@/lib/ai";
import { getDueFollowUps } from "@/lib/followups";
import { getDueSequenceSteps } from "@/lib/sequences";

/**
 * Background worker to process scheduled follow-ups.
 * 
 * This endpoint should be called by a cron job (e.g., every hour).
 * You can use:
 * - Vercel Cron (vercel.json)
 * - External cron service (cron-job.org, EasyCron, etc.)
 * - Server cron job
 * 
 * Protect with a secret token in production.
 */
export async function GET(req: NextRequest) {
  try {
    // Basic auth with secret token
    const expectedToken = process.env.CRON_SECRET;
    if (!expectedToken) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured" },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Follow-up Worker] Starting processing...");

    // Get all due follow-ups
    const dueFollowUps = await getDueFollowUps();

    console.log(`[Follow-up Worker] Found ${dueFollowUps.length} due follow-ups`);

    let sent = 0;
    let failed = 0;

    for (const followUp of dueFollowUps) {
      try {
        if (!followUp.customer.email) {
          console.error(`[Follow-up Worker] No email for customer ${followUp.customer.id}`);
          await prisma.followUp.update({
            where: { id: followUp.id },
            data: {
              status: "FAILED",
              error: "Customer email not found",
            },
          });
          failed++;
          continue;
        }

        // Get email content
        let emailSubject = followUp.emailSubject;
        let emailBody = followUp.emailBody || "";
        
        if (followUp.useAi) {
          try {
            const aiClient = getAiClient();
            const draft = await aiClient.draftEmail({
              purpose: followUp.caseSubject,
              customerName: followUp.customer.name,
              company: followUp.customer.company || undefined,
              senderName: "Regalia CMS Team",
              tone: "friendly",
              context: followUp.notes || undefined,
            });
            
            emailSubject = draft.subject || emailSubject;
            emailBody = draft.body || emailBody;
          } catch (aiError) {
            console.error(`[Follow-up Worker] AI generation failed for ${followUp.id}:`, aiError);
            // Use fallback template
            if (!emailBody) {
              emailBody = `Dear ${followUp.customer.name},\n\nThis is a follow-up regarding: ${followUp.caseSubject}\n\n${followUp.notes || ""}\n\nBest regards,\nRegalia CMS Team`;
            }
          }
        }

        if (!emailBody) {
          await prisma.followUp.update({
            where: { id: followUp.id },
            data: {
              status: "FAILED",
              error: "Email body is required",
            },
          });
          failed++;
          continue;
        }

        // Send the email
        await sendEmail({
          to: followUp.customer.email,
          subject: emailSubject,
          body: emailBody,
        });

        // Update follow-up status
        await prisma.followUp.update({
          where: { id: followUp.id },
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
            senderId: followUp.creatorId,
            toEmail: followUp.customer.email,
            subject: emailSubject,
            body: emailBody,
            status: "SENT",
            aiGenerated: followUp.useAi,
            sentAt: new Date(),
          },
        });

        console.log(`[Follow-up Worker] Sent follow-up ${followUp.id} to ${followUp.customer.email}`);
        sent++;
      } catch (error) {
        console.error(`[Follow-up Worker] Failed to send follow-up ${followUp.id}:`, error);
        
        // Update with error
        await prisma.followUp.update({
          where: { id: followUp.id },
          data: {
            status: "FAILED",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
        
        failed++;
      }
    }

    console.log(`[Follow-up Worker] Completed: ${sent} sent, ${failed} failed`);

    // ---------------------------------------------------------------------
    // AI follow-up sequences (multi-step, stop-on-reply, prioritised)
    // ---------------------------------------------------------------------
    const dueSteps = await getDueSequenceSteps(50);
    let seqSent = 0;
    let seqSkipped = 0;
    let seqFailed = 0;

    for (const step of dueSteps) {
      try {
        // Stop-on-reply: if the customer replied after the sequence started,
        // skip this step and mark the whole sequence STOPPED.
        if (
          step.stopOnReply &&
          step.customer.lastRepliedAt &&
          step.customer.lastRepliedAt >= step.startedAt
        ) {
          await prisma.followUpSequenceStep.update({
            where: { id: step.stepId },
            data: { status: "SKIPPED" },
          });
          await prisma.followUpSequence.update({
            where: { id: step.sequenceId },
            data: { status: "STOPPED" },
          });
          seqSkipped++;
          continue;
        }

        if (!step.customer.email) {
          await prisma.followUpSequenceStep.update({
            where: { id: step.stepId },
            data: { status: "FAILED", error: "Customer email not found" },
          });
          seqFailed++;
          continue;
        }

        let subject = `Following up: ${step.caseSubject}`;
        let body = "";

        if (step.useAi) {
          try {
            const draft = await getAiClient().draftEmail({
              purpose: step.caseSubject,
              customerName: step.customer.name,
              company: step.customer.company || undefined,
              senderName: "Regalia CMS Team",
              tone: step.tone as "friendly" | "formal" | "concise",
              context: step.notes || undefined,
              priorEmails: step.priorEmails,
              escalationLevel: step.stepOrder - 1,
            });
            subject = draft.subject || subject;
            body = draft.body || body;
          } catch (aiError) {
            console.error(
              `[Sequence Worker] AI generation failed for step ${step.stepId}:`,
              aiError,
            );
          }
        }

        if (!body) {
          body = `Dear ${step.customer.name},\n\nI wanted to follow up regarding: ${step.caseSubject}.\n\n${step.notes || ""}\n\nBest regards,\nRegalia CMS Team`;
        }

        await sendEmail({ to: step.customer.email, subject, body });

        await prisma.emailLog.create({
          data: {
            customerId: step.customer.id,
            senderId: step.createdById,
            sequenceId: step.sequenceId,
            sequenceStepId: step.stepId,
            toEmail: step.customer.email,
            subject,
            body,
            status: "SENT",
            aiGenerated: step.useAi,
            priorityScore: step.priorityScore,
            sentAt: new Date(),
          },
        });

        await prisma.followUpSequenceStep.update({
          where: { id: step.stepId },
          data: {
            status: "SENT",
            sentAt: new Date(),
            emailSubject: subject,
            emailBody: body,
            error: null,
          },
        });

        await prisma.customer.update({
          where: { id: step.customer.id },
          data: { lastContactedAt: new Date() },
        });

        // If this was the last scheduled step, complete the sequence.
        const remaining = await prisma.followUpSequenceStep.count({
          where: { sequenceId: step.sequenceId, status: "SCHEDULED" },
        });
        if (remaining === 0) {
          await prisma.followUpSequence.update({
            where: { id: step.sequenceId },
            data: { status: "COMPLETED" },
          });
        }

        seqSent++;
      } catch (error) {
        console.error(
          `[Sequence Worker] Failed to send step ${step.stepId}:`,
          error,
        );
        await prisma.followUpSequenceStep.update({
          where: { id: step.stepId },
          data: {
            status: "FAILED",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
        seqFailed++;
      }
    }

    console.log(
      `[Sequence Worker] Completed: ${seqSent} sent, ${seqSkipped} skipped, ${seqFailed} failed`,
    );

    return NextResponse.json({
      success: true,
      processed: dueFollowUps.length,
      sent,
      failed,
      sequences: {
        processed: dueSteps.length,
        sent: seqSent,
        skipped: seqSkipped,
        failed: seqFailed,
      },
    });
  } catch (error) {
    console.error("[Follow-up Worker] Fatal error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
