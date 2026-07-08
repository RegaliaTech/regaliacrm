import Link from "next/link";
import { Truck, Plus } from "lucide-react";
import { requireUser, can, WRITE_ROLES } from "@/lib/rbac";
import { getVendors } from "@/lib/vendors";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default async function VendorsPage() {
  const user = await requireUser();
  const vendors = await getVendors();
  const canWrite = can(user.role, WRITE_ROLES);

  return (
    <div className="animate-in mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Vendors"
        description="Suppliers, purchase receipts, and stock on hand."
        action={
          canWrite && (
            <Link href="/vendors/new" className={buttonClasses("primary", "md")}>
              <Plus className="h-4 w-4" /> Add vendor
            </Link>
          )
        }
      />

      {vendors.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No vendors yet"
          description="Add a vendor to start tracking receipts and stock."
          action={
            canWrite && (
              <Link
                href="/vendors/new"
                className={buttonClasses("primary", "sm")}
              >
                <Plus className="h-4 w-4" /> Add vendor
              </Link>
            )
          }
        />
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
