"use client";

import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { CustomerStatus } from "@prisma/client";
import { Upload } from "lucide-react";
import {
  createBulkEmailAction,
  importCustomersFromCsvAction,
  type BulkEmailFormState,
  type ImportCustomersResult,
} from "@/app/(app)/emails/bulk/actions";
import type { BulkCustomerOption } from "@/lib/bulk-emails";
import { parseCsv } from "@/lib/csv";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/** Map a variety of common header names to our canonical field names. */
function pickColumn(
  headers: string[],
  candidates: string[],
): number {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const canon = headers.map(norm);
  for (const c of candidates) {
    const idx = canon.indexOf(norm(c));
    if (idx >= 0) return idx;
  }
  return -1;
}

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
  /** Customers created/updated via CSV import — appended to the picker list. */
  const [extraCustomers, setExtraCustomers] = useState<BulkCustomerOption[]>(
    [],
  );
  const [importStats, setImportStats] = useState<ImportCustomersResult | null>(
    null,
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, startImport] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allCustomers = useMemo(
    () => [...extraCustomers, ...customers],
    [customers, extraCustomers],
  );

  const handleCsvUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportStats(null);
    try {
      const text = await file.text();
      const { header, rows } = parseCsv(text, { hasHeader: true });

      // Map common header aliases → our canonical fields.
      const emailIdx =
        pickColumn(header, ["email", "emailaddress", "mail", "mailid"]) ??
        -1;
      const nameIdx = pickColumn(header, [
        "name",
        "contactname",
        "owner",
        "ownername",
        "contact",
      ]);
      const companyIdx = pickColumn(header, [
        "company",
        "companyname",
        "business",
        "organisation",
        "organization",
      ]);
      const phoneIdx = pickColumn(header, [
        "phone",
        "phonenumber",
        "mobile",
        "mobilenumber",
        "contactnumber",
      ]);
      const addressIdx = pickColumn(header, [
        "address",
        "location",
        "companyaddress",
      ]);
      const websiteIdx = pickColumn(header, ["website", "url", "site"]);

      // Fallback: if no header row matched, assume the first column is email.
      const emailCol = emailIdx >= 0 ? emailIdx : 0;

      const payload = rows
        .map((r) => ({
          email: (r[emailCol] ?? "").trim(),
          name: nameIdx >= 0 ? (r[nameIdx] ?? "").trim() : undefined,
          company: companyIdx >= 0 ? (r[companyIdx] ?? "").trim() : undefined,
          phone: phoneIdx >= 0 ? (r[phoneIdx] ?? "").trim() : undefined,
          address: addressIdx >= 0 ? (r[addressIdx] ?? "").trim() : undefined,
          website: websiteIdx >= 0 ? (r[websiteIdx] ?? "").trim() : undefined,
        }))
        .filter((r) => r.email);

      if (payload.length === 0) {
        setImportError(
          "No rows had an email. Make sure your CSV has an 'email' column (or put emails in the first column).",
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      startImport(async () => {
        try {
          const stats = await importCustomersFromCsvAction(payload);
          // Merge returned customers into the picker + auto-select them.
          setExtraCustomers((prev) => {
            const knownIds = new Set([
              ...customers.map((c) => c.id),
              ...prev.map((c) => c.id),
            ]);
            const additions = stats.customers
              .filter((c) => !knownIds.has(c.id))
              .map((c) => ({
                id: c.id,
                name: c.name,
                company: c.company,
                email: c.email,
                status: c.status as CustomerStatus,
                tags: c.tags,
              }));
            return [...additions, ...prev];
          });
          setSelected((prev) => {
            const next = new Set(prev);
            for (const c of stats.customers) next.add(c.id);
            return next;
          });
          setImportStats(stats);
        } catch (err) {
          setImportError(
            err instanceof Error ? err.message : "Import failed",
          );
        }
      });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    allCustomers.forEach((c) => c.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [allCustomers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCustomers.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (tagFilter && !c.tags.includes(tagFilter)) return false;
      if (q) {
        const hay = `${c.name} ${c.company ?? ""} ${c.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allCustomers, statusFilter, tagFilter, search]);

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
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleCsvUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className={buttonClasses("ghost", "sm")}
                >
                  <Upload className="h-4 w-4" />
                  {importing ? "Importing…" : "Import companies (CSV)"}
                </button>
                <span className="text-xs text-[var(--muted)]">
                  Columns: <code className="rounded bg-slate-100 px-1">email</code>{" "}
                  (required), and any of{" "}
                  <code className="rounded bg-slate-100 px-1">name</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">company</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">phone</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">address</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">website</code>.
                </span>
              </div>
              {importError && (
                <p className="text-xs text-red-600">{importError}</p>
              )}
              {importStats && (
                <p className="text-xs text-slate-600">
                  Imported: <b>{importStats.created}</b> new, <b>{importStats.updated}</b>{" "}
                  updated
                  {importStats.skipped > 0 && (
                    <>, {importStats.skipped} unchanged</>
                  )}
                  {importStats.invalid > 0 && (
                    <>, {importStats.invalid} invalid</>
                  )}
                  {importStats.errors.length > 0 && (
                    <>, {importStats.errors.length} errored</>
                  )}
                  . All {importStats.customers.length} added to this campaign.
                </p>
              )}
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
