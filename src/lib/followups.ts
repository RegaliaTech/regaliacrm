import type { FollowUpStatus, FollowUpReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";

export type FollowUpView = {
  id: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
  };
  creatorId: string | null;
  creator: {
    id: string;
    name: string;
  } | null;
  caseSubject: string;
  notes: string | null;
  emailSubject: string;
  emailBody: string | null;
  useAi: boolean;
  status: FollowUpStatus;
  scheduledAt: Date;
  sentAt: Date | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  autoCreated: boolean;
  reviewStatus: FollowUpReviewStatus;
};

export type FollowUpListItem = {
  id: string;
  caseSubject: string;
  status: FollowUpStatus;
  scheduledAt: Date;
  sentAt: Date | null;
  createdAt: Date;
  customerName: string;
  customerEmail: string | null;
  useAi: boolean;
  autoCreated: boolean;
  reviewStatus: FollowUpReviewStatus;
};

export type FollowUpFilterOptions = {
  status?: FollowUpStatus;
  customerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

type PrismaFollowUpRow = Awaited<ReturnType<typeof fetchFollowUpRow>>;

function fetchFollowUpRow(id: string) {
  return prisma.followUp.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          company: true,
          email: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

function normalizeFollowUp(row: PrismaFollowUpRow): FollowUpView | null {
  if (!row) return null;
  return {
    id: row.id,
    customerId: row.customerId,
    customer: row.customer,
    creatorId: row.creatorId,
    creator: row.creator,
    caseSubject: row.caseSubject,
    notes: row.notes,
    emailSubject: row.emailSubject,
    emailBody: row.emailBody,
    useAi: row.useAi,
    status: row.status,
    scheduledAt: row.scheduledAt,
    sentAt: row.sentAt,
    error: row.error,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    autoCreated: row.autoCreated,
    reviewStatus: row.reviewStatus,
  };
}

export async function getFollowUp(id: string): Promise<FollowUpView | null> {
  const res = await safeQuery(async () => {
    const row = await fetchFollowUpRow(id);
    return normalizeFollowUp(row);
  }, null);
  return res.data;
}

export async function listFollowUps(
  filters?: FollowUpFilterOptions
): Promise<FollowUpListItem[]> {
  const res = await safeQuery(async () => {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.scheduledAt = {};
      if (filters.dateFrom) {
        where.scheduledAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.scheduledAt.lte = filters.dateTo;
      }
    }

    const followUps = await prisma.followUp.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return followUps.map((followUp) => ({
      id: followUp.id,
      caseSubject: followUp.caseSubject,
      status: followUp.status,
      scheduledAt: followUp.scheduledAt,
      sentAt: followUp.sentAt,
      createdAt: followUp.createdAt,
      customerName: followUp.customer.name,
      customerEmail: followUp.customer.email,
      useAi: followUp.useAi,
      autoCreated: followUp.autoCreated,
      reviewStatus: followUp.reviewStatus,
    }));
  }, []);
  return res.data;
}

export async function deleteFollowUp(id: string): Promise<void> {
  await prisma.followUp.delete({ where: { id } });
}

export async function getDueFollowUps(): Promise<FollowUpView[]> {
  const res = await safeQuery(async () => {
    const rows = await prisma.followUp.findMany({
      where: {
        status: "SCHEDULED",
        reviewStatus: "APPROVED",
        scheduledAt: {
          lte: new Date(),
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return rows.map((row) => normalizeFollowUp(row)!).filter(Boolean);
  }, []);
  return res.data;
}
