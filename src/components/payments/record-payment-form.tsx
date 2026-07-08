"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { recordPayment, type PaymentFormState } from "@/app/(app)/payments/actions";
import { Input } from "@/components/ui/input";
import { buttonClasses } from "@/components/ui/button";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RecordPaymentForm({ quotationId }: { quotationId: string }) {
  const [state, formAction, pending] = useActionState<
    PaymentFormState,
    FormData
  >(recordPayment, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="quotationId" value={quotationId} />
      <Input
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        required
        placeholder="Amount"
        className="h-8 w-24 text-sm"
      />
      <Input
        name="paidAt"
        type="date"
        required
        defaultValue={today()}
        className="h-8 w-36 text-sm"
      />
      <Input
        name="method"
        placeholder="Method"
        className="h-8 w-24 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className={buttonClasses("outline", "sm")}
      >
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Record
      </button>
      {state.error && (
        <span className="w-full text-xs text-[var(--danger)]">{state.error}</span>
      )}
    </form>
  );
}
