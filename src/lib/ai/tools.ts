import type {
  CustomerStatus,
  ExpenseCategory,
  ProductKind,
  QuotationStatus,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCustomers, getCustomerDetail } from "@/lib/customers";
import { getQuotations, getQuotation } from "@/lib/quotations";
import { getExpenses } from "@/lib/expenses";
import { getVendors } from "@/lib/vendors";
import { getProducts } from "@/lib/products";
import { getOutstandingInvoices, sendPaymentReminder } from "@/lib/payments";
import { getCommissionReport } from "@/lib/commissions";
import { getProductRoi } from "@/lib/roi";
import { listFollowUps } from "@/lib/followups";
import { getSettings } from "@/lib/settings";
import { sendEmail } from "@/lib/mailer";
import type { SessionUser } from "@/lib/rbac";

/**
 * Provider-neutral tool declarations + handlers for the AI assistant.
 * Read-only tools run directly; write tools set `write: true` and are gated
 * behind a user-confirmation step plus WRITE_ROLES (see runAssistant /
 * confirmAssistantAction).
 */

type ToolProperty = {
  type: "string" | "number" | "integer" | "boolean";
  description?: string;
  enum?: string[];
};

export type ToolDeclaration = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolProperty>;
    required?: string[];
  };
  /** Write tools mutate data and require confirmation (Phase C). */
  write?: boolean;
};

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

const QUOTATION_STATUSES = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
] as const;

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "RENT",
  "UTILITIES",
  "SALARIES",
  "MARKETING",
  "MAINTENANCE",
  "OTHER",
];

const PRODUCT_KINDS: ProductKind[] = [
  "MODEL",
  "PHOTOGRAPHER",
  "RENTAL",
  "CUSTOM",
];

/**
 * Resolve a quotation by its id (cuid) or its human number (e.g. "QUO-0007").
 * Returns the id and current status, or null if nothing matches.
 */
async function resolveQuotation(
  ref: string,
): Promise<{ id: string; number: string; status: QuotationStatus } | null> {
  const value = ref.trim();
  if (!value) return null;
  const byId = await prisma.quotation.findUnique({
    where: { id: value },
    select: { id: true, number: true, status: true },
  });
  if (byId) return byId;
  const byNumber = await prisma.quotation.findFirst({
    where: { number: { equals: value, mode: "insensitive" } },
    select: { id: true, number: true, status: true },
  });
  return byNumber;
}

// ---------------------------------------------------------------------------
// Read tools
// ---------------------------------------------------------------------------

async function getPipelineSummary(): Promise<unknown> {
  const [
    customerTotal,
    leadCount,
    activeCount,
    quotationTotal,
    draftCount,
    sentCount,
    acceptedCount,
    pendingFollowUps,
    pipeline,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { status: "LEAD" } }),
    prisma.customer.count({ where: { status: "ACTIVE" } }),
    prisma.quotation.count(),
    prisma.quotation.count({ where: { status: "DRAFT" } }),
    prisma.quotation.count({ where: { status: "SENT" } }),
    prisma.quotation.count({ where: { status: "ACCEPTED" } }),
    prisma.followUp.count({ where: { status: "SCHEDULED" } }),
    prisma.quotation.aggregate({
      _sum: { total: true },
      where: { status: { in: ["SENT", "ACCEPTED"] } },
    }),
  ]);

  return {
    customers: { total: customerTotal, leads: leadCount, active: activeCount },
    quotations: {
      total: quotationTotal,
      draft: draftCount,
      sent: sentCount,
      accepted: acceptedCount,
    },
    openPipelineValue: Number(pipeline._sum.total ?? 0),
    pendingFollowUps,
  };
}

async function searchCustomers(args: Record<string, unknown>): Promise<unknown> {
  const query = String(args.query ?? "").toLowerCase().trim();
  const all = await getCustomers();
  const matched = (
    query
      ? all.filter((c) =>
          [c.name, c.company, c.email, c.phone, c.ownerName]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
      : all
  ).slice(0, 10);

  return {
    count: matched.length,
    customers: matched.map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company,
      email: c.email,
      status: c.status,
      owner: c.ownerName,
    })),
  };
}

async function listQuotations(args: Record<string, unknown>): Promise<unknown> {
  const status =
    typeof args.status === "string" ? args.status.toUpperCase() : undefined;
  const all = await getQuotations();
  const filtered = (
    status ? all.filter((q) => q.status === status) : all
  ).slice(0, 20);

  return {
    count: filtered.length,
    quotations: filtered.map((q) => ({
      id: q.id,
      number: q.number,
      customer: q.customer.name,
      status: q.status,
      total: q.total,
      currency: q.currency,
    })),
  };
}

