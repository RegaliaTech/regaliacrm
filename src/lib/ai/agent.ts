import { getAiClient, type ChatMessage } from "@/lib/ai";
import { getSettings } from "@/lib/settings";
import type { SessionUser } from "@/lib/rbac";

export type AssistantReply = { reply: string };

/**
 * System prompt establishing the assistant's persona and guardrails. Kept
 * data-honest: in Phase A the assistant has no tools, so it must not invent
 * specific records/numbers.
 */
function buildSystemPrompt(user: SessionUser, companyName: string): string {
  return [
    `You are the built-in AI assistant for "${companyName}", a CRM used to manage customers, products, quotations, follow-ups, and email outreach.`,
    `You are assisting ${user.name ?? "a team member"} (their role is ${user.role}).`,
    "",
    "Guidelines:",
    "- Be concise, warm, and professional. Prefer short paragraphs or tight lists.",
    "- Write in plain text. Do NOT use markdown symbols like **, ##, or backticks. For lists, use simple dashes (-).",
    "- You can help draft and refine emails, brainstorm customer outreach and sales messaging, explain how the app works, and answer general business questions.",
    "- Do NOT invent specific customer names, figures, quotation numbers, or any real records. You cannot see the user's live data yet, so if asked about specifics, say you can't look that up right now.",
    "- When you draft an email, return ready-to-send plain text (no markdown, no placeholders unless necessary).",
    "- If a request is outside your abilities, say so briefly and suggest the closest thing you can do.",
  ].join("\n");
}

/**
 * Runs one assistant turn: builds the system prompt (with light context) and
 * asks the configured AI provider for a reply. Phase A has no tools.
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
  const result = await getAiClient().chat(history, { systemInstruction });
  return { reply: result.text };
}
