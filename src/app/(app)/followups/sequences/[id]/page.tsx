import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, CheckCircle2, Clock, XCircle } from "lucide-react";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { getSequence } from "@/lib/sequences";
import { stopSequenceAction } from "@/app/(app)/followups/sequences/actions";
import { formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default async function SequenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(WRITE_ROLES);
  const { id } = await params;
  const seq = await getSequence(id);
  if (!seq) notFound();

  const handleStop = async () => {
    "use server";
    await stopSequenceAction(id);
  };

  const statusTone = {
    ACTIVE: "primary" as const,
    COMPLETED: "success" as const,
    STOPPED: "muted" as const,
    CANCELLED: "danger" as const,
  };

  const stepIcon = (status: string) => {
    switch (status) {
      case "SENT":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "SKIPPED":
        return <Ban className="h-4 w-4 text-slate-400" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="animate-in mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/followups/sequences" className={buttonClasses("ghost", "sm")}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            {seq.name}
          </h1>
          <p className="text-sm text-[var(--muted)]">{seq.caseSubject}</p>
        </div>
        {seq.status === "ACTIVE" && (
          <form action={handleStop}>
            <button type="submit" className={buttonClasses("ghost", "sm")}>
              <Ban className="h-4 w-4" /> Stop
            </button>
          </form>
        )}
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={statusTone[seq.status]}>{seq.status}</Badge>
          {seq.useAi && <Badge tone="primary">AI</Badge>}
          {seq.stopOnReply && <Badge tone="muted">Stops on reply</Badge>}
        </div>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-[var(--muted)]">Customer:</dt>
            <dd className="font-medium text-slate-900">
              {seq.customer.name}
              {seq.customer.email ? ` · ${seq.customer.email}` : ""}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-[var(--muted)]">Last reply:</dt>
            <dd className="font-medium text-slate-900">
              {seq.customer.lastRepliedAt
                ? formatDate(seq.customer.lastRepliedAt)
                : "—"}
            </dd>
          </div>
          {seq.notes && (
            <div className="flex gap-2">
              <dt className="text-[var(--muted)]">Notes:</dt>
              <dd className="text-slate-900">{seq.notes}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Steps</h2>
        <ol className="space-y-3">
          {seq.steps.map((step) => (
            <li
              key={step.id}
              className="flex items-start gap-3 rounded-lg border border-[var(--border)] p-3"
            >
              {stepIcon(step.status)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">
                    Step {step.stepOrder}
                  </span>
                  <Badge tone="muted">day +{step.delayDays}</Badge>
                  <Badge tone="muted">{step.status}</Badge>
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  {step.status === "SENT" && step.sentAt
                    ? `Sent ${formatDate(step.sentAt)}`
                    : `Scheduled ${formatDate(step.scheduledAt)}`}
                </div>
                {step.emailSubject && (
                  <div className="mt-1 text-sm text-slate-700">
                    {step.emailSubject}
                  </div>
                )}
                {step.error && (
                  <div className="mt-1 text-xs text-red-600">{step.error}</div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