async function getExpenseSummary(
  args: Record<string, unknown>,
): Promise<unknown> {
  const from = args.from ? new Date(String(args.from)) : undefined;
  const to = args.to ? new Date(String(args.to)) : undefined;
  const category =
    typeof args.category === "string" ? args.category.toUpperCase() : undefined;

  if (from && Number.isNaN(from.getTime())) {
    return { error: "The `from` date is invalid — use YYYY-MM-DD." };
  }
  if (to && Number.isNaN(to.getTime())) {
    return { error: "The `to` date is invalid — use YYYY-MM-DD." };
  }

  const all = await getExpenses({ from, to });
  const filtered = category
    ? all.filter((e) => e.category === category)
    : all;

  const totalsByCategory: Record<string, number> = {};
  let total = 0;
  for (const e of filtered) {
    total += e.amount;
    totalsByCategory[e.category] = (totalsByCategory[e.category] ?? 0) + e.amount;
  }

  const currency = filtered[0]?.currency ?? "AED";
  const recent = filtered.slice(0, 10).map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    amount: e.amount,
    currency: e.currency,
    incurredAt: e.incurredAt.toISOString(),
  }));

  return {
    count: filtered.length,
    total,
    currency,
    byCategory: totalsByCategory,
    recent,
    range: {
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
    },
  };
}

async function getCustomer360(args: Record<string, unknown>): Promise<unknown> {
  const id = String(args.customerId ?? "").trim();
  if (!id) {
    return { error: "A customerId is required — find it with search_customers." };
  }
  const c = await getCustomerDetail(id);
  if (!c) return { error: "No customer found with that id." };
  return {
    id: c.id,
    name: c.name,
    company: c.company,
    email: c.email,
    phone: c.phone,
    status: c.status,
    owner: c.ownerName,
    tags: c.tags,
    contacts: c.contacts.map((x) => ({
      name: x.name,
      title: x.title,
      email: x.email,
      phone: x.phone,
      isPrimary: x.isPrimary,
    })),
    recentNotes: c.notes.slice(0, 5).map((n) => ({
      body: n.body,
      author: n.authorName,
      at: n.createdAt.toISOString(),
    })),
    quotations: c.quotations.map((q) => ({
      id: q.id,
      number: q.number,
      status: q.status,
      total: q.total,
      paid: q.paid,
      balance: q.total - q.paid,
    })),
    recentEmails: c.emails.slice(0, 5).map((e) => ({
      subject: e.subject,
      status: e.status,
      at: (e.sentAt ?? e.createdAt).toISOString(),
    })),
    followUps: c.followUps.map((f) => ({
      subject: f.caseSubject,
      status: f.status,
      scheduledAt: f.scheduledAt.toISOString(),
    })),
  };
}

async function getQuotationDetail(
  args: Record<string, unknown>,
): Promise<unknown> {
  const ref = String(args.quotation ?? "").trim();
  if (!ref) {
    return { error: "A quotation id or number is required." };
  }
  const resolved = await resolveQuotation(ref);
  if (!resolved) return { error: "No quotation found matching that id/number." };
  const q = await getQuotation(resolved.id);
  if (!q) return { error: "No quotation found matching that id/number." };
  return {
    id: q.id,
    number: q.number,
    customer: q.customer.name,
    status: q.status,
    currency: q.currency,
    subtotal: q.subtotal,
    discountTotal: q.discountTotal,
    taxTotal: q.taxTotal,
    total: q.total,
    validUntil: q.validUntil?.toISOString() ?? null,
    notes: q.notes,
    items: q.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
      product: i.product?.name ?? null,
    })),
  };
}

async function listVendors(args: Record<string, unknown>): Promise<unknown> {
  const query = String(args.query ?? "").toLowerCase().trim();
  const all = await getVendors();
  const matched = (
    query
      ? all.filter((v) =>
          [v.name, v.contactName, v.email, v.phone]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
      : all
  ).slice(0, 20);
  return {
    count: matched.length,
    vendors: matched.map((v) => ({
      id: v.id,
      name: v.name,
      contact: v.contactName,
      email: v.email,
      phone: v.phone,
      active: v.isActive,
    })),
  };
}

async function searchProducts(args: Record<string, unknown>): Promise<unknown> {
  const query = String(args.query ?? "").toLowerCase().trim();
  const kind =
    typeof args.kind === "string" ? args.kind.toUpperCase() : undefined;
  const all = await getProducts();
  const matched = all
    .filter((p) => (kind ? p.kind === kind : true))
    .filter((p) =>
      query
        ? [p.name, p.sku, p.category, p.model, p.nationality]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query)
        : true,
    )
    .slice(0, 15);
  return {
    count: matched.length,
    products: matched.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      kind: p.kind,
      category: p.category,
      unitPrice: p.unitPrice,
      currency: p.currency,
      active: p.isActive,
    })),
  };
}

