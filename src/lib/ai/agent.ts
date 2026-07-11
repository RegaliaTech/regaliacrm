import { getAiClient, type ChatMessage } from "@/lib/ai";
import { getSettings } from "@/lib/settings";
import {
  TOOL_DECLARATIONS,
  WRITE_TOOL_NAMES,
  executeTool,
  executeWriteTool,
  summarizeWriteAction,
} from "@/lib/ai/tools";
import { can, WRITE_ROLES, type SessionUser } from "@/lib/rbac";

/** A mutating action the model proposed, awaiting user confirmation. */
export type PendingAction = {
  name: string;
  args: Record<string, unknown>;
  summary: string;
};

export type AssistantReply = { reply: string; pendingAction?: PendingAction };

/**
 * System prompt establishing the assistant's persona and guardrails. The
 * assistant has read tools (pipeline summary, customer search, quotations), so
 * it must look data up rather than guess — and never fabricate records.
 */
function buildSystemPrompt(user: SessionUser, companyName: string): string {
  return [
    `You are the built-in AI assistant for "${companyName}", a CRM used to manage customers, products, quotations, follow-ups, and email outreach.`,
    `You are assisting ${user.name ?? "a team member"} (their role is ${user.role}).`,
    "",
    "Guidelines:",
    "- Be concise, warm, and professional. Prefer short paragraphs or tight lists.",
    "- Write in plain text. Do NOT use markdown symbols like **, ##, or backticks. For lists, use simple dashes (-).",
    "- You can help draft and refine emails, brainstorm outreach, explain how the app works, and answer questions about the user's CRM data.",
    "- You have tools to look up real data (pipeline summary, customer search, quotations, expense summary). ALWAYS call a tool to answer questions about the user's actual customers, quotations, expenses, or pipeline — never guess or fabricate figures, names, or records.",
    "- Only state facts that came from a tool result. If a tool returns an error or no data, say so plainly.",
    "- When you draft an email, return ready-to-send plain text (no markdown, no placeholders unless necessary).",
    "- If a request is outside your abilities, say so briefly and suggest the closest thing you can do.",
  ].join("\n");
}

/**
 * Runs one assistant turn: builds the system prompt (with light context) and
 * asks the AI provider for a reply, letting it call read-only tools as needed.
 */
export async function runAssistant(
  user: SessionUser,
  history: ChatMessage[],
): Promise<AssistantReply> {
  let companyName = "the company";
  try {
    const settings = await getSettings();
    companyName = settings.companyName || companyName;
  } catch {
    // Settings may be unavailable (e.g. DB offline in preview) — use the default.
  }

  // Only privileged roles may be offered write tools. For everyone else we
  // hide the write declarations entirely, so the model can't even propose a
  // mutating action it would be blocked from running.
  const allowWrites = can(user.role, WRITE_ROLES);

  const systemInstruction = buildSystemPrompt(user, companyName);
  const result = await getAiClient().chatWithTools(history, {
    systemInstruction,
    tools: allowWrites
      ? TOOL_DECLARATIONS
      : TOOL_DECLARATIONS.filter((t) => !t.write),
    writeToolNames: allowWrites ? WRITE_TOOL_NAMES : [],
    onToolCall: (name, args) => executeTool(name, args),
  });

  if (result.pendingToolCall) {
    const { name, args } = result.pendingToolCall;
    return {
      reply: result.text,
      pendingAction: { name, args, summary: summarizeWriteAction(name, args) },
    };
  }

  return { reply: result.text };
}

/**
 * Runs a write action the user has confirmed. The caller MUST have already
 * verified the user's role. Returns a short human-readable outcome message.
 */
export async function runConfirmedAction(
  user: SessionUser,
  name: string,
  args: Record<string, unknown>,
): Promise<{ reply: string }> {
  const result = (await executeWriteTool(name, args, user)) as {
    error?: string;
  } & Record<string, unknown>;

  if (result?.error) {
    return { reply: `I couldn't do that: ${result.error}` };
  }

  if (name === "create_customer") {
    return { reply: `Done — created customer “${result.name}”.` };
  }
  if (name === "schedule_followup") {
    return { reply: `Done — scheduled a follow-up for ${result.customer}.` };
  }
  if (name === "send_email") {
    return { reply: `Done — sent the email to ${result.to}.` };
  }
  if (name === "log_expense") {
    return {
      reply: `Done — logged ${result.currency} ${result.amount} for “${result.title}”.`,
    };
  }
  return { reply: "Done." };
}
