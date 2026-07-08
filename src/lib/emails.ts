import type { EmailStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";

export type EmailView = {
  id: string;
  customerId: string | null;
  customer: {
    id: string;
    name: string;
    company: string | null;
  } | null;
  quotationId: string | null;
  quotation: {
    id: string;
    number: string;
  } | null;
  senderId: string | null;
  sender: {
    id: string;
    name: string;
  } | null;
  toEmail: string;
  subject: string;
  body: string;
  status: EmailStatus;
  aiGenerated: boolean;
  error: string | null;
  sentAt: Date | null;
  repliedAt: Date | null;
  createdAt: Date;
};

export type EmailListItem = {
  id: string;
  toEmail: string;
  subject: string;
  status: EmailStatus;
  sentAt: Date | null;
  createdAt: Date;
  customerName: string | null;
  quotationNumber: string | null;
};

export type EmailFilterOptions = {
  status?: EmailStatus;
  customerId?: string;
  quotationId?: string;
  search?: string;
};

type PrismaEmailRow = Awaited<ReturnType<typeof fetchEmailRow>>;

function fetchEmailRow(id: string) {
  return prisma.emailLog.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          company: true,
        },
      },
      quotation: {
        select: {
          id: true,
          number: true,
        },
      },
      sender: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

function normalizeEmail(row: PrismaEmailRow): EmailView | null {
  if (!row) return null;
  return {
    id: row.id,
    customerId: row.customerId,
    customer: row.customer,
    quotationId: row.quotationId,
    quotation: row.quotation,
    senderId: row.senderId,
    sender: row.sender,
    toEmail: row.toEmail,
    subject: row.subject,
    body: row.body,
    status: row.status,
    aiGenerated: row.aiGenerated,
    error: row.error,
    sentAt: row.sentAt,
    repliedAt: row.repliedAt,
    createdAt: row.createdAt,
  };
}

export async function getEmail(id: string): Promise<EmailView | null> {
  const res = await safeQuery(async () => {
    const row = await fetchEmailRow(id);
    return normalizeEmail(row);
  }, null);
  return res.data;
}

export async function listEmails(
  filters?: EmailFilterOptions
): Promise<EmailListItem[]> {
  const res = await safeQuery(async () => {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.quotationId) {
      where.quotationId = filters.quotationId;
    }
    if (filters?.search) {
      where.OR = [
        { toEmail: { contains: filters.search, mode: "insensitive" } },
        { subject: { contains: filters.search, mode: "insensitive" } },
        { body: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const emails = await prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
        quotation: {
          select: {
            number: true,
          },
        },
      },
    });

    return emails.map((email) => ({
      id: email.id,
      toEmail: email.toEmail,
      subject: email.subject,
      status: email.status,
      sentAt: email.sentAt,
      createdAt: email.createdAt,
      customerName: email.customer?.name ?? null,
      quotationNumber: email.quotation?.number ?? null,
    }));
  }, []);
  return res.data;
}

export async function deleteEmail(id: string): Promise<void> {
  await prisma.emailLog.delete({ where: { id } });
}

/**
 * Record that a customer replied. Marks the email (if given) and the customer
 * as replied, and stops any ACTIVE follow-up sequences for that customer so the
 * AI stops chasing a contact who already responded.
 */
export async function markEmailReplied(emailId: string): Promise<void> {
  const now = new Date();
  const email = await prisma.emailLog.update({
    where: { id: emailId },
    data: { repliedAt: now },
    select: { customerId: true },
  });
  if (email.customerId) {
    await markCustomerReplied(email.customerId, now);
  }
}

export async function markCustomerReplied(
  customerId: string,
  when: Date = new Date(),
): Promise<void> {
  await prisma.customer.update({
    where: { id: customerId },
    data: { lastRepliedAt: when },
  });
  // Stop chasing: complete any active sequences for this customer.
  await prisma.followUpSequence.updateMany({
    where: { customerId, status: "ACTIVE", stopOnReply: true },
    data: { status: "STOPPED" },
  });
}