async function getReceivables(): Promise<unknown> {
  const invoices = await getOutstandingInvoices();
  const currency = invoices[0]?.currency ?? "AED";
  const totalOutstanding = invoices.reduce((s, i) => s + i.balance, 0);
  const overdue = invoices.filter(
    (i) => i.daysOverdue !== null && i.daysOverdue > 0,
  );
  return {
    count: invoices.length,
    currency,
    totalOutstanding,
    overdueCount: overdue.length,
    invoices: invoices.slice(0, 20).map((i) => ({
      quotationId: i.id,
      number: i.number,
      customer: i.customer.name,
      total: i.total,
      paid: i.paid,
      balance: i.balance,
      daysOverdue: i.daysOverdue,
      dueDate: i.dueDate?.toISOString() ?? null,
    })),
  };
}

/** Parse an optional YYYY-MM-DD range, defaulting to the current month. */
function parseRange(args: Record<string, unknown>): {
  from: Date;
  to: Date;
  error?: string;
} {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const from = args.from ? new Date(String(args.from)) : defaultFrom;
  const to = args.to ? new Date(String(args.to)) : defaultTo;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { from: defaultFrom, to: defaultTo, error: "Invalid date — use YYYY-MM-DD." };
  }
  return { from, to };
}

async function getCommissions(args: Record<string, unknown>): Promise<unknown> {
  const { from, to, error } = parseRange(args);
  if (error) return { error };
  const rows = await getCommissionReport(from, to);
  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    count: rows.length,
    totalCommission: rows.reduce((s, r) => s + r.commission, 0),
    reps: rows.map((r) => ({
      name: r.userName,
      revenue: r.revenue,
      rate: r.rate,
      commission: r.commission,
    })),
  };
}

async function getRoi(args: Record<string, unknown>): Promise<unknown> {
  const { from, to, error } = parseRange(args);
  if (error) return { error };
  const rows = await getProductRoi(from, to);
  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    count: rows.length,
    products: rows.slice(0, 20).map((r) => ({
      name: r.productName,
      sku: r.sku,
      kind: r.kind,
      cost: r.cost,
      revenue: r.revenue,
      roiPercent: r.roiPercent,
      bookings: r.bookings,
    })),
  };
}

