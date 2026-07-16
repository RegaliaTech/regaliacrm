import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { getProduct, getCategories } from "@/lib/products";
import { ProductForm } from "@/components/products/product-form";
import { deleteProduct } from "@/app/(app)/products/actions";
import { buttonClasses } from "@/components/ui/button";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(WRITE_ROLES);
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const categories = (await getCategories()).map((c) => c.name);

  return (
    <div className="animate-in mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Link
            href={`/products/${product.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to product
          </Link>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900">
            Edit {product.name}
          </h1>
        </div>
        <form action={deleteProduct}>
          <input type="hidden" name="id" value={product.id} />
          <button type="submit" className={buttonClasses("danger", "sm")}>
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </form>
      </div>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
