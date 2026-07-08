"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createSequenceAction,
  type SequenceFormState,
} from "@/app/(app)/followups/sequences/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SequenceForm({
  customers,
}: {
  customers: Array<{ id: string; name: string; email: string | null }>;
}) {
  const [state, formAction, pending] = useActionState<
    SequenceFormState,
    FormData
  >(createSequenceAction, {});

  const [useAi, setUseAi] = useState(true);
  const [stopOnReply, setStopOnReply] = useState(true);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="useAi" value={useAi ? "true" : "false"} />
      <input type="hidden" name="stopOnReply" value={stopOnReply ? "true" : "false"} />

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Follow-up sequence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div>
            <Label htmlFor="name">Sequence name</Label>
            <Input id="name" name="name" placeholder="Quotation chase" required />
          </div>
          <div>
            <Label htmlFor="customerId">Customer</Label>
            <Select id="customerId" name="customerId" required defaultValue="">
              <option value="" disabled>
                Select customer...
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id} disabled={!c.email}>
                  {c.name} {c.email ? `(${c.email})` : "(no email)"}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="caseSubject">Case subject (what we&apos;re chasing)</Label>
            <Input
              id="caseSubject"
              name="caseSubject"
              placeholder="Follow up on quotation QUO-123"
              required
            />
          </div>
          <div>
            <Label htmlFor="notes">Context / notes for the AI (optional)</Label>
            <Textarea id="notes" name="notes" rows={4} />
          </div>
          <div>
            <Label htmlFor="delays">Step delays in days (comma-separated)</Label>
            <Input id="delays" name="delays" defaultValue="1, 3, 7" required />
            <p className="mt-1 text-xs text-[var(--muted)]">
              Each number is days from now. e.g. &quot;1, 3, 7&quot; sends on day 1, 3 and 7
              unless the customer replies first.
            </p>
          </div>
          <div>
            <Label htmlFor="tone">Tone</Label>
            <Select id="tone" name="tone" defaultValue="friendly">
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
              <option value="concise">Concise</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={useAi}
              onChange={(e) => setUseAi(e.target.checked)}
            />
            Let AI write each email (uses prior emails + escalates tone)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={stopOnReply}
              onChange={(e) => setStopOnReply(e.target.checked)}
            />
            Stop the sequence automatically when the customer replies
          </label>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create sequence"}
        </Button>
        <Link href="/followups/sequences" className={buttonClasses("ghost", "md")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
