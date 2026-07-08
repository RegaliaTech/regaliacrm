import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { getCustomersForBulk } from "@/lib/bulk-emails";
import { buttonClasses } from "@/components/ui/button";
import { BulkEmailForm } from "@/components/emails/bulk-email-form";

export default async function NewBulkEmailPage() {
  await requireRole(WRITE_ROLES);
  const customers = await getCustomersForBulk();

  return (
    <div className="animate-in mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/emails/bulk" className={buttonClasses("ghost", "sm")}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            New bulk campaign
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Pick recipients and compose your message.
          </p>
        </div>
      </div>

      <BulkEmailForm customers={customers} />
    </div>
  );
}
