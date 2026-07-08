import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock, User, Calendar, Mail, AlertCircle, Send, Ban, Trash2 } from "lucide-react";
import { requireUser, can, WRITE_ROLES } from "@/lib/rbac";
import { getFollowUp } from "@/lib/followups";
import { deleteFollowUpAction, cancelFollowUp, sendFollowUpNow, approveFollowUp } from "@/app/(app)/followups/actions";
import { formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default async function FollowUpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const followUp = await getFollowUp(id);

  if (!followUp) {
    notFound();
  }

  const canWrite = can(user.role, WRITE_ROLES);
  const needsReview = followUp.reviewStatus === "PENDING_REVIEW";
  const canApprove = canWrite && needsReview;
  const canSend = canWrite && followUp.status === "SCHEDULED" && !needsReview;
  const canCancel = canWrite && followUp.status === "SCHEDULED";
  const canDelete = canWrite && followUp.status !== "SENT";

  const handleDelete = async () => {
    "use server";
    const result = await deleteFollowUpAction(id);
    if (!result.error) {
      redirect("/followups");
    }
  };

  const handleCancel = async () => {
    "use server";
    await cancelFollowUp(id);
  };

  const handleSendNow = async () => {
    "use server";
    await sendFollowUpNow(id);
  };

  const handleApprove = async () => {
    "use server";
    await approveFollowUp(id);
  };

  const statusTone = {
    SCHEDULED: "primary" as const,
    SENT: "success" as const,
    CANCELLED: "muted" as const,
    FAILED: "danger" as const,
  }[followUp.status];

  return (
    <div className="animate-in mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/followups"
          className={buttonClasses("ghost", "sm")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            Follow-up Details
          </h1>
          <p className="text-sm text-[var(--muted)]">
            View scheduled follow-up information
          </p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            {canApprove && (
              <form action={handleApprove}>
                <button
                  type="submit"
                  className={buttonClasses("primary", "sm")}
                >
                  Approve
                </button>
              </form>
            )}
            {canSend && (
              <form action={handleSendNow}>
                <button
                  type="submit"
                  className={buttonClasses("primary", "sm")}
                >
                  <Send className="h-4 w-4" /> Send now
                </button>
              </form>
            )}
            {canCancel && (
              <form action={handleCancel}>
                <button
                  type="submit"
                  className={buttonClasses("secondary", "sm")}
                >
                  <Ban className="h-4 w-4" /> Cancel
                </button>
              </form>
            )}
            {canDelete && (
              <form action={handleDelete}>
                <button
                  type="submit"
                  className={buttonClasses("ghost", "sm")}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {/* Status and metadata */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">Status</h2>
                  <Badge tone={statusTone}>
                    {followUp.status}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {followUp.useAi && <Badge tone="primary">AI Generated</Badge>}
                  {followUp.autoCreated && (
                    <Badge tone="warning">Auto-created</Badge>
                  )}
                  {needsReview && (
                    <Badge tone="danger">Pending review</Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-[var(--muted)]">Scheduled</div>
                <time className="text-sm font-medium text-slate-900">
                  {formatDate(followUp.scheduledAt)}
                </time>
              </div>
            </div>

            {followUp.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="font-medium text-red-900">Error</div>
                    <div className="mt-1 text-sm text-red-700">{followUp.error}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-[var(--muted)]">Customer:</span>
                <Link
                  href={`/customers/${followUp.customer.id}`}
                  className="font-medium text-[var(--primary)] hover:underline"
                >
                  {followUp.customer.name}
                  {followUp.customer.company && ` (${followUp.customer.company})`}
                </Link>
              </div>

              {followUp.customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-[var(--muted)]">Email:</span>
                  <span className="font-medium text-slate-900">
                    {followUp.customer.email}
                  </span>
                </div>
              )}

              {followUp.creator && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-[var(--muted)]">Created by:</span>
                  <span className="font-medium text-slate-900">{followUp.creator.name}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-[var(--muted)]">Created:</span>
                <time className="font-medium text-slate-900">
                  {formatDate(followUp.createdAt)}
                </time>
              </div>

              {followUp.sentAt && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="text-[var(--muted)]">Sent:</span>
                  <time className="font-medium text-slate-900">
                    {formatDate(followUp.sentAt)}
                  </time>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Follow-up details */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-[var(--muted)]">Case subject</h3>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {followUp.caseSubject}
              </p>
            </div>

            {followUp.notes && (
              <div>
                <h3 className="text-sm font-medium text-[var(--muted)]">Internal notes</h3>
                <div className="mt-2 rounded-lg border border-[var(--border)] bg-slate-50 p-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-900">
                    {followUp.notes}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Email content */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-[var(--muted)]">Email subject</h3>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {followUp.emailSubject}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-[var(--muted)]">Email body</h3>
              {followUp.emailBody ? (
                <div className="mt-2 rounded-lg border border-[var(--border)] bg-slate-50 p-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-900">
                    {followUp.emailBody}
                  </pre>
                </div>
              ) : (
                <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm text-blue-900">
                    {followUp.useAi
                      ? "Email content will be generated by AI at send time"
                      : "No email body provided"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
