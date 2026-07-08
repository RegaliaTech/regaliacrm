import { requireUser } from "@/lib/rbac";
import { getCustomers } from "@/lib/customers";
import { getProducts } from "@/lib/products";
import { QuotationForm } from "@/components/quotations/quotation-form";

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; status?: string }>;
}) {
  await requireUser();
  const { customerId, status } = await searchParams;
  const customers = await getCustomers();
  const products = await getProducts();

  const initialCustomerId =
    customerId && customers.some((c) => c.id === customerId)
      ? customerId
      : undefined;
  const initialStatus =
    status === "SENT" || status === "DRAFT" ? status : undefined;

  return (
    <div className="animate-in mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
          New Quotation
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Create a new quotation for your customer.
        </p>
      </div>

      <QuotationForm
        customers={customers}
        products={products}
        initialCustomerId={initialCustomerId}
        initialStatus={initialStatus}
      />
    </div>
  );
}
