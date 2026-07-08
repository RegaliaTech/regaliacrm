"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { createSequence, stopSequence } from "@/lib/sequences";

const sequenceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  customerId: z.string().min(1, "Customer is required"),
  caseSubject: z.string().min(1, "Case subject is required"),
  notes: z.string().optional(),
  useAi: z.boolean().default(true),
  tone: z.enum(["friendly", "formal", "concise"]).default("friendly"),
  stopOnReply: z.boolean().default(true),
  // Comma-separated list of day offsets, e.g. "1,3,7"
  delays: z.string().min(1, "Add at least one step"),
});

export type SequenceFormState = { error?: string };

export async function createSequenceAction(
  _prev: SequenceFormState,
  formData: FormData,
): Promise<SequenceFormState> {
  const user = await requireRole(WRITE_ROLES);

  const parsed = sequenceSchema.safeParse({
    name: formData.get("name"),
    customerId: formData.get("customerId"),
    caseSubject: formData.get("caseSubject"),
    notes: formData.get("notes") || undefined,
    useAi: formData.get("useAi") === "true",
    tone: formData.get("tone") || "friendly",
    stopOnReply: formData.get("stopOnReply") === "true",
    delays: formData.get("delays"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const d = parsed.data;
  const steps = d.delays
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n >= 0)
    .map((delayDays) => ({ delayDays }));

  if (steps.length === 0) {
    return { error: "Provide valid step delays, e.g. 1, 3, 7" };
  }

  let sequenceId: string;
  try {
    sequenceId = await createSequence({
      name: d.name,
      customerId: d.customerId,
      caseSubject: d.caseSubject,
      notes: d.notes ?? null,
      useAi: d.useAi,
      tone: d.tone,
      stopOnReply: d.stopOnReply,
      steps,
      createdById: user.id,
    });
    revalidatePath("/followups/sequences");
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create sequence",
    };
  }

  redirect(`/followups/sequences/${sequenceId}`);
}

export async function stopSequenceAction(
  id: string,
): Promise<{ error?: string }> {
  await requireRole(WRITE_ROLES);
  try {
    await stopSequence(id);
    revalidatePath("/followups/sequences");
    revalidatePath(`/followups/sequences/${id}`);
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to stop sequence",
    };
  }
}
