import Link from "next/link";
import { Truck, Plus } from "lucide-react";
import { requireUser, can, WRITE_ROLES } from "@/lib/rbac";
import { getVendors } from "@/lib/vendors";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function VendorsPage() {
  const user = await requireUser();
  const vendors = await getVendors();
  const canWrite = can(user.role, WRITE_ROLES);

  return (
    <div className="animate-in mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            Vendors
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Suppliers, purchase receipts, and stock on hand.
          </p>
        </div>
        {canWrite && (
          <Link href="/vendors/new" className={buttonClasses("primary", "md")}>
            <Plus className="h-4 w-4" /> Add vendor
          </Link>
        )}
      </div>

      {vendors.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] px-6 py-16 text-center backdrop-blur-xl shadow-[var(--shadow-sm)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Truck className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-900">No vendors yet</p>
          <p className="text-sm text-[var(--muted)]">
            Add a vendor to start tracking receipts and stock.
          </p>
          {canWrite && (
            <Link href="/vendors/new" className={buttonClasses("primary", "sm", "mt-2")}>
              <Plus className="h-4 w-4" /> Add vendor
            </Link>
          )}
        </div>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Vendor</TH>
              <TH>Contact</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {vendors.map((v) => (
              <TR key={v.id}>
                <TD className="font-medium">
                  <Link href={`/vendors/${v.id}`} className="hover:underline">
                    {v.name}
                  </Link>
                </TD>
                <TD>
                  <span className="block">{v.contactName ?? "—"}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {v.email ?? v.phone ?? ""}
                  </span>
                </TD>
                <TD>
                  <Badge tone={v.isActive ? "success" : "muted"}>
                    {v.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
