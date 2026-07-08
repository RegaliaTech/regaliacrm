import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";

export type NotificationType =
  | "followup_overdue"
  | "followup_failed"
  | "email_failed"
  | "quotation_expiring"
  | "bulk_failed"
  | "maintainer_pending_review";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  severity: "warning" | "danger";
  title: string;
  message: string;
  href: string;
  createdAt: Date;
};

const BULK_MAIL_ROLES: Role[] = ["ADMIN", "SALES", "ACCOUNTS"];

export async function getNotifications(
  role: Role,
): Promise<NotificationItem[]> {
  const now = new Date();
  const soon = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const [
    overdueFollowUps,
    failedFollowUps,
    failedEmails,
    expiringQuotations,
    failedBulkEmails,
    pendingReviewFollowUps,
  ] = await Promise.all([
      safeQuery(
        () =>
          prisma.followUp.findMany({
            where: { status: "SCHEDULED", scheduledAt: { lte: now } },
            include: { customer: { select: { name: true } } },
            orderBy: { scheduledAt: "asc" },
            take: 5,
          }),
        [],
      ),
      safeQuery(
        () =>
          prisma.followUp.findMany({
            where: { status: "FAILED" },
            include: { customer: { select: { name: true } } },
            orderBy: { updatedAt: "desc" },
            take: 5,
          }),
        [],
      ),
      safeQuery(
        () =>
          prisma.emailLog.findMany({
            where: { status: "FAILED" },
            include: { customer: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
        [],
      ),
      safeQuery(
        () =>
          prisma.quotation.findMany({
            where: {
              status: "SENT",
              validUntil: { gte: now, lte: soon },
            },
            include: { customer: { select: { name: true } } },
            orderBy: { validUntil: "asc" },
            take: 5,
          }),
        [],
      ),
      BULK_MAIL_ROLES.includes(role)
        ? safeQuery(
            () =>
              prisma.bulkEmail.findMany({
                where: { failedCount: { gt: 0 } },
                orderBy: { updatedAt: "desc" },
                take: 5,
              }),
            [],
          )
        : Promise.resolve({ data: [], ok: true }),
      safeQuery(
        () =>
          prisma.followUp.findMany({
            where: { autoCreated: true, reviewStatus: "PENDING_REVIEW" },
            include: { customer: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
        [],
      ),
    ]);

  const items: NotificationItem[] = [
    ...overdueFollowUps.data.map((f) => ({
      id: `followup_overdue:${f.id}`,
      type: "followup_overdue" as const,
      severity: "warning" as const,
      title: "Follow-up overdue",
      message: `${f.caseSubject} — ${f.customer.name}`,
      href: "/followups",
      createdAt: f.scheduledAt,
    })),
    ...failedFollowUps.data.map((f) => ({
      id: `followup_failed:${f.id}`,
      type: "followup_failed" as const,
      severity: "danger" as const,
      title: "Follow-up failed to send",
      message: `${f.caseSubject} — ${f.customer.name}`,
      href: "/followups",
      createdAt: f.updatedAt,
    })),
    ...failedEmails.data.map((e) => ({
      id: `email_failed:${e.id}`,
      type: "email_failed" as const,
      severity: "danger" as const,
      title: "Email failed to send",
      message: `${e.subject}${e.customer ? ` — ${e.customer.name}` : ""}`,
      href: "/emails",
      createdAt: e.createdAt,
    })),
    ...expiringQuotations.data.map((q) => ({
      id: `quotation_expiring:${q.id}`,
      type: "quotation_expiring" as const,
      severity: "warning" as const,
      title: "Quotation expiring soon",
      message: `#${q.number} — ${q.customer.name}`,
      href: "/quotations",
      createdAt: q.validUntil ?? q.updatedAt,
    })),
    ...failedBulkEmails.data.map((b) => ({
      id: `bulk_failed:${b.id}`,
      type: "bulk_failed" as const,
      severity: "danger" as const,
      title: "Bulk campaign had failures",
      message: `${b.name} — ${b.failedCount} failed`,
      href: "/emails/bulk",
      createdAt: b.updatedAt,
    })),
    ...pendingReviewFollowUps.data.map((f) => ({
      id: `maintainer_pending_review:${f.id}`,
      type: "maintainer_pending_review" as const,
      severity: "warning" as const,
      title: "AI-created follow-up awaiting review",
      message: `${f.caseSubject} — ${f.customer.name}`,
      href: "/followups",
      createdAt: f.createdAt,
    })),
  ];

  return items
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20);
}
