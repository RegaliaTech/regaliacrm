"use server";

import { requireUser, can, WRITE_ROLES } from "@/lib/rbac";
import { runAssistant, runConfirmedAction, type PendingAction } from "@/lib/ai/agent";
import { WRITE_TOOL_NAMES } from "@/lib/ai/tools";
import type { ChatMessage } from "@/lib/ai";

export type AssistantResult =
  | { reply: string; pendingAction?: PendingAction }
  | { error: string };

export type ConfirmResult = { reply: string } | { error: string };

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
    const { reply, pendingAction } = await runAssistant(user, trimmed);
    return pendingAction ? { reply, pendingAction } : { reply };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to get a response.",
    };
  }
}

/**
 * Executes a write action the user confirmed in the assistant. Re-checks the
 * role here (defense-in-depth) even though `runAssistant` only offers write
 * tools to privileged roles — never trust the client-supplied payload.
 */
export async function confirmAssistantAction(
  name: string,
  args: Record<string, unknown>,
): Promise<ConfirmResult> {
  const user = await requireUser();

  if (!can(user.role, WRITE_ROLES)) {
    return { error: "You don't have permission to do that." };
  }
  if (!WRITE_TOOL_NAMES.includes(name)) {
    return { error: "Unknown action." };
  }

  try {
    const { reply } = await runConfirmedAction(user, name, args);
    return { reply };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to run that action.",
    };
  }
}
