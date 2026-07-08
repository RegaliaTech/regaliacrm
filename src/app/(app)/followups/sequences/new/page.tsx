import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { getCustomers } from "@/lib/customers";
import { buttonClasses } from "@/components/ui/button";
import { SequenceForm } from "@/components/followups/sequence-form";

export default async function NewSequencePage() {
  await requireRole(WRITE_ROLES);
  const customers = await getCustomers();

  return (
    <div className="animate-in mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/followups/sequences" className={buttonClasses("ghost", "sm")}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            New AI sequence
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Schedule an escalating multi-step follow-up.
          </p>
        </div>
      </div>

      <SequenceForm
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
        }))}
      />
    </div>
  );
}