async function getFollowUps(args: Record<string, unknown>): Promise<unknown> {
  const status =
    typeof args.status === "string"
      ? (args.status.toUpperCase() as
          | "SCHEDULED"
          | "SENT"
          | "CANCELLED"
          | "FAILED")
      : undefined;
  const customerId =
    typeof args.customerId === "string" && args.customerId.trim()
      ? args.customerId.trim()
      : undefined;
  const rows = await listFollowUps({ status, customerId });
  return {
    count: rows.length,
    followUps: rows.slice(0, 25).map((f) => ({
      id: f.id,
      subject: f.caseSubject,
      customer: f.customerName,
      status: f.status,
      scheduledAt: f.scheduledAt.toISOString(),
      sentAt: f.sentAt?.toISOString() ?? null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: "get_pipeline_summary",
    description:
      "Get a high-level snapshot of the business: customer counts (total, leads, active), quotation counts by status, total open pipeline value (sent + accepted), and number of pending follow-ups. Use this for questions like 'how's my pipeline?' or 'how many open quotations do I have?'.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "search_customers",
    description:
      "Search the customer list by name, company, email, phone, or owner. Returns up to 10 matches with their id, name, company, email, and status. Use an empty query to list recent customers.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Text to match against customer fields.",
        },
      },
    },
  },
  {
    name: "list_quotations",
    description:
      "List quotations, optionally filtered by status. Returns up to 20 with number, customer, status, and total.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Optional status filter.",
          enum: [...QUOTATION_STATUSES],
        },
      },
    },
  },
  {
    name: "get_expense_summary",
    description:
      "Summarize company expenses (rent, utilities, salaries, marketing, maintenance, other). Returns the total, currency, per-category breakdown, and the 10 most recent items. Use for questions like 'how much did we spend on marketing this quarter?' or 'what were our expenses last month?'. Filters are optional.",
    parameters: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description:
            "Only include expenses on or after this date (YYYY-MM-DD).",
        },
        to: {
          type: "string",
          description: "Only include expenses before this date (YYYY-MM-DD).",
        },
        category: {
          type: "string",
          description: "Optional category filter.",
          enum: [...EXPENSE_CATEGORIES],
        },
      },
    },
  },
  {
    name: "get_customer_detail",
    description:
      "Get the full 360° view of one customer: profile, contacts, recent notes, their quotations (with paid/balance), recent emails, and follow-ups. First find the id with search_customers.",
    parameters: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "The customer's id (from search_customers).",
        },
      },
      required: ["customerId"],
    },
  },
  {
    name: "get_quotation_detail",
    description:
      "Get one quotation in full: customer, status, line items, subtotal, discount, tax, and total. Accepts either the quotation id or its number (e.g. 'QUO-0007').",
    parameters: {
      type: "object",
      properties: {
        quotation: {
          type: "string",
          description: "The quotation id or number.",
        },
      },
      required: ["quotation"],
    },
  },
  {
    name: "list_vendors",
    description:
      "List or search vendors/suppliers by name, contact, email, or phone. Returns up to 20 with id, name, contact, and status.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Optional text to match against vendor fields.",
        },
      },
    },
  },
  {
    name: "search_products",
    description:
      "Search the product/talent catalog (models, photographers, rentals, custom items) by name, SKU, category, model, or nationality. Optionally filter by kind. Returns up to 15 with id, SKU, name, kind, and price.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Text to match against product fields.",
        },
        kind: {
          type: "string",
          description: "Optional product kind filter.",
          enum: [...PRODUCT_KINDS],
        },
      },
    },
  },
  {
    name: "get_receivables",
    description:
      "List outstanding invoices (sent/accepted quotations with a balance due), including total outstanding and how many are overdue. Use for 'who owes us money?' or 'what's overdue?'.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_commission_report",
    description:
      "Per-rep sales commission for accepted quotations in a date range (defaults to the current month). Returns each rep's revenue, rate, and commission.",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date (YYYY-MM-DD)." },
        to: { type: "string", description: "End date, exclusive (YYYY-MM-DD)." },
      },
    },
  },
  {
    name: "get_product_roi",
    description:
      "Per-product ROI (revenue booked vs. recorded cost) for accepted quotations in a date range (defaults to the current month). Returns cost, revenue, ROI %, and bookings.",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date (YYYY-MM-DD)." },
        to: { type: "string", description: "End date, exclusive (YYYY-MM-DD)." },
      },
    },
  },
  {
    name: "list_followups",
    description:
      "List follow-ups, optionally filtered by status or customer. Returns up to 25 with id, subject, customer, status, and schedule.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Optional status filter.",
          enum: ["SCHEDULED", "SENT", "CANCELLED", "FAILED"],
        },
        customerId: {
          type: "string",
          description: "Optional customer id (from search_customers).",
        },
      },
    },
  },
  {
    name: "create_customer",
    description:
      "Create a new customer record. Use when the user asks to add a customer. The user will be asked to confirm before this runs.",
    write: true,
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full contact name (required)." },
        email: { type: "string", description: "Email address." },
        company: { type: "string", description: "Company name." },
        phone: { type: "string", description: "Phone number." },
        status: {
          type: "string",
          description: "Lifecycle status (defaults to LEAD).",
          enum: ["LEAD", "ACTIVE", "INACTIVE", "CHURNED"],
        },
      },
      required: ["name"],
    },
  },
  {
    name: "schedule_followup",
    description:
      "Schedule a follow-up for an existing customer. First find the customer's id with search_customers. The user will be asked to confirm before this runs.",
    write: true,
    parameters: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "The customer's id (from search_customers).",
        },
        caseSubject: {
          type: "string",
          description: "Short subject describing the follow-up.",
        },
        scheduledAt: {
          type: "string",
          description: "When to schedule it (ISO 8601). Defaults to now.",
        },
      },
      required: ["customerId", "caseSubject"],
    },
  },
  {
    name: "send_email",
    description:
      "Send an email to a customer. Use when the user asks to email someone. If you only have a customer's name, first look up their address with search_customers. Write the body as plain text. The user will be asked to confirm before the email is sent.",
    write: true,
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Recipient email address (required).",
        },
        subject: {
          type: "string",
          description: "Email subject line (required).",
        },
        body: {
          type: "string",
          description: "Plain-text email body (required).",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "log_expense",
    description:
      "Log a company expense (rent, utilities, salaries, marketing, maintenance, other). Use when the user says things like 'log AED 5000 rent for July' or 'record a marketing expense'. The user will be asked to confirm before the record is created.",
    write: true,
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description:
            "Short description of the expense, e.g. 'July office rent' (required).",
        },
        amount: {
          type: "number",
          description: "Amount in the given currency (required, positive).",
        },
        category: {
          type: "string",
          description: "Expense category. Defaults to OTHER.",
          enum: [...EXPENSE_CATEGORIES],
        },
        currency: {
          type: "string",
          description: "ISO currency code. Defaults to the company default (AED).",
        },
        incurredAt: {
          type: "string",
          description:
            "When the expense was incurred (YYYY-MM-DD or ISO 8601). Defaults to today.",
        },
        notes: {
          type: "string",
          description: "Optional free-text notes.",
        },
      },
      required: ["title", "amount"],
    },
  },
  {
    name: "update_customer_status",
    description:
      "Change a customer's lifecycle status (LEAD, ACTIVE, INACTIVE, CHURNED). First find the id with search_customers. The user will be asked to confirm.",
    write: true,
    parameters: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "The customer's id (from search_customers).",
        },
        status: {
          type: "string",
          description: "The new status.",
          enum: ["LEAD", "ACTIVE", "INACTIVE", "CHURNED"],
        },
      },
      required: ["customerId", "status"],
    },
  },
  {
    name: "add_customer_note",
    description:
      "Add a timestamped note to a customer's record. First find the id with search_customers. The user will be asked to confirm.",
    write: true,
    parameters: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "The customer's id (from search_customers).",
        },
        body: {
          type: "string",
          description: "The note text (required).",
        },
      },
      required: ["customerId", "body"],
    },
  },
  {
    name: "record_payment",
    description:
      "Record a payment received against a quotation/invoice. Accepts the quotation id or number. Use for 'mark QUO-0007 as paid AED 5000'. The user will be asked to confirm.",
    write: true,
    parameters: {
      type: "object",
      properties: {
        quotation: {
          type: "string",
          description: "The quotation id or number.",
        },
        amount: {
          type: "number",
          description: "Amount received (positive).",
        },
        method: {
          type: "string",
          description: "Payment method, e.g. 'Bank transfer', 'Cash', 'Card'.",
        },
        paidAt: {
          type: "string",
          description: "When it was paid (YYYY-MM-DD). Defaults to today.",
        },
        notes: {
          type: "string",
          description: "Optional notes.",
        },
      },
      required: ["quotation", "amount"],
    },
  },
  {
    name: "update_quotation_status",
    description:
      "Change a quotation's status (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED). Accepts the quotation id or number. The user will be asked to confirm.",
    write: true,
    parameters: {
      type: "object",
      properties: {
        quotation: {
          type: "string",
          description: "The quotation id or number.",
        },
        status: {
          type: "string",
          description: "The new status.",
          enum: [...QUOTATION_STATUSES],
        },
      },
      required: ["quotation", "status"],
    },
  },
  {
    name: "create_vendor",
    description:
      "Create a new vendor/supplier record. Use when the user asks to add a vendor. The user will be asked to confirm.",
    write: true,
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Vendor/company name (required)." },
        contactName: { type: "string", description: "Primary contact person." },
        email: { type: "string", description: "Contact email." },
        phone: { type: "string", description: "Contact phone." },
        address: { type: "string", description: "Address." },
        notes: { type: "string", description: "Optional notes." },
      },
      required: ["name"],
    },
  },
  {
    name: "send_payment_reminder",
    description:
      "Email a payment reminder to the customer for an outstanding invoice. Accepts the quotation id or number. Get candidates from get_receivables first. The user will be asked to confirm before the email is sent.",
    write: true,
    parameters: {
      type: "object",
      properties: {
        quotation: {
          type: "string",
          description: "The quotation id or number of the outstanding invoice.",
        },
      },
      required: ["quotation"],
    },
  },
];

