"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import type { CustomerStatus } from "@prisma/client";
import {
  createBulkEmailAction,
  type BulkEmailFormState,
} from "@/app/(app)/emails/bulk/actions";
import type { BulkCustomerOption } from "@/lib/bulk-emails";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUSES: CustomerStatus[] = ["LEAD", "ACTIVE", "INACTIVE", "CHURNED"];

export function BulkEmailForm({
  customers,
}: {
  customers: BulkCustomerOption[];
}) {
  const [state, formAction, pending] = useActionState<
    BulkEmailFormState,
    FormData
  >(createBulkEmailAction, {});

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [useAi, setUseAi] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allTags = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => c.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (tagFilter && !c.tags.includes(tagFilter)) return false;
      if (q) {
        const hay = `${c.name} ${c.company ?? ""} ${c.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [customers, statusFilter, tagFilter, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((c) => next.add(c.id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  return (
    <form action={formAction} className="space-y-6">
      {Array.from(selected).map((id) => (
        <input key={id} type="hidden" name="customerIds" value={id} />
      ))}
      <input type="hidden" name="useAi" value={useAi ? "true" : "false"} />

      <FormError error={state.error} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Campaign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <Label htmlFor="name">Campaign name</Label>
                <Input id="name" name="name" placeholder="June promo blast" required />
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" placeholder="A special offer for you" required />
              </div>
              <div>
                <Label htmlFor="body">
                  {useAi ? "Message brief (AI personalises per recipient)" : "Message"}
                </Label>
                <Textarea id="body" name="body" rows={10} required />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={useAi}
                  onChange={(e) => setUseAi(e.target.checked)}
                />
                Personalise each email with AI
              </label>
              {useAi && (
                <div>
                  <Label htmlFor="tone">Tone</Label>
                  <Select id="tone" name="tone" defaultValue="friendly">
                    <option value="friendly">Friendly</option>
                    <option value="formal">Formal</option>
                    <option value="concise">Concise</option>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Recipients{" "}
                <span className="text-sm font-normal text-[var(--muted)]">
                  ({selected.size} selected)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-3 sm:grid-cols-3">
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                <Select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
                  <option value="">All tags</option>
                  {allTags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex gap-2 text-sm">
                <button type="button" onClick={selectAllFiltered} className={buttonClasses("ghost", "sm")}>
                  Select all ({filtered.length})
                </button>
                <button type="button" onClick={clearSelection} className={buttonClasses("ghost", "sm")}>
                  Clear
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-lg border border-[var(--border)]">
                {filtered.length === 0 ? (
                  <p className="p-4 text-sm text-[var(--muted)]">No customers match.</p>
                ) : (
                  filtered.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-[var(--border)] px-4 py-2 text-sm last:border-b-0 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggle(c.id)}
                      />
                      <span className="flex-1">
                        <span className="font-medium text-slate-900">{c.name}</span>
                        {c.company && (
                          <span className="text-[var(--muted)]"> · {c.company}</span>
                        )}
                        <span className="block text-xs text-[var(--muted)]">{c.email}</span>
                      </span>
                      <Badge tone="muted">{c.status}</Badge>
                    </label>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <SubmitButton
            pending={pending}
            disabled={selected.size === 0}
            className="w-full"
          >
            {pending ? "Creating..." : `Create campaign (${selected.size})`}
          </SubmitButton>
          <Link href="/emails/bulk" className={`${buttonClasses("ghost", "md")} w-full`}>
            Cancel
          </Link>
          <p className="text-xs text-[var(--muted)]">
            The campaign is created as a draft. You can review recipients and send it from
            the campaign page.
          </p>
        </div>
      </div>
    </form>
  );
}
