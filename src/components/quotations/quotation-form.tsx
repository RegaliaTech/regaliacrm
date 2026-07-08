"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import type { QuotationView } from "@/lib/quotations";
import type { ProductView } from "@/lib/products";
import type { CustomerView } from "@/lib/customers";
import {
  saveQuotation,
  type QuotationFormState,
} from "@/app/(app)/quotations/actions";
import { calculateTotals } from "@/lib/quotations";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type LineItem = {
  id?: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
};

interface QuotationFormProps {
  quotation?: QuotationView;
  customers: CustomerView[];
  products: ProductView[];
  initialCustomerId?: string;
  initialStatus?: "DRAFT" | "SENT";
}

export function QuotationForm({
  quotation,
  customers,
  products,
  initialCustomerId,
  initialStatus,
}: QuotationFormProps) {
  const [state, formAction, pending] = useActionState<
    QuotationFormState,
    FormData
  >(saveQuotation, {});

  const [items, setItems] = React.useState<LineItem[]>(
    quotation?.items?.length
      ? quotation.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))
      : [{ description: "", quantity: 1, unitPrice: 0 }]
  );

  const [customerId, setCustomerId] = React.useState(
    quotation?.customerId || initialCustomerId || ""
  );
  const [status, setStatus] = React.useState(
    quotation?.status || initialStatus || "DRAFT"
  );
  const [taxRate, setTaxRate] = React.useState(
    quotation?.taxRate || 0
  );
  const [discountRate, setDiscountRate] = React.useState(
    quotation?.discountRate || 0
  );
  const [validUntil, setValidUntil] = React.useState(
    quotation?.validUntil
      ? new Date(quotation.validUntil).toISOString().split("T")[0]
      : ""
  );

  // Calculate totals dynamically
  const totals = calculateTotals(items, taxRate, discountRate);

  const handleAddItem = () => {
    setItems([
      ...items,
      { description: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof LineItem,
    value: any
  ) => {
    setItems(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === "quantity" || field === "unitPrice"
                  ? parseFloat(value) || 0
                  : value,
            }
          : item
      )
    );
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      handleItemChange(index, "productId", productId);
      handleItemChange(index, "description", product.name);
      handleItemChange(index, "unitPrice", product.unitPrice);
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      {quotation && <input type="hidden" name="id" value={quotation.id} />}
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(items.map((item) => ({
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })))}
      />

      <FormError error={state.error} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Customer & Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Customer & Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <Label htmlFor="customerId">Customer *</Label>
                <Select
                  id="customerId"
                  name="customerId"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  <option value="">Select a customer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` — ${c.company}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    id="status"
                    name="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="REJECTED">Rejected</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="validUntil">Valid Until</Label>
                  <Input
                    id="validUntil"
                    name="validUntil"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  defaultValue={quotation?.notes || ""}
                  placeholder="Add any additional notes or special instructions…"
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Items</CardTitle>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add item
              </button>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[var(--border)]">
                    <tr className="text-left text-xs font-medium text-[var(--muted)] uppercase">
                      <th className="pb-2 pr-2">Product</th>
                      <th className="pb-2 pr-2 w-20 text-right">Qty</th>
                      <th className="pb-2 pr-2 w-28 text-right">Unit Price</th>
                      <th className="pb-2 w-24 text-right">Total</th>
                      <th className="pb-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {items.map((item, i) => (
                      <tr key={i} className="align-top">
                        <td className="py-2 pr-2">
                          <div className="space-y-1">
                            <Select
                              value={item.productId || ""}
                              onChange={(e) =>
                                handleProductSelect(i, e.target.value)
                              }
                              className="text-xs"
                            >
                              <option value="">Select product (optional)</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </Select>
                            <Input
                              type="text"
                              value={item.description}
                              onChange={(e) =>
                                handleItemChange(i, "description", e.target.value)
                              }
                              placeholder="Item description"
                              className="text-xs"
                            />
                          </div>
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                i,
                                "quantity",
                                e.target.value
                              )
                            }
                            className="text-xs text-right"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(
                                i,
                                "unitPrice",
                                e.target.value
                              )
                            }
                            className="text-xs text-right"
                          />
                        </td>
                        <td className="py-2 text-right font-semibold">
                          {formatCurrency(
                            item.quantity * item.unitPrice,
                            "AED"
                          )}
                        </td>
                        <td className="py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(i)}
                            disabled={items.length === 1}
                            className="inline-flex items-center justify-center text-[var(--muted)] hover:text-red-600 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    name="taxRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="discountRate">Discount Rate (%)</Label>
                  <Input
                    id="discountRate"
                    name="discountRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={discountRate}
                    onChange={(e) =>
                      setDiscountRate(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Totals Sidebar */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Subtotal</span>
                <span className="font-semibold">
                  {formatCurrency(totals.subtotal, "AED")}
                </span>
              </div>
              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Discount</span>
                  <span className="font-semibold text-red-600">
                    -{formatCurrency(totals.discountTotal, "AED")}
                  </span>
                </div>
              )}
              {totals.taxTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Tax</span>
                  <span className="font-semibold">
                    +{formatCurrency(totals.taxTotal, "AED")}
                  </span>
                </div>
              )}
              <div className="border-t border-[var(--border)] pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="text-xl font-bold text-[var(--primary)]">
                    {formatCurrency(totals.total, "AED")}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <SubmitButton pending={pending} className="w-full">
                  {quotation
                    ? "Update Quotation"
                    : status === "SENT"
                      ? "Create & Send Quotation"
                      : "Create Quotation"}
                </SubmitButton>
                <Link
                  href="/quotations"
                  className={buttonClasses("outline", "md", "w-full")}
                >
                  Cancel
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
