import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { EmailForm } from "@/components/emails/email-form";

export default async function NewEmailPage() {
  await requireRole(WRITE_ROLES);

  // Fetch customers and quotations for select options
  const { data: customers } = await safeQuery(
    () =>
      prisma.customer.findMany({
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: { name: "asc" },
      }),
    [],
  );

  const { data: quotations } = await safeQuery(
    () =>
      prisma.quotation.findMany({
        select: {
          id: true,
          number: true,
          customerId: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100, // Limit to recent quotations
      }),
    [],
  );

  return (
    <div className="animate-in mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/emails"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to emails
        </Link>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900">
          Compose email
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Send an email to a customer and log it in the system.
        </p>
      </div>
      <EmailForm customers={customers} quotations={quotations} />
    </div>
  );
}
