import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Trash2, AlertTriangle } from "lucide-react";
import { requireUser, can, WRITE_ROLES } from "@/lib/rbac";
import { getVendor } from "@/lib/vendors";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  addReceipt,
  deleteReceipt,
  addStock,
  adjustStock,
  deleteStock,
} from "../actions";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const vendor = await getVendor(id);
  if (!vendor) notFound();

  const canWrite = can(user.role, WRITE_ROLES);
  const totalReceipts = vendor.receipts.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="animate-in mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Link
            href="/vendors"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to vendors
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
              {vendor.name}
            </h1>
            <Badge tone={vendor.isActive ? "success" : "muted"}>
              {vendor.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        {canWrite && (
          <Link href={`/vendors/${vendor.id}/edit`} className={buttonClasses("outline", "sm")}>
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium text-slate-900">{vendor.contactName ?? "—"}</p>
            <p className="text-[var(--muted)]">{vendor.email ?? "—"}</p>
            <p className="text-[var(--muted)]">{vendor.phone ?? "—"}</p>
            {vendor.address && <p className="text-[var(--muted)]">{vendor.address}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">
              {formatCurrency(totalReceipts)}
            </p>
            <p className="text-sm text-[var(--muted)]">{vendor.receipts.length} recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Receipts */}
      <Card>
        <CardHeader>
          <CardTitle>Receipts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {canWrite && (
            <form
              action={addReceipt}
              className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--border)] p-3"
            >
              <input type="hidden" name="vendorId" value={vendor.id} />
              <div className="flex-1 min-w-40">
                <label className="text-xs text-[var(--muted)]">Description</label>
                <Input name="description" required placeholder="Studio lighting rental" />
              </div>
              <div className="w-28">
                <label className="text-xs text-[var(--muted)]">Receipt #</label>
                <Input name="receiptNumber" />
              </div>
              <div className="w-28">
                <label className="text-xs text-[var(--muted)]">Amount</label>
                <Input name="amount" type="number" step="0.01" min="0.01" required />
              </div>
              <div className="w-36">
                <label className="text-xs text-[var(--muted)]">Date</label>
                <Input name="receiptDate" type="date" required defaultValue={today()} />
              </div>
              <button type="submit" className={buttonClasses("primary", "sm")}>
                <Plus className="h-4 w-4" /> Add
              </button>
            </form>
          )}

          {vendor.receipts.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              No receipts recorded yet.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Description</TH>
                  <TH>Receipt #</TH>
                  <TH>Date</TH>
                  <TH className="text-right">Amount</TH>
                  {canWrite && <TH className="text-right">Actions</TH>}
                </TR>
              </THead>
              <TBody>
                {vendor.receipts.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium">{r.description}</TD>
                    <TD>{r.receiptNumber ?? "—"}</TD>
                    <TD>{formatDate(r.receiptDate)}</TD>
                    <TD className="whitespace-nowrap text-right tabular-nums">
                      {formatCurrency(r.amount, r.currency)}
                    </TD>
                    {canWrite && (
                      <TD className="text-right">
                        <form action={deleteReceipt}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="vendorId" value={vendor.id} />
                          <button type="submit" className="text-slate-400 hover:text-[var(--danger)]">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stock */}
      <Card>
        <CardHeader>
          <CardTitle>Stock supplied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {canWrite && (
            <form
              action={addStock}
              className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--border)] p-3"
            >
              <input type="hidden" name="vendorId" value={vendor.id} />
              <div className="flex-1 min-w-40">
                <label className="text-xs text-[var(--muted)]">Item name</label>
                <Input name="itemName" required placeholder="LED panel lights" />
              </div>
              <div className="w-24">
                <label className="text-xs text-[var(--muted)]">Quantity</label>
                <Input name="quantity" type="number" required defaultValue={0} />
              </div>
              <div className="w-20">
                <label className="text-xs text-[var(--muted)]">Unit</label>
                <Input name="unit" defaultValue="pcs" />
              </div>
              <div className="w-28">
                <label className="text-xs text-[var(--muted)]">Reorder level</label>
                <Input name="reorderLevel" type="number" />
              </div>
              <button type="submit" className={buttonClasses("primary", "sm")}>
                <Plus className="h-4 w-4" /> Add
              </button>
            </form>
          )}

          {vendor.stock.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              No stock items tracked for this vendor.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Item</TH>
                  <TH className="text-right">Quantity</TH>
                  <TH>Last restocked</TH>
                  {canWrite && <TH className="text-right">Actions</TH>}
                </TR>
              </THead>
              <TBody>
                {vendor.stock.map((s) => {
                  const low = s.reorderLevel != null && s.quantity <= s.reorderLevel;
                  return (
                    <TR key={s.id}>
                      <TD className="font-medium">
                        {s.itemName}
                        {s.productName && (
                          <span className="ml-2 text-xs text-[var(--muted)]">
                            ({s.productName})
                          </span>
                        )}
                      </TD>
                      <TD className="text-right tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          {low && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                          {s.quantity} {s.unit}
                        </span>
                      </TD>
                      <TD>{formatDate(s.lastRestockedAt)}</TD>
                      {canWrite && (
                        <TD className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <form action={adjustStock}>
                              <input type="hidden" name="id" value={s.id} />
                              <input type="hidden" name="vendorId" value={vendor.id} />
                              <input type="hidden" name="delta" value="-1" />
                              <button type="submit" className={buttonClasses("outline", "sm")}>
                                -1
                              </button>
                            </form>
                            <form action={adjustStock}>
                              <input type="hidden" name="id" value={s.id} />
                              <input type="hidden" name="vendorId" value={vendor.id} />
                              <input type="hidden" name="delta" value="1" />
                              <button type="submit" className={buttonClasses("outline", "sm")}>
                                +1
                              </button>
                            </form>
                            <form action={deleteStock}>
                              <input type="hidden" name="id" value={s.id} />
                              <input type="hidden" name="vendorId" value={vendor.id} />
                              <button type="submit" className="text-slate-400 hover:text-[var(--danger)]">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </form>
                          </div>
                        </TD>
                      )}
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
