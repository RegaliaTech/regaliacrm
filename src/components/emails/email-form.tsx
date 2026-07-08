"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import {
  saveEmail,
  generateEmailDraft,
  type EmailFormState,
} from "@/app/(app)/emails/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EmailFormProps = {
  customers: Array<{ id: string; name: string; email: string | null }>;
  quotations: Array<{ id: string; number: string; customerId: string }>;
  defaultCustomerId?: string;
  defaultQuotationId?: string;
};

export function EmailForm({
  customers,
  quotations,
  defaultCustomerId,
  defaultQuotationId,
}: EmailFormProps) {
  const [state, formAction, pending] = useActionState<
    EmailFormState,
    FormData
  >(saveEmail, {});

  const [selectedCustomerId, setSelectedCustomerId] = useState(defaultCustomerId || "");
  const [selectedQuotationId, setSelectedQuotationId] = useState(defaultQuotationId || "");
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);

  // AI assistant state
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState<"friendly" | "formal" | "concise">(
    "friendly",
  );
  const [aiError, setAiError] = useState<string | null>(null);
  const [generating, startGenerating] = useTransition();

  const handleGenerate = () => {
    setAiError(null);
    startGenerating(async () => {
      const result = await generateEmailDraft({
        purpose: prompt,
        tone,
        customerId: selectedCustomerId || undefined,
        quotationId: selectedQuotationId || undefined,
      });
      if (result.error) {
        setAiError(result.error);
        return;
      }
      if (result.subject) setSubject(result.subject);
      if (result.body) setBody(result.body);
      setAiGenerated(true);
    });
  };

  // Auto-fill email when customer is selected
  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    setSelectedCustomerId(customerId);
    
    if (customerId) {
      const customer = customers.find((c) => c.id === customerId);
      if (customer?.email) {
        setToEmail(customer.email);
      }
    }
  };

  // Filter quotations for selected customer
  const filteredQuotations = selectedCustomerId
    ? quotations.filter((q) => q.customerId === selectedCustomerId)
    : quotations;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="aiGenerated" value={aiGenerated ? "true" : "false"} />
      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Email details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="customerId">Customer (optional)</Label>
                  <Select
                    id="customerId"
                    name="customerId"
                    value={selectedCustomerId}
                    onChange={handleCustomerChange}
                  >
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.email ? `(${c.email})` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quotationId">Quotation (optional)</Label>
                  <Select
                    id="quotationId"
                    name="quotationId"
                    value={selectedQuotationId}
                    onChange={(e) => setSelectedQuotationId(e.target.value)}
                  >
                    <option value="">Select quotation...</option>
                    {filteredQuotations.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.number}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="toEmail">To email</Label>
                <Input
                  id="toEmail"
                  name="toEmail"
                  type="email"
                  required
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Your quotation from Regalia CMS"
                />
              </div>
              <div>
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  name="body"
                  required
                  rows={12}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Dear [Customer],

Thank you for your interest...

Best regards,
Regalia Team"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Write your email message here. Use plain text with line breaks.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" /> Write with AI
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {aiError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {aiError}
                </div>
              )}
              <div>
                <Label htmlFor="aiPrompt">Prompt</Label>
                <Textarea
                  id="aiPrompt"
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Follow up on the pump quotation and offer a 5% discount if they order this week."
                />
              </div>
              <div>
                <Label htmlFor="aiTone">Tone</Label>
                <Select
                  id="aiTone"
                  value={tone}
                  onChange={(e) =>
                    setTone(e.target.value as "friendly" | "formal" | "concise")
                  }
                >
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                  <option value="concise">Concise</option>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Generate email
                  </>
                )}
              </Button>
              <p className="text-xs leading-relaxed text-[var(--muted)]">
                AI fills the subject and message below. Review and edit before
                sending.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <Button type="submit" name="action" value="send" className="w-full" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  "Send email"
                )}
              </Button>
              <Button
                type="submit"
                name="action"
                value="draft"
                variant="outline"
                className="w-full"
                disabled={pending}
              >
                Save as draft
              </Button>
              <Link
                href="/emails"
                className={buttonClasses("outline", "md", "w-full")}
              >
                Cancel
              </Link>
              <p className="text-xs leading-relaxed text-[var(--muted)]">
                Emails will be logged and linked to the customer/quotation if selected.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
