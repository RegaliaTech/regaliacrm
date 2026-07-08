import Link from "next/link";
import { Plus, Repeat } from "lucide-react";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { listSequences } from "@/lib/sequences";
import { formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function SequencesPage() {
  await requireRole(WRITE_ROLES);
  const sequences = await listSequences();

  const tone = {
    ACTIVE: "primary" as const,
    COMPLETED: "success" as const,
    STOPPED: "muted" as const,
    CANCELLED: "danger" as const,
  };

  return (
    <div className="animate-in mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            <Repeat className="inline h-7 w-7 text-slate-600" /> AI Follow-up Sequences
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Multi-step automated chases that stop when the customer replies.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/followups" className={buttonClasses("ghost", "md")}>
            Back to follow-ups
          </Link>
          <Link
            href="/followups/sequences/new"
            className={buttonClasses("primary", "md")}
          >
            <Plus className="h-4 w-4" /> New sequence
          </Link>
        </div>
      </div>

      <Card className="p-0">
        <Table>
          <THead>
            <TR>
              <TH>Sequence</TH>
              <TH>Customer</TH>
              <TH>Status</TH>
              <TH>Progress</TH>
              <TH>Created</TH>
            </TR>
          </THead>
          <TBody>
            {sequences.length === 0 ? (
              <TR>
                <TD colSpan={5} className="text-center text-[var(--muted)]">
                  No sequences yet.
                </TD>
              </TR>
            ) : (
              sequences.map((s) => (
                <TR key={s.id}>
                  <TD>
                    <Link
                      href={`/followups/sequences/${s.id}`}
                      className="font-medium text-[var(--primary)] hover:underline"
                    >
                      {s.name}
                    </Link>
                    <div className="text-xs text-[var(--muted)]">{s.caseSubject}</div>
                  </TD>
                  <TD>
                    {s.customerName}
                    <div className="text-xs text-[var(--muted)]">
                      {s.customerEmail ?? "no email"}
                    </div>
                  </TD>
                  <TD>
                    <Badge tone={tone[s.status]}>{s.status}</Badge>
                  </TD>
                  <TD>
                    {s.sentSteps}/{s.stepCount} sent
                  </TD>
                  <TD>{formatDate(s.createdAt)}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