/** Names of tools that mutate data — gated behind user confirmation + RBAC. */
export const WRITE_TOOL_NAMES = TOOL_DECLARATIONS.filter((t) => t.write).map(
  (t) => t.name,
);

// ---------------------------------------------------------------------------
// Write tools (require confirmation + WRITE_ROLES)
// ---------------------------------------------------------------------------

type WriteToolHandler = (
  args: Record<string, unknown>,
  user: SessionUser,
) => Promise<unknown>;

const CUSTOMER_STATUSES: CustomerStatus[] = [
  "LEAD",
  "ACTIVE",
  "INACTIVE",
  "CHURNED",
];

async function createCustomer(
  args: Record<string, unknown>,
  user: SessionUser,
): Promise<unknown> {
  const name = String(args.name ?? "").trim();
  if (!name) return { error: "A customer name is required." };

  const email = args.email
    ? String(args.email).toLowerCase().trim()
    : null;
  if (email) {
    const existing = await prisma.customer.findFirst({ where: { email } });
    if (existing) {
      return { error: `A customer with email ${email} already exists.` };
    }
  }

  const rawStatus = String(args.status ?? "").toUpperCase() as CustomerStatus;
  const status = CUSTOMER_STATUSES.includes(rawStatus) ? rawStatus : "LEAD";

  const customer = await prisma.customer.create({
    data: {
      name,
      email,
      company: args.company ? String(args.company) : null,
      phone: args.phone ? String(args.phone) : null,
      status,
      // The dev preview stub has no real User row to own records.
      ownerId: user.id === "preview-user" ? null : user.id,
    },
  });
  return { id: customer.id, name: customer.name, status };
}

