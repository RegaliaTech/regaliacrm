"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ExpenseView } from "@/lib/expenses";
import {
  saveExpense,
  type ExpenseFormState,
} from "@/app/(app)/expenses/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function ExpenseForm({ expense }: { expense?: ExpenseView }) {
  const [state, formAction, pending] = useActionState<
    ExpenseFormState,
    FormData
  >(saveExpense, {});

  return (
    <form action={formAction} className="space-y-6">
      {expense && <input type="hidden" name="id" value={expense.id} />}

      <FormError error={state.error} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Expense details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    required
                    defaultValue={expense?.title}
                    placeholder="Studio + office rent"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    id="category"
                    name="category"
                    defaultValue={expense?.category ?? "OTHER"}
                  >
                    <option value="RENT">Rent</option>
                    <option value="UTILITIES">Utilities</option>
                    <option value="SALARIES">Salaries</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={expense?.amount ?? ""}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    name="currency"
                    defaultValue={expense?.currency ?? "AED"}
                  />
                </div>
                <div>
                  <Label htmlFor="incurredAt">Date incurred</Label>
                  <Input
                    id="incurredAt"
                    name="incurredAt"
                    type="date"
                    required
                    defaultValue={
                      expense ? toDateInputValue(expense.incurredAt) : ""
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={expense?.notes ?? ""}
                  placeholder="Optional details…"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Save</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <SubmitButton pending={pending} className="w-full">
                {expense ? "Save changes" : "Add expense"}
              </SubmitButton>
              <Link
                href="/expenses"
                className={buttonClasses("outline", "md", "w-full")}
              >
                Cancel
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
