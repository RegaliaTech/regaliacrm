"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  saveFollowUp,
  type FollowUpFormState,
} from "@/app/(app)/followups/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FollowUpFormProps = {
  customers: Array<{ id: string; name: string; email: string | null }>;
  defaultCustomerId?: string;
  initialData?: {
    caseSubject: string;
    notes: string | null;
    emailSubject: string;
    emailBody: string | null;
    useAi: boolean;
    scheduledAt: string;
  };
};

export function FollowUpForm({
  customers,
  defaultCustomerId,
  initialData,
}: FollowUpFormProps) {
  const [state, formAction, pending] = useActionState<
    FollowUpFormState,
    FormData
  >(saveFollowUp, {});

  // Default to tomorrow at 9 AM
  const defaultScheduledAt =
    initialData?.scheduledAt ||
    new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Follow-up details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="customerId">Customer</Label>
                  <Select
                    id="customerId"
                    name="customerId"
                    required
                    defaultValue={defaultCustomerId || ""}
                  >
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.email ? `(${c.email})` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="caseSubject">Case subject</Label>
                  <Input
                    id="caseSubject"
                    name="caseSubject"
                    required
                    defaultValue={initialData?.caseSubject}
                    placeholder="Quotation follow-up, Product inquiry, etc."
                  />
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Brief description of why you're following up
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="scheduledAt">Schedule for</Label>
                  <Input
                    id="scheduledAt"
                    name="scheduledAt"
                    type="datetime-local"
                    required
                    defaultValue={defaultScheduledAt}
                  />
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    When should this follow-up be sent?
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Internal notes (optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={initialData?.notes || ""}
                  placeholder="Add context about this follow-up for your team..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <Label htmlFor="emailSubject">Email subject</Label>
                <Input
                  id="emailSubject"
                  name="emailSubject"
                  required
                  defaultValue={initialData?.emailSubject}
                  placeholder="Following up on your quotation"
                />
              </div>
              <div>
                <Label htmlFor="emailBody">Email body (optional if using AI)</Label>
                <Textarea
                  id="emailBody"
                  name="emailBody"
                  rows={10}
                  defaultValue={initialData?.emailBody || ""}
                  placeholder="Dear [Customer],

We wanted to follow up...

Best regards,
Regalia Team"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Leave empty to use AI-generated content at send time
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useAi"
                  name="useAi"
                  value="true"
                  defaultChecked={initialData?.useAi || false}
                  className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
                />
                <Label htmlFor="useAi" className="cursor-pointer">
                  Use AI to generate email content at send time
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Schedule follow-up"
                )}
              </Button>
              <Link
                href="/followups"
                className={buttonClasses("outline", "md", "w-full")}
              >
                Cancel
              </Link>
              <p className="text-xs leading-relaxed text-[var(--muted)]">
                The follow-up will be sent automatically at the scheduled time, or you can send it manually from the list.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
