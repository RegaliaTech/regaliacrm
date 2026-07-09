"use server";

import { requireUser } from "@/lib/rbac";
import { runAssistant } from "@/lib/ai/agent";
import type { ChatMessage } from "@/lib/ai";

export type AssistantResult = { reply: string } | { error: string };

/** Max turns of history sent to the model, to bound payload/cost. */
const MAX_HISTORY = 20;

export async function sendAssistantMessage(
  history: ChatMessage[],
): Promise<AssistantResult> {
  const user = await requireUser();

  if (!Array.isArray(history) || history.length === 0) {
    return { error: "No message to send." };
  }

  const trimmed = history.slice(-MAX_HISTORY);

  try {
    const { reply } = await runAssistant(user, trimmed);
    return { reply };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to get a response.",
    };
  }
}
