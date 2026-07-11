import type { CustomerStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCustomers } from "@/lib/customers";
import { getQuotations } from "@/lib/quotations";
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

  try {
    await sendEmail({ to, subject, body });
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

const WRITE_TOOL_HANDLERS: Record<string, WriteToolHandler> = {
  create_customer: createCustomer,
  schedule_followup: scheduleFollowUp,
  send_email: sendCustomerEmail,
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
