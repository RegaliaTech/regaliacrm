"use client";

import * as React from "react";
import { useActionState } from "react";
import { Plus, X, Tag } from "lucide-react";
import {
  createCategory,
  deleteCategory,
  type CategoryFormState,
} from "@/app/(app)/products/actions";
import type { CategoryView } from "@/lib/products";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

export function CategoryManager({
  categories,
  canWrite,
}: {
  categories: CategoryView[];
  canWrite: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState<
    CategoryFormState,
    FormData
  >(createCategory, {});
  const formRef = React.useRef<HTMLFormElement>(null);

  // Close + reset the input once a submission succeeds.
  const prevPending = React.useRef(pending);
  React.useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      formRef.current?.reset();
      setOpen(false);
    }
    prevPending.current = pending;
  }, [pending, state.error]);

  return (
    <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-2">
      <span className="inline-flex items-center gap-1.5 px-1.5 text-sm font-medium text-slate-600">
        <Tag className="h-3.5 w-3.5" /> Categories
      </span>

      {categories.length === 0 && (
        <span className="text-sm text-[var(--muted)]">None yet</span>
      )}

      {categories.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-sm text-slate-700"
        >
          {c.name}
          {canWrite && (
            <form action={deleteCategory}>
              <input type="hidden" name="id" value={c.id} />
              <button
                type="submit"
                aria-label={`Remove ${c.name}`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-[var(--danger)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </span>
      ))}

      {canWrite &&
        (open ? (
          <form
            ref={formRef}
            action={formAction}
            className="flex items-center gap-2"
          >
            <Input
              name="name"
              placeholder="Category name"
              autoFocus
              className="h-9 w-44"
            />
            <SubmitButton pending={pending} size="sm">
              Add
            </SubmitButton>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 py-1 px-3 text-sm font-medium text-[var(--primary)] hover:bg-indigo-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add category
          </button>
        ))}

      {state.error && (
        <div className="w-full">
          <FormError error={state.error} />
        </div>
      )}
    </div>
  );
}
