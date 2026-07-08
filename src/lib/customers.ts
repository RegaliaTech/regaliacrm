import type {
  CustomerStatus,
  QuotationStatus,
  EmailStatus,
  FollowUpStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { mockCustomers } from "@/lib/mock";

export type CustomerView = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  status: CustomerStatus;
  tags: string[];
  ownerId: string | null;
  ownerName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaCustomerRow = Awaited<ReturnType<typeof fetchCustomerRows>>[number];

function fetchCustomerRows() {
  return prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

function normalize(row: PrismaCustomerRow): CustomerView {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    website: row.website,
    address: row.address,
    status: row.status,
    tags: row.tags ?? [],
    ownerId: row.ownerId,
    ownerName: row.owner?.name ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getCustomers(): Promise<CustomerView[]> {
  const res = await safeQuery(
    async () => (await fetchCustomerRows()).map(normalize),
    mockCustomers,
  );
  return res.data;
}

export type CustomerContactView = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
};

export type CustomerNoteView = {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: Date;
};

export type CustomerQuotationView = {
  id: string;
  number: string;
  status: QuotationStatus;
  total: number;
  paid: number;
  createdAt: Date;
};

export type CustomerEmailView = {
  id: string;
  subject: string;
  toEmail: string;
  status: EmailStatus;
  sentAt: Date | null;
  createdAt: Date;
};

export type CustomerFollowUpView = {
  id: string;
  caseSubject: string;
  status: FollowUpStatus;
  scheduledAt: Date;
};

export type CustomerDetail = CustomerView & {
  contacts: CustomerContactView[];
  notes: CustomerNoteView[];
  quotations: CustomerQuotationView[];
  emails: CustomerEmailView[];
  followUps: CustomerFollowUpView[];
};

/**
 * Full 360° view of a single customer: profile plus related quotations
 * (with paid totals), contacts, notes, emails, and follow-ups. Returns null
 * if the customer doesn't exist or the database is unreachable.
 */
export async function getCustomerDetail(
  id: string,
): Promise<CustomerDetail | null> {
  const res = await safeQuery<CustomerDetail | null>(async () => {
    const row = await prisma.customer.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true } },
        contacts: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        notes: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { name: true } } },
        },
        quotations: {
          orderBy: { createdAt: "desc" },
          include: { payments: { select: { amount: true } } },
        },
        emails: { orderBy: { createdAt: "desc" }, take: 20 },
        followUps: { orderBy: { scheduledAt: "desc" }, take: 20 },
      },
    });
    if (!row) return null;

    return {
      ...normalize(row),
      contacts: row.contacts.map((c) => ({
        id: c.id,
        name: c.name,
        title: c.title,
        email: c.email,
        phone: c.phone,
        isPrimary: c.isPrimary,
      })),
      notes: row.notes.map((n) => ({
        id: n.id,
        body: n.body,
        authorName: n.author?.name ?? null,
        createdAt: n.createdAt,
      })),
      quotations: row.quotations.map((q) => ({
        id: q.id,
        number: q.number,
        status: q.status,
        total: Number(q.total),
        paid: q.payments.reduce((sum, p) => sum + Number(p.amount), 0),
        createdAt: q.createdAt,
      })),
      emails: row.emails.map((e) => ({
        id: e.id,
        subject: e.subject,
        toEmail: e.toEmail,
        status: e.status,
        sentAt: e.sentAt,
        createdAt: e.createdAt,
      })),
      followUps: row.followUps.map((f) => ({
        id: f.id,
        caseSubject: f.caseSubject,
        status: f.status,
        scheduledAt: f.scheduledAt,
      })),
    };
  }, null);
  return res.data;
}
