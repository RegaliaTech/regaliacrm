import { prisma } from "@/lib/db";
import { getCustomers } from "@/lib/customers";
import { getQuotations } from "@/lib/quotations";

/**
 * Provider-neutral tool declarations + handlers for the AI assistant.
 * Phase B ships read-only tools; write tools (Phase C) will set `write: true`
 * and be gated behind a user-confirmation step.
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
];

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
