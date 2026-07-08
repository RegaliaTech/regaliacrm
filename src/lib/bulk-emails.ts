import type { BulkEmailStatus, CustomerStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";

export type BulkEmailListItem = {
  id: string;
  name: string;
  subject: string;
  status: BulkEmailStatus;
  total: number;
  sentCount: number;
  failedCount: number;
  useAi: boolean;
  createdAt: Date;
};

export type BulkRecipientView = {
  id: string;
  customerId: string | null;
  toEmail: string;
  status: string;
  error: string | null;
  sentAt: Date | null;
  customerName: string | null;
};

export type BulkEmailView = {
  id: string;
  name: string;
  subject: string;
  body: string;
  useAi: boolean;
  tone: string | null;
  status: BulkEmailStatus;
  total: number;
  sentCount: number;
  failedCount: number;
  createdAt: Date;
  recipients: BulkRecipientView[];
};

export type BulkCustomerOption = {
  id: string;
  name: string;
  company: string | null;
  email: string;
  status: CustomerStatus;
  tags: string[];
};

export async function listBulkEmails(): Promise<BulkEmailListItem[]> {
  const res = await safeQuery(async () => {
    const rows = await prisma.bulkEmail.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      subject: r.subject,
      status: r.status,
      total: r.total,
      sentCount: r.sentCount,
      failedCount: r.failedCount,
      useAi: r.useAi,
      createdAt: r.createdAt,
    }));
  }, []);
  return res.data;
}

export async function getBulkEmail(id: string): Promise<BulkEmailView | null> {
  const res = await safeQuery(async () => {
    const row = await prisma.bulkEmail.findUnique({
      where: { id },
      include: {
        recipients: {
          include: { customer: { select: { name: true } } },
          orderBy: { toEmail: "asc" },
        },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      subject: row.subject,
      body: row.body,
      useAi: row.useAi,
      tone: row.tone,
      status: row.status,
      total: row.total,
      sentCount: row.sentCount,
      failedCount: row.failedCount,
      createdAt: row.createdAt,
      recipients: row.recipients.map((rec) => ({
        id: rec.id,
        customerId: rec.customerId,
        toEmail: rec.toEmail,
        status: rec.status,
        error: rec.error,
        sentAt: rec.sentAt,
        customerName: rec.customer?.name ?? null,
      })),
    };
  }, null);
  return res.data;
}

/** Customers eligible for a bulk send (must have an email). */
export async function getCustomersForBulk(filters?: {
  status?: CustomerStatus;
  tag?: string;
  search?: string;
}): Promise<BulkCustomerOption[]> {
  const res = await safeQuery(async () => {
    const where: {
      email: { not: null };
      status?: CustomerStatus;
      tags?: { has: string };
      OR?: Array<Record<string, unknown>>;
    } = { email: { not: null } };

    if (filters?.status) where.status = filters.status;
    if (filters?.tag) where.tags = { has: filters.tag };
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { company: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        company: true,
        email: true,
        status: true,
        tags: true,
      },
    });

    return rows
      .filter((r): r is typeof r & { email: string } => Boolean(r.email))
      .map((r) => ({
        id: r.id,
        name: r.name,
        company: r.company,
        email: r.email,
        status: r.status,
        tags: r.tags ?? [],
      }));
  }, []);
  return res.data;
}
