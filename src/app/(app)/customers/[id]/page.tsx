import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Mail,
  Clock,
  Plus,
  Phone,
  Globe,
  MapPin,
  StickyNote,
  Users,
} from "lucide-react";
import { requireUser, can, WRITE_ROLES } from "@/lib/rbac";
import { getCustomerDetail } from "@/lib/customers";
import {
  customerStatusTone,
  quotationStatusTone,
  emailStatusTone,
  followUpStatusTone,
} from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const customer = await getCustomerDetail(id);

  if (!customer) notFound();

  const canWrite = can(user.role, WRITE_ROLES);

  const totalValue = customer.quotations.reduce((s, q) => s + q.total, 0);
  const totalPaid = customer.quotations.reduce((s, q) => s + q.paid, 0);
  const outstanding = customer.quotations
    .filter((q) => q.status === "SENT" || q.status === "ACCEPTED")
    .reduce((s, q) => s + Math.max(q.total - q.paid, 0), 0);

  const stats = [
    { label: "Quotations", value: String(customer.quotations.length) },
    { label: "Total value", value: formatCurrency(totalValue) },
    { label: "Paid", value: formatCurrency(totalPaid) },
    { label: "Outstanding", value: formatCurrency(outstanding) },
  ];

  return (
    <div className="animate-in mx-auto max-w-5xl space-y-6">
      {/* Action bar */}
      <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-3xl px-4 py-3">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to customers
        </Link>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/emails/new?customerId=${customer.id}`}
              className={buttonClasses("ghost", "sm")}
            >
              <Mail className="h-4 w-4" /> Compose email
            </Link>
            <Link
              href={`/followups/new?customerId=${customer.id}`}
              className={buttonClasses("ghost", "sm")}
            >
              <Clock className="h-4 w-4" /> Schedule follow-up
            </Link>
            <Link
              href={`/quotations/new?customerId=${customer.id}`}
              className={buttonClasses("primary", "sm")}
            >
              <Plus className="h-4 w-4" /> New quote
            </Link>
          </div>
        )}
      </div>

      {/* Profile header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  {customer.name}
                </h1>
                <Badge tone={customerStatusTone(customer.status)}>
                  {customer.status}
                </Badge>
              </div>
              {customer.company && (
                <p className="text-sm text-[var(--muted)]">{customer.company}</p>
              )}
              {customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customer.tags.map((t) => (
                    <Badge key={t} tone="muted">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right text-sm text-[var(--muted)]">
              <p>Owner: {customer.ownerName ?? "—"}</p>
              <p>Added {formatDate(customer.createdAt)}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 text-sm sm:grid-cols-2">
            <ContactRow icon={Mail} value={customer.email} href={customer.email ? `mailto:${customer.email}` : undefined} />
            <ContactRow icon={Phone} value={customer.phone} href={customer.phone ? `tel:${customer.phone}` : undefined} />
            <ContactRow icon={Globe} value={customer.website} href={customer.website ?? undefined} />
            <ContactRow icon={MapPin} value={customer.address} />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-3xl p-4">
            <p className="text-xs font-medium text-[var(--muted)]">{s.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quotations */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Quotations</CardTitle>
          {canWrite && (
            <Link
              href={`/quotations/new?customerId=${customer.id}`}
              className={buttonClasses("outline", "sm")}
            >
              <Plus className="h-4 w-4" /> New
            </Link>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {customer.quotations.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No quotations yet"
              description="Create a quotation for this customer."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Number</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Paid</TH>
                  <TH className="text-right">Date</TH>
                </TR>
              </THead>
              <TBody>
                {customer.quotations.map((q) => (
                  <TR key={q.id}>
                    <TD>
                      <Link
                        href={`/quotations/${q.id}`}
                        className="font-medium text-[var(--primary)] hover:underline"
                      >
                        {q.number}
                      </Link>
                    </TD>
                    <TD>
                      <Badge tone={quotationStatusTone(q.status)}>
                        {q.status}
                      </Badge>
                    </TD>
                    <TD className="text-right tabular-nums">
                      {formatCurrency(q.total)}
                    </TD>
                    <TD className="text-right tabular-nums text-[var(--muted)]">
                      {formatCurrency(q.paid)}
                    </TD>
                    <TD className="whitespace-nowrap text-right text-[var(--muted)]">
                      {formatDate(q.createdAt)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contacts */}
        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {customer.contacts.length === 0 ? (
              <EmptyState icon={Users} title="No contacts" />
            ) : (
              <ul className="space-y-3">
                {customer.contacts.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {c.name}
                        {c.isPrimary && (
                          <Badge tone="primary" className="ml-2">
                            Primary
                          </Badge>
                        )}
                      </p>
                      {c.title && (
                        <p className="text-xs text-[var(--muted)]">{c.title}</p>
                      )}
                      <p className="text-xs text-[var(--muted)]">
                        {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {customer.notes.length === 0 ? (
              <EmptyState icon={StickyNote} title="No notes" />
            ) : (
              <ul className="space-y-3">
                {customer.notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-2xl border border-[var(--border)] bg-white/40 p-3"
                  >
                    <p className="text-sm text-slate-900">{n.body}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {n.authorName ?? "—"} · {formatDate(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Emails */}
        <Card>
          <CardHeader>
            <CardTitle>Emails</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {customer.emails.length === 0 ? (
              <EmptyState icon={Mail} title="No emails" />
            ) : (
              <ul className="space-y-2">
                {customer.emails.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <Link
                      href={`/emails/${e.id}`}
                      className="min-w-0 flex-1 truncate text-sm text-slate-900 hover:underline"
                    >
                      {e.subject}
                    </Link>
                    <Badge tone={emailStatusTone(e.status)}>{e.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle>Follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {customer.followUps.length === 0 ? (
              <EmptyState icon={Clock} title="No follow-ups" />
            ) : (
              <ul className="space-y-2">
                {customer.followUps.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <Link
                      href={`/followups/${f.id}`}
                      className="min-w-0 flex-1 truncate text-sm text-slate-900 hover:underline"
                    >
                      {f.caseSubject}
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-[var(--muted)]">
                        {formatDate(f.scheduledAt)}
                      </span>
                      <Badge tone={followUpStatusTone(f.status)}>
                        {f.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | null;
  href?: string;
}) {
  if (!value) return null;
  const content = (
    <span className="inline-flex items-center gap-2 text-slate-900">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <span className="truncate">{value}</span>
    </span>
  );
  return href ? (
    <a href={href} className="hover:underline">
      {content}
    </a>
  ) : (
    content
  );
}
