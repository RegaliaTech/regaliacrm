import { prisma } from "@/lib/db";
import { getAiClient } from "@/lib/ai";

/**
 * AI maintainer: scans the CRM for customers/quotations that have fallen
 * through the cracks (no follow-up scheduled) and auto-creates FollowUp
 * records to close the gap. It never sends anything itself — created
 * FollowUps flow through the existing /api/followups/worker send pipeline.
 */

export type MaintenanceActionKind =
  | "stale_customer"
  | "quotation_expiring"
  | "failed_retry";

export type MaintenanceAction = {
  kind: MaintenanceActionKind;
  customerId: string;
  quotationId?: string;
  /** Stable dedupe key stored on FollowUp.autoReason. */
  reason: string;
  caseSubject: string;
  context?: string;
  suggestedScheduledAt: Date;
};

const STALE_CUSTOMER_DAYS = 14;
const QUOTATION_EXPIRING_WITHIN_DAYS = 5;
const FAILED_RETRY_AFTER_HOURS = 24;
/** Don't re-create the same kind of action for a customer within this window. */
const COOLDOWN_DAYS = 3;
const MAX_ACTIONS_PER_RUN = 25;

/** Read-only scan — finds gaps but does not write anything. */
export async function findMaintenanceGaps(): Promise<MaintenanceAction[]> {
  const now = new Date();
  const actions: MaintenanceAction[] = [];

  // 1. Leads/active customers with no recent contact and nothing pending.
  const staleCutoff = new Date(now.getTime() - STALE_CUSTOMER_DAYS * 86_400_000);
  const staleCustomers = await prisma.customer.findMany({
    where: {
      status: { in: ["LEAD", "ACTIVE"] },
      email: { not: null },
      OR: [{ lastContactedAt: null }, { lastContactedAt: { lte: staleCutoff } }],
      followUps: { none: { status: "SCHEDULED" } },
    },
    select: { id: true, name: true, company: true },
    take: 50,
  });
  for (const c of staleCustomers) {
    actions.push({
      kind: "stale_customer",
      customerId: c.id,
      reason: `stale_customer:${STALE_CUSTOMER_DAYS}d`,
      caseSubject: `Re-engage ${c.name}${c.company ? ` (${c.company})` : ""}`,
      context: `This customer hasn't been contacted in over ${STALE_CUSTOMER_DAYS} days. Check in and offer help.`,
      suggestedScheduledAt: now,
    });
  }

  // 2. Quotations sent and expiring soon with no follow-up scheduled.
  const soon = new Date(
    now.getTime() + QUOTATION_EXPIRING_WITHIN_DAYS * 86_400_000,
  );
  const expiringQuotations = await prisma.quotation.findMany({
    where: {
      status: "SENT",
      validUntil: { gte: now, lte: soon },
      customer: { email: { not: null }, followUps: { none: { status: "SCHEDULED" } } },
    },
    select: {
      id: true,
      number: true,
      customerId: true,
      validUntil: true,
      customer: { select: { name: true } },
    },
    take: 50,
  });
  for (const q of expiringQuotations) {
    actions.push({
      kind: "quotation_expiring",
      customerId: q.customerId,
      quotationId: q.id,
      reason: `quotation_expiring:${q.id}`,
      caseSubject: `Quotation ${q.number} expiring soon — ${q.customer.name}`,
      context: `Quotation ${q.number} is valid until ${q.validUntil?.toDateString() ?? "soon"} and hasn't been accepted yet. Nudge the customer to decide.`,
      suggestedScheduledAt: now,
    });
  }

  // 3. Failed follow-ups that are stale with no retry scheduled yet.
  const failedCutoff = new Date(
    now.getTime() - FAILED_RETRY_AFTER_HOURS * 3600_000,
  );
  const failedFollowUps = await prisma.followUp.findMany({
    where: {
      status: "FAILED",
      updatedAt: { lte: failedCutoff },
      customer: { email: { not: null }, followUps: { none: { status: "SCHEDULED" } } },
    },
    select: {
      id: true,
      customerId: true,
      caseSubject: true,
      notes: true,
    },
    take: 50,
  });
  for (const f of failedFollowUps) {
    actions.push({
      kind: "failed_retry",
      customerId: f.customerId,
      reason: `failed_retry:${f.id}`,
      caseSubject: f.caseSubject,
      context: f.notes ?? undefined,
      suggestedScheduledAt: now,
    });
  }

  return actions;
}

export type MaintainerRunResult = {
  scanned: number;
  created: number;
  skipped: number;
  dryRun: boolean;
};

/**
 * Runs a full maintainer pass: finds gaps, dedupes against recently-created
 * auto follow-ups, and creates new SCHEDULED FollowUp records for the rest.
 */
export async function runMaintainer(options?: {
  dryRun?: boolean;
  requireReview?: boolean;
}): Promise<MaintainerRunResult> {
  const dryRun = options?.dryRun ?? false;
  const requireReview = options?.requireReview ?? false;

  const gaps = (await findMaintenanceGaps()).slice(0, MAX_ACTIONS_PER_RUN);
  const cooldownCutoff = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000);

  let created = 0;
  let skipped = 0;

  for (const gap of gaps) {
    const existing = await prisma.followUp.findFirst({
      where: {
        customerId: gap.customerId,
        autoReason: gap.reason,
        createdAt: { gte: cooldownCutoff },
      },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    if (dryRun) {
      created++;
      continue;
    }

    const customer = await prisma.customer.findUnique({
      where: { id: gap.customerId },
      select: { name: true, company: true, email: true },
    });
    if (!customer?.email) {
      skipped++;
      continue;
    }

    let emailSubject = gap.caseSubject;
    let emailBody: string | null = null;
    try {
      const draft = await getAiClient().draftEmail({
        purpose: gap.caseSubject,
        customerName: customer.name,
        company: customer.company ?? undefined,
        senderName: "Regalia CMS Team",
        tone: "friendly",
        context: gap.context,
      });
      emailSubject = draft.subject || emailSubject;
      emailBody = draft.body || null;
    } catch {
      // Leave emailBody null — the send worker falls back to a template
      // since useAi is true.
    }

    await prisma.followUp.create({
      data: {
        customerId: gap.customerId,
        caseSubject: gap.caseSubject,
        notes: `Auto-created by AI maintainer (${gap.kind}).`,
        emailSubject,
        emailBody,
        useAi: true,
        status: "SCHEDULED",
        scheduledAt: gap.suggestedScheduledAt,
        autoCreated: true,
        autoReason: gap.reason,
        reviewStatus: requireReview ? "PENDING_REVIEW" : "APPROVED",
      },
    });
    created++;
  }

  return { scanned: gaps.length, created, skipped, dryRun };
}
