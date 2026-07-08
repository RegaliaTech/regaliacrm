import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { getVendor } from "@/lib/vendors";
import { VendorForm } from "@/components/vendors/vendor-form";
import { deleteVendor } from "@/app/(app)/vendors/actions";
import { buttonClasses } from "@/components/ui/button";

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(WRITE_ROLES);
  const { id } = await params;
  const vendor = await getVendor(id);
  if (!vendor) notFound();

  return (
    <div className="animate-in mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Link
            href={`/vendors/${vendor.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to vendor
          </Link>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900">
            Edit {vendor.name}
          </h1>
        </div>
        <form action={deleteVendor}>
          <input type="hidden" name="id" value={vendor.id} />
          <button type="submit" className={buttonClasses("danger", "sm")}>
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </form>
      </div>
      <VendorForm vendor={vendor} />
    </div>
  );
}
