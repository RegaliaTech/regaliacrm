import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { VendorForm } from "@/components/vendors/vendor-form";

export default async function NewVendorPage() {
  await requireRole(WRITE_ROLES);

  return (
    <div className="animate-in mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/vendors"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to vendors
        </Link>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900">
          Add vendor
        </h1>
      </div>
      <VendorForm />
    </div>
  );
}
