import type {
  CustomerStatus,
  SequenceStatus,
  SequenceStepStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";

export type SequenceStepView = {
  id: string;
  stepOrder: number;
  delayDays: number;
  status: SequenceStepStatus;
  scheduledAt: Date;
  sentAt: Date | null;
  emailSubject: string | null;
  error: string | null;
};

export type SequenceListItem = {
  id: string;
  name: string;
  caseSubject: string;
  status: SequenceStatus;
  customerName: string;
  customerEmail: string | null;
  stepCount: number;
  sentSteps: number;
  createdAt: Date;
};

export type SequenceView = {
  id: string;
  name: string;
  caseSubject: string;
  notes: string | null;
  useAi: boolean;
  tone: string;
  stopOnReply: boolean;
  status: SequenceStatus;
  startedAt: Date;
  createdAt: Date;
  customer: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
    lastRepliedAt: Date | null;
  };
  steps: SequenceStepView[];
};

export type SequenceStepInput = { delayDays: number };

export async function createSequence(input: {
  name: string;
  customerId: string;
  caseSubject: string;
  notes?: string | null;
  useAi: boolean;
  tone: string;
  stopOnReply: boolean;
  steps: SequenceStepInput[];
  createdById?: string | null;
}): Promise<string> {
  const now = new Date();
  const sequence = await prisma.followUpSequence.create({
    data: {
      name: input.name,
      customerId: input.customerId,
      caseSubject: input.caseSubject,
      notes: input.notes ?? null,
      useAi: input.useAi,
      tone: input.tone,
      stopOnReply: input.stopOnReply,
      createdById: input.createdById ?? null,
      startedAt: now,
      steps: {
        create: input.steps.map((step, index) => ({
          stepOrder: index + 1,
          delayDays: step.delayDays,
          scheduledAt: addDays(now, step.delayDays),
        })),
      },
    },
  });
  return sequence.id;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function listSequences(): Promise<SequenceListItem[]> {
  const res = await safeQuery(async () => {
    const rows = await prisma.followUpSequence.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true, email: true } },
        steps: { select: { status: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      caseSubject: r.caseSubject,
      status: r.status,
      customerName: r.customer.name,
      customerEmail: r.customer.email,
      stepCount: r.steps.length,
      sentSteps: r.steps.filter((s) => s.status === "SENT").length,
      createdAt: r.createdAt,
    }));
  }, []);
  return res.data;
}

export async function getSequence(id: string): Promise<SequenceView | null> {
  const res = await safeQuery(async () => {
    const row = await prisma.followUpSequence.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
            lastRepliedAt: true,
          },
        },
        steps: { orderBy: { stepOrder: "asc" } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      caseSubject: row.caseSubject,
      notes: row.notes,
      useAi: row.useAi,
      tone: row.tone,
      stopOnReply: row.stopOnReply,
      status: row.status,
      startedAt: row.startedAt,
      createdAt: row.createdAt,
      customer: row.customer,
      steps: row.steps.map((s) => ({
        id: s.id,
        stepOrder: s.stepOrder,
        delayDays: s.delayDays,
        status: s.status,
        scheduledAt: s.scheduledAt,
        sentAt: s.sentAt,
        emailSubject: s.emailSubject,
        error: s.error,
      })),
    };
  }, null);
  return res.data;
}

export async function stopSequence(id: string): Promise<void> {
  await prisma.followUpSequence.update({
    where: { id },
    data: { status: "STOPPED" },
  });
}

export type DueSequenceStep = {
  stepId: string;
  stepOrder: number;
  sequenceId: string;
  caseSubject: string;
  notes: string | null;
  useAi: boolean;
  tone: string;
  stopOnReply: boolean;
  startedAt: Date;
  createdById: string | null;
  customer: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
    status: CustomerStatus;
    lastContactedAt: Date | null;
    lastRepliedAt: Date | null;
  };
  priorityScore: number;
  /** Prior emails already sent for this sequence, oldest first. */
  priorEmails: Array<{ subject: string; body: string }>;
};

/**
 * Returns due sequence steps (parent ACTIVE, scheduled in the past), enriched
 * with priority score and prior thread, ordered highest priority first.
 */
export async function getDueSequenceSteps(limit = 50): Promise<DueSequenceStep[]> {
  const res = await safeQuery(async () => {
    const steps = await prisma.followUpSequenceStep.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: new Date() },
        sequence: { status: "ACTIVE" },
      },
      orderBy: { scheduledAt: "asc" },
      include: {
        sequence: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                company: true,
                email: true,
                status: true,
                lastContactedAt: true,
                lastRepliedAt: true,
                quotations: {
                  where: { status: { in: ["DRAFT", "SENT"] } },
                  select: { total: true },
                },
              },
            },
            emails: {
              orderBy: { createdAt: "asc" },
              select: { subject: true, body: true },
            },
          },
        },
      },
    });

    const mapped: DueSequenceStep[] = steps.map((step) => {
      const customer = step.sequence.customer;
      const openTotal = customer.quotations.reduce(
        (sum, q) => sum + Number(q.total),
        0,
      );
      return {
        stepId: step.id,
        stepOrder: step.stepOrder,
        sequenceId: step.sequenceId,
        caseSubject: step.sequence.caseSubject,
        notes: step.sequence.notes,
        useAi: step.sequence.useAi,
        tone: step.sequence.tone,
        stopOnReply: step.sequence.stopOnReply,
        startedAt: step.sequence.startedAt,
        createdById: step.sequence.createdById,
        customer: {
          id: customer.id,
          name: customer.name,
          company: customer.company,
          email: customer.email,
          status: customer.status,
          lastContactedAt: customer.lastContactedAt,
          lastRepliedAt: customer.lastRepliedAt,
        },
        priorityScore: scoreCustomer({
          status: customer.status,
          lastContactedAt: customer.lastContactedAt,
          openQuotationTotal: openTotal,
        }),
        priorEmails: step.sequence.emails.map((e) => ({
          subject: e.subject,
          body: e.body,
        })),
      };
    });

    mapped.sort((a, b) => b.priorityScore - a.priorityScore);
    return mapped.slice(0, limit);
  }, []);
  return res.data;
}

/** Status weight used in priority scoring (LEAD/ACTIVE chased harder). */
function statusWeight(status: CustomerStatus): number {
  switch (status) {
    case "LEAD":
      return 40;
    case "ACTIVE":
      return 30;
    case "INACTIVE":
      return 10;
    case "CHURNED":
      return 0;
  }
}

/**
 * Priority score for a non-replier. Higher = chase sooner.
 *   days since last contact (capped) + customer status weight + open quote value bucket
 */
export function scoreCustomer(input: {
  status: CustomerStatus;
  lastContactedAt: Date | null;
  openQuotationTotal: number;
}): number {
  const now = Date.now();
  const days = input.lastContactedAt
    ? Math.min(60, Math.floor((now - input.lastContactedAt.getTime()) / 86_400_000))
    : 30;
  const valueBucket = Math.min(30, Math.floor(input.openQuotationTotal / 1000));
  return days + statusWeight(input.status) + valueBucket;
}