async function scheduleFollowUp(
  args: Record<string, unknown>,
  user: SessionUser,
): Promise<unknown> {
  const customerId = String(args.customerId ?? "").trim();
  if (!customerId) {
    return {
      error:
        "A customerId is required — look it up with search_customers first.",
    };
  }
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true },
  });
  if (!customer) return { error: "No customer found with that id." };

  const caseSubject =
    String(args.caseSubject ?? "").trim() || `Follow up with ${customer.name}`;
  const scheduledAt = args.scheduledAt
    ? new Date(String(args.scheduledAt))
    : new Date();
  if (Number.isNaN(scheduledAt.getTime())) {
    return { error: "The scheduledAt date is invalid." };
  }

  const followUp = await prisma.followUp.create({
    data: {
      customerId,
      caseSubject,
      emailSubject: caseSubject,
      useAi: true,
      status: "SCHEDULED",
      scheduledAt,
      creatorId: user.id === "preview-user" ? null : user.id,
    },
  });
  return {
    id: followUp.id,
    customer: customer.name,
    scheduledAt: scheduledAt.toISOString(),
  };
}

async function sendCustomerEmail(
  args: Record<string, unknown>,
  user: SessionUser,
): Promise<unknown> {
  const to = String(args.to ?? "").trim();
  const subject = String(args.subject ?? "").trim();
  const body = String(args.body ?? "").trim();

  if (!z.string().email().safeParse(to).success) {
    return { error: "A valid recipient email address is required." };
  }
  if (!subject) return { error: "An email subject is required." };
  if (!body) return { error: "An email body is required." };

  // Best-effort: link the log to a known customer with this address.
  let customerId: string | null = null;
  try {
    const customer = await prisma.customer.findFirst({
      where: { email: to.toLowerCase() },
      select: { id: true },
    });
    customerId = customer?.id ?? null;
  } catch {
    // Non-fatal — still send + log without the linkage.
  }

  // The dev preview stub has no real User row to attribute the send to.
  const senderId = user.id === "preview-user" ? null : user.id;
  const logBase = { customerId, senderId, toEmail: to, subject, body, aiGenerated: true };

  const signature = user.name
    ? { name: user.name, role: user.role }
    : undefined;

  try {
    await sendEmail({ to, subject, body, signature });
  } catch (error) {
    // Record the failed attempt for auditing, then surface the error.
    try {
      await prisma.emailLog.create({
        data: {
          ...logBase,
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    } catch {
      // Ignore a secondary logging failure.
    }
    return {
      error:
        error instanceof Error ? error.message : "Failed to send the email.",
    };
  }

  try {
    await prisma.emailLog.create({
      data: { ...logBase, status: "SENT", sentAt: new Date() },
    });
  } catch {
    // The email was sent; a logging failure shouldn't fail the action.
  }

  return { to, subject };
}

async function logExpense(
  args: Record<string, unknown>,
  user: SessionUser,
): Promise<unknown> {
  const title = String(args.title ?? "").trim();
  if (!title) return { error: "An expense title is required." };

  const amount = Number(args.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount must be a positive number." };
  }

  const rawCategory = String(args.category ?? "OTHER").toUpperCase() as ExpenseCategory;
  const category = EXPENSE_CATEGORIES.includes(rawCategory) ? rawCategory : "OTHER";

  let currency = args.currency ? String(args.currency).toUpperCase() : "";
  if (!currency) {
    try {
      const settings = await getSettings();
      currency = settings.currency || "AED";
    } catch {
      currency = "AED";
    }
  }

  const incurredAt = args.incurredAt
    ? new Date(String(args.incurredAt))
    : new Date();
  if (Number.isNaN(incurredAt.getTime())) {
    return { error: "The incurredAt date is invalid." };
  }

  const notes = args.notes ? String(args.notes).trim() || null : null;

  const expense = await prisma.expense.create({
    data: {
      title,
      category,
      amount,
      currency,
      incurredAt,
      notes,
      createdById: user.id === "preview-user" ? null : user.id,
    },
  });
  return {
    id: expense.id,
    title: expense.title,
    category: expense.category,
    amount: Number(expense.amount),
    currency: expense.currency,
    incurredAt: expense.incurredAt.toISOString(),
  };
}

async function updateCustomerStatus(
  args: Record<string, unknown>,
): Promise<unknown> {
  const customerId = String(args.customerId ?? "").trim();
  if (!customerId) {
    return { error: "A customerId is required — find it with search_customers." };
  }
  const raw = String(args.status ?? "").toUpperCase() as CustomerStatus;
  if (!CUSTOMER_STATUSES.includes(raw)) {
    return { error: `Status must be one of: ${CUSTOMER_STATUSES.join(", ")}.` };
  }
  const existing = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true },
  });
  if (!existing) return { error: "No customer found with that id." };
  await prisma.customer.update({
    where: { id: customerId },
    data: { status: raw },
  });
  return { id: existing.id, name: existing.name, status: raw };
}

