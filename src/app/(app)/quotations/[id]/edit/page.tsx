import { notFound } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { getQuotation } from "@/lib/quotations";
import { getCustomers } from "@/lib/customers";
import { getProducts } from "@/lib/products";
import { QuotationForm } from "@/components/quotations/quotation-form";

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const quotation = await getQuotation(id);

  if (!quotation) notFound();

  const customers = await getCustomers();
  const products = await getProducts();

  return (
    <div className="animate-in mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
          Edit Quotation
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Update quotation {quotation.number}.
        </p>
      </div>

      <QuotationForm
        quotation={quotation}
        customers={customers}
        products={products}
      />
    </div>
  );
}
