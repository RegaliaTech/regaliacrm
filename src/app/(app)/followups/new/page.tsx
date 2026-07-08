import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { FollowUpForm } from "@/components/followups/followup-form";

export default async function NewFollowUpPage() {
  await requireRole(WRITE_ROLES);

  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="animate-in mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/followups"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to follow-ups
        </Link>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900">
          Schedule follow-up
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Set up an automated email follow-up for a customer.
        </p>
      </div>
      <FollowUpForm customers={customers} />
    </div>
  );
}
