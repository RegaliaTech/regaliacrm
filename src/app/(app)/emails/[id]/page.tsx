import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Mail, User, FileText, Calendar, AlertCircle, RefreshCw, Trash2, Reply } from "lucide-react";
import { requireUser, can, WRITE_ROLES } from "@/lib/rbac";
import { getEmail } from "@/lib/emails";
import { deleteEmailAction, resendEmail, markRepliedAction } from "@/app/(app)/emails/actions";
import { formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const email = await getEmail(id);

  if (!email) {
    notFound();
  }

  const canWrite = can(user.role, WRITE_ROLES);

  const handleDelete = async () => {
    "use server";
    const result = await deleteEmailAction(id);
    if (!result.error) {
      redirect("/emails");
    }
  };

  const handleResend = async () => {
    "use server";
    await resendEmail(id);
  };

  const handleMarkReplied = async () => {
    "use server";
    await markRepliedAction(id);
  };

  const statusTone = {
    SENT: "success" as const,
    DRAFT: "muted" as const,
    FAILED: "danger" as const,
  }[email.status];

  return (
    <div className="animate-in mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/emails"
          className={buttonClasses("ghost", "sm")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            Email Details
          </h1>
          <p className="text-sm text-[var(--muted)]">
            View email content and metadata
          </p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            {email.status === "SENT" && !email.repliedAt && (
              <form action={handleMarkReplied}>
                <button
                  type="submit"
                  className={buttonClasses("secondary", "sm")}
                >
                  <Reply className="h-4 w-4" /> Mark as replied
                </button>
              </form>
            )}
            {email.status === "FAILED" && (
              <form action={handleResend}>
                <button
                  type="submit"
                  className={buttonClasses("secondary", "sm")}
                >
                  <RefreshCw className="h-4 w-4" /> Resend
                </button>
              </form>
            )}
            {email.status === "DRAFT" && (
              <Link
                href={`/emails/${id}/edit`}
                className={buttonClasses("secondary", "sm")}
              >
                Edit draft
              </Link>
            )}
            <form action={handleDelete}>
              <button
                type="submit"
                className={buttonClasses("ghost", "sm")}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            </form>
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
                    {email.status}
                  </Badge>
                  {email.repliedAt && (
                    <Badge tone="success">Replied</Badge>
                  )}
                </div>
                {email.aiGenerated && (
                  <Badge tone="primary" className="mt-2">
                    AI Generated
                  </Badge>
                )}
              </div>
              {email.sentAt && (
                <div className="text-right">
                  <div className="text-sm text-[var(--muted)]">Sent</div>
                  <time className="text-sm font-medium text-slate-900">
                    {formatDate(email.sentAt)}
                  </time>
                </div>
              )}
            </div>

            {email.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="font-medium text-red-900">Error</div>
                    <div className="mt-1 text-sm text-red-700">{email.error}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="text-[var(--muted)]">To:</span>
                <span className="font-medium text-slate-900">{email.toEmail}</span>
              </div>

              {email.customer && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-[var(--muted)]">Customer:</span>
                  <Link
                    href={`/customers/${email.customer.id}`}
                    className="font-medium text-[var(--primary)] hover:underline"
                  >
                    {email.customer.name}
                    {email.customer.company && ` (${email.customer.company})`}
                  </Link>
                </div>
              )}

              {email.quotation && (
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-[var(--muted)]">Quotation:</span>
                  <Link
                    href={`/quotations/${email.quotation.id}`}
                    className="font-medium text-[var(--primary)] hover:underline"
                  >
                    {email.quotation.number}
                  </Link>
                </div>
              )}

              {email.sender && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-[var(--muted)]">Sent by:</span>
                  <span className="font-medium text-slate-900">{email.sender.name}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-[var(--muted)]">Created:</span>
                <time className="font-medium text-slate-900">
                  {formatDate(email.createdAt)}
                </time>
              </div>
            </div>
          </div>
        </Card>

        {/* Email content */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-[var(--muted)]">Subject</h3>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {email.subject}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-[var(--muted)]">Message</h3>
              <div className="mt-2 rounded-lg border border-[var(--border)] bg-slate-50 p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-900">
                  {email.body}
                </pre>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
