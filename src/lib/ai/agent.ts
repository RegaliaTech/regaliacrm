import { getAiClient, type ChatMessage } from "@/lib/ai";
import { getSettings } from "@/lib/settings";
import { TOOL_DECLARATIONS, executeTool } from "@/lib/ai/tools";
import type { SessionUser } from "@/lib/rbac";

export type AssistantReply = { reply: string };

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
    "- You have tools to look up real data (pipeline summary, customer search, quotations). ALWAYS call a tool to answer questions about the user's actual customers, quotations, or pipeline — never guess or fabricate figures, names, or records.",
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

  const systemInstruction = buildSystemPrompt(user, companyName);
  const result = await getAiClient().chatWithTools(history, {
    systemInstruction,
    tools: TOOL_DECLARATIONS,
    onToolCall: (name, args) => executeTool(name, args),
  });
  return { reply: result.text };
}
