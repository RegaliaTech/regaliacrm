import type { CustomerStatus, ExpenseCategory } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCustomers } from "@/lib/customers";
import { getQuotations } from "@/lib/quotations";
import { getExpenses } from "@/lib/expenses";
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

const WRITE_TOOL_HANDLERS: Record<string, WriteToolHandler> = {
  create_customer: createCustomer,
  schedule_followup: scheduleFollowUp,
  send_email: sendCustomerEmail,
  log_expense: logExpense,
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
