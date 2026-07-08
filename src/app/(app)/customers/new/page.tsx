import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { CustomerForm } from "@/components/customers/customer-form";

export default async function NewCustomerPage() {
  await requireRole(WRITE_ROLES);

  return (
    <div className="animate-in mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to customers
        </Link>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900">
          New customer
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Add a customer profile so you can track interactions and quotations.
        </p>
      </div>
      <CustomerForm />
    </div>
  );
}