async function addCustomerNote(
  args: Record<string, unknown>,
  user: SessionUser,
): Promise<unknown> {
  const customerId = String(args.customerId ?? "").trim();
  if (!customerId) {
    return { error: "A customerId is required — find it with search_customers." };
  }
  const body = String(args.body ?? "").trim();
  if (!body) return { error: "A note body is required." };
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true },
  });
  if (!customer) return { error: "No customer found with that id." };
  await prisma.customerNote.create({
    data: {
      customerId,
      body,
      authorId: user.id === "preview-user" ? null : user.id,
    },
  });
  return { customer: customer.name };
}

async function recordPayment(
  args: Record<string, unknown>,
  user: SessionUser,
): Promise<unknown> {
  const ref = String(args.quotation ?? "").trim();
  if (!ref) return { error: "A quotation id or number is required." };
  const resolved = await resolveQuotation(ref);
  if (!resolved) return { error: "No quotation found matching that id/number." };

  const amount = Number(args.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount must be a positive number." };
  }
  const paidAt = args.paidAt ? new Date(String(args.paidAt)) : new Date();
  if (Number.isNaN(paidAt.getTime())) {
    return { error: "The paidAt date is invalid — use YYYY-MM-DD." };
  }
  const method = args.method ? String(args.method).trim() || null : null;
  const notes = args.notes ? String(args.notes).trim() || null : null;

  await prisma.payment.create({
    data: {
      quotationId: resolved.id,
      amount,
      paidAt,
      method,
      notes,
      createdById: user.id === "preview-user" ? null : user.id,
    },
  });
  return { number: resolved.number, amount };
}

async function updateQuotationStatus(
  args: Record<string, unknown>,
): Promise<unknown> {
  const ref = String(args.quotation ?? "").trim();
  if (!ref) return { error: "A quotation id or number is required." };
  const resolved = await resolveQuotation(ref);
  if (!resolved) return { error: "No quotation found matching that id/number." };

  const raw = String(args.status ?? "").toUpperCase();
  if (!QUOTATION_STATUSES.includes(raw as (typeof QUOTATION_STATUSES)[number])) {
    return { error: `Status must be one of: ${QUOTATION_STATUSES.join(", ")}.` };
  }
  await prisma.quotation.update({
    where: { id: resolved.id },
    data: { status: raw as QuotationStatus },
  });
  return { number: resolved.number, status: raw };
}

async function createVendor(args: Record<string, unknown>): Promise<unknown> {
  const name = String(args.name ?? "").trim();
  if (!name) return { error: "A vendor name is required." };
  const email = args.email ? String(args.email).toLowerCase().trim() : null;
  if (email && !z.string().email().safeParse(email).success) {
    return { error: "The vendor email address is invalid." };
  }
  const vendor = await prisma.vendor.create({
    data: {
      name,
      contactName: args.contactName ? String(args.contactName).trim() : null,
      email,
      phone: args.phone ? String(args.phone).trim() : null,
      address: args.address ? String(args.address).trim() : null,
      notes: args.notes ? String(args.notes).trim() : null,
    },
  });
  return { id: vendor.id, name: vendor.name };
}

