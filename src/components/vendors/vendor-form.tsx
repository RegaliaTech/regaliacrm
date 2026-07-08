"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { VendorDetail } from "@/lib/vendors";
import { saveVendor, type VendorFormState } from "@/app/(app)/vendors/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VendorForm({ vendor }: { vendor?: VendorDetail }) {
  const [state, formAction, pending] = useActionState<
    VendorFormState,
    FormData
  >(saveVendor, {});

  return (
    <form action={formAction} className="space-y-6">
      {vendor && <input type="hidden" name="id" value={vendor.id} />}

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Vendor details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={vendor?.name}
                    placeholder="Acme Supplies LLC"
                  />
                </div>
                <div>
                  <Label htmlFor="contactName">Contact person</Label>
                  <Input
                    id="contactName"
                    name="contactName"
                    defaultValue={vendor?.contactName ?? ""}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={vendor?.email ?? ""}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" defaultValue={vendor?.phone ?? ""} />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  rows={2}
                  defaultValue={vendor?.address ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={vendor?.notes ?? ""}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="isActive"
                  value="true"
                  defaultChecked={vendor?.isActive ?? true}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Active vendor
              </label>
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
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {vendor ? "Save changes" : "Add vendor"}
              </Button>
              <Link
                href="/vendors"
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
