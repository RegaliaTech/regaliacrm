import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Send, Download } from "lucide-react";
import { requireUser, can, WRITE_ROLES } from "@/lib/rbac";
import { getQuotation } from "@/lib/quotations";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { quotationStatusTone } from "@/lib/status";
import { DeleteQuotationButton } from "@/components/quotations/delete-quotation-button";

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const quotation = await getQuotation(id);

  if (!quotation) notFound();

  const canWrite = can(user.role, WRITE_ROLES);
  const createdDate = new Date(quotation.createdAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
  const issuedDate = quotation.issuedAt
    ? new Date(quotation.issuedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const validUntilDate = quotation.validUntil
    ? new Date(quotation.validUntil).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="animate-in mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-[var(--shadow-sm)] sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/quotations"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to quotations
          </Link>
          {canWrite && (
            <div className="flex gap-2">
              <a
                href={`/api/quotations/${quotation.id}/pdf`}
                download
                className={buttonClasses("outline", "sm")}
              >
                <Download className="h-4 w-4" /> Download PDF
              </a>
              {quotation.customer.email && (
                <a
                  href={`mailto:${quotation.customer.email}?subject=${encodeURIComponent(`Quotation ${quotation.number} from Regalia CMS`)}&body=${encodeURIComponent(`Dear ${quotation.customer.name},

Please find attached quotation ${quotation.number} for your review.

Quotation Details:
- Total: ${quotation.currency} ${quotation.total.toFixed(2)}
${quotation.validUntil ? `- Valid Until: ${new Date(quotation.validUntil).toLocaleDateString()}` : ""}

${quotation.notes ? `Notes:\n${quotation.notes}\n\n` : ""}Please download the PDF quotation from: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/quotations/${quotation.id}/pdf

If you have any questions or need clarification, please don't hesitate to contact us.

Best regards,
Regalia CMS Team`)}`}
                  className={buttonClasses("primary", "sm")}
                >
                  <Send className="h-4 w-4" /> Send via Email
                </a>
              )}
              {quotation.status === "DRAFT" && (
                <Link
                  href={`/quotations/${quotation.id}/edit`}
                  className={buttonClasses("outline", "sm")}
                >
                  <Pencil className="h-4 w-4" /> Edit
                </Link>
              )}
              <DeleteQuotationButton quotationId={quotation.id} />
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="p-6 pt-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--muted)]">
                  Quotation
                </p>
                <h1 className="text-3xl font-bold text-slate-900">
                  {quotation.number}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={quotationStatusTone(quotation.status as any)}>
                  {quotation.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-1 text-right">
              <p className="text-xs font-semibold uppercase text-[var(--muted)]">
                Total
              </p>
              <p className="text-3xl font-bold text-[var(--primary)]">
                {formatCurrency(quotation.total, quotation.currency)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer & Dates */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="font-semibold text-slate-900">
                {quotation.customer.name}
              </p>
              {quotation.customer.company && (
                <p className="text-sm text-[var(--muted)]">
                  {quotation.customer.company}
                </p>
              )}
              {quotation.customer.email && (
                <p className="text-sm text-[var(--muted)]">
                  {quotation.customer.email}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-[var(--muted)]">Created</p>
              <p className="font-semibold text-slate-900">{createdDate}</p>
            </div>
            {issuedDate && (
              <div>
                <p className="text-[var(--muted)]">Issued</p>
                <p className="font-semibold text-slate-900">{issuedDate}</p>
              </div>
            )}
            {validUntilDate && (
              <div>
                <p className="text-[var(--muted)]">Valid Until</p>
                <p className="font-semibold text-slate-900">{validUntilDate}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)]">
                <tr className="text-left text-xs font-medium text-[var(--muted)] uppercase">
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-4 w-20 text-right">Qty</th>
                  <th className="pb-3 pr-4 w-28 text-right">Unit Price</th>
                  <th className="pb-3 w-24 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {quotation.items.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--row-hover)]">
                    <td className="py-3 pr-4">
                      <div>
                        <p className="font-medium text-slate-900">
                          {item.description}
                        </p>
                        {item.product && (
                          <p className="text-xs text-[var(--muted)]">
                            SKU: {item.product.sku}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {item.quantity}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {formatCurrency(item.unitPrice, quotation.currency)}
                    </td>
                    <td className="py-3 text-right font-semibold">
                      {formatCurrency(item.lineTotal, quotation.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="p-6 pt-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">Subtotal</span>
              <span className="font-semibold">
                {formatCurrency(quotation.subtotal, quotation.currency)}
              </span>
            </div>
            {quotation.discountTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">
                  Discount ({quotation.discountRate}%)
                </span>
                <span className="font-semibold text-red-600">
                  -{formatCurrency(quotation.discountTotal, quotation.currency)}
                </span>
              </div>
            )}
            {quotation.taxTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">
                  Tax ({quotation.taxRate}%)
                </span>
                <span className="font-semibold">
                  +{formatCurrency(quotation.taxTotal, quotation.currency)}
                </span>
              </div>
            )}
            <div className="border-t border-[var(--border)] pt-3">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="text-xl font-bold text-[var(--primary)]">
                  {formatCurrency(quotation.total, quotation.currency)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {quotation.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 whitespace-pre-wrap">
            {quotation.notes}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
