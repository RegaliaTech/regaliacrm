"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  saveCustomer,
  type CustomerFormState,
} from "@/app/(app)/customers/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CustomerForm() {
  const [state, formAction, pending] = useActionState<
    CustomerFormState,
    FormData
  >(saveCustomer, {});

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Customer details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required placeholder="John Carter" />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" name="company" placeholder="Acme Industrial" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@acme.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" placeholder="+971 50 000 0000" />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" name="website" placeholder="https://example.com" />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select id="status" name="status" defaultValue="LEAD">
                    <option value="LEAD">Lead</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="CHURNED">Churned</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  rows={3}
                  placeholder="Office address, city, country"
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  name="tags"
                  placeholder="VIP, Corporate, Wedding"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Comma-separated values.
                </p>
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
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Create customer"
                )}
              </Button>
              <Button
                type="submit"
                name="intent"
                value="create-and-quote"
                variant="outline"
                className="w-full"
                disabled={pending}
              >
                Create + send quotation
              </Button>
              <Link
                href="/customers"
                className={buttonClasses("outline", "md", "w-full")}
              >
                Cancel
              </Link>
              <p className="text-xs leading-relaxed text-[var(--muted)]">
                A customer profile can be expanded with contacts, notes, and quotation history in the next step.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
