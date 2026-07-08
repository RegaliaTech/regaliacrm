"use client";

import { Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { deleteQuotation } from "@/app/(app)/quotations/actions";

export function DeleteQuotationButton({ quotationId }: { quotationId: string }) {
  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Delete this quotation?")) return;
    
    const formData = new FormData();
    formData.append("id", quotationId);
    await deleteQuotation(formData);
  };

  return (
    <form onSubmit={handleDelete} className="inline">
      <input type="hidden" name="id" value={quotationId} />
      <button
        type="submit"
        className={buttonClasses("outline", "sm", "text-red-600 hover:bg-red-50")}
      >
        <Trash2 className="h-4 w-4" /> Delete
      </button>
    </form>
  );
}