async function sendReminder(
  args: Record<string, unknown>,
  user: SessionUser,
): Promise<unknown> {
  const ref = String(args.quotation ?? "").trim();
  if (!ref) return { error: "A quotation id or number is required." };
  const resolved = await resolveQuotation(ref);
  if (!resolved) return { error: "No quotation found matching that id/number." };
  const senderId = user.id === "preview-user" ? null : user.id;
  const result = await sendPaymentReminder(resolved.id, senderId);
  if (!result.ok) {
    return { error: result.error ?? "Failed to send the reminder." };
  }
  return { number: resolved.number };
}

const WRITE_TOOL_HANDLERS: Record<string, WriteToolHandler> = {
  create_customer: createCustomer,
  schedule_followup: scheduleFollowUp,
  send_email: sendCustomerEmail,
  log_expense: logExpense,
  update_customer_status: updateCustomerStatus,
  add_customer_note: addCustomerNote,
  record_payment: recordPayment,
  update_quotation_status: updateQuotationStatus,
  create_vendor: createVendor,
  send_payment_reminder: sendReminder,
};

/** A plain-language description of a pending write, shown in the confirm card. */
export function summarizeWriteAction(
  name: string,
  args: Record<string, unknown>,
): string {
  if (name === "create_customer") {
    const bits = [args.name && `${args.name}`, args.company && `(${args.company})`, args.email]
      .filter(Boolean)
      .join(" ");
    return `Create a new customer: ${bits}`;
  }
  if (name === "schedule_followup") {
    const subj = args.caseSubject ? `: “${args.caseSubject}”` : "";
    const when = args.scheduledAt ? ` for ${args.scheduledAt}` : "";
    return `Schedule a follow-up${subj}${when}`;
  }
  if (name === "send_email") {
    const subj = args.subject ? `“${args.subject}”` : "an email";
    return `Send ${subj} to ${args.to ?? "the recipient"}`;
  }
  if (name === "log_expense") {
    const cur = args.currency ? String(args.currency).toUpperCase() : "AED";
    const cat = args.category ? String(args.category).toUpperCase() : "OTHER";
    const when = args.incurredAt ? ` on ${args.incurredAt}` : "";
    return `Log ${cat} expense: “${args.title ?? ""}” — ${cur} ${args.amount ?? 0}${when}`;
  }
  if (name === "update_customer_status") {
    return `Change customer status to ${String(args.status ?? "").toUpperCase()}`;
  }
  if (name === "add_customer_note") {
    const preview = String(args.body ?? "").slice(0, 60);
    return `Add a note to the customer: “${preview}${preview.length >= 60 ? "…" : ""}”`;
  }
  if (name === "record_payment") {
    return `Record a payment of ${args.amount ?? 0} against quotation ${args.quotation ?? ""}`;
  }
  if (name === "update_quotation_status") {
    return `Set quotation ${args.quotation ?? ""} to ${String(args.status ?? "").toUpperCase()}`;
  }
  if (name === "create_vendor") {
    const bits = [args.name, args.contactName && `(${args.contactName})`, args.email]
      .filter(Boolean)
      .join(" ");
    return `Create a new vendor: ${bits}`;
  }
  if (name === "send_payment_reminder") {
    return `Email a payment reminder for quotation ${args.quotation ?? ""}`;
  }
  return `Run ${name}`;
}

/**
 * Executes a confirmed write tool. Caller MUST have already re-checked the
 * user's role. Returns a JSON-serializable result (or `{ error }`).
 */
export async function executeWriteTool(
  name: string,
  args: Record<string, unknown>,
  user: SessionUser,
): Promise<unknown> {
  const handler = WRITE_TOOL_HANDLERS[name];
  if (!handler) return { error: `Unknown or non-write tool: ${name}` };
  try {
    return await handler(args ?? {}, user);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "The action failed (the database may be unavailable).",
    };
  }
}

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  get_pipeline_summary: getPipelineSummary,
  search_customers: searchCustomers,
  list_quotations: listQuotations,
  get_expense_summary: getExpenseSummary,
  get_customer_detail: getCustomer360,
  get_quotation_detail: getQuotationDetail,
  list_vendors: listVendors,
  search_products: searchProducts,
  get_receivables: getReceivables,
  get_commission_report: getCommissions,
  get_product_roi: getRoi,
  list_followups: getFollowUps,
};

/**
 * Executes a tool by name. Read tools only in Phase B. Returns a JSON-
 * serializable object; on failure returns `{ error }` so the model can relay
 * it to the user rather than crashing the turn.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const handler = TOOL_HANDLERS[name];
  if (!handler) return { error: `Unknown tool: ${name}` };
  try {
    return await handler(args ?? {});
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "The data lookup failed (the database may be unavailable).",
    };
  }
}
