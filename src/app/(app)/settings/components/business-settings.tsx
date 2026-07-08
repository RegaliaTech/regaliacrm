"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateBusinessSettings } from "../actions";
import { Save } from "lucide-react";

const CURRENCIES = [
  { value: "AED", label: "AED - UAE Dirham" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
];

const TIMEZONES = [
  { value: "Asia/Dubai", label: "Asia/Dubai (UAE)" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York (EST)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2026)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2026-12-31)" },
];

type Settings = {
  currency: string;
  defaultTaxRate: number;
  quotationPrefix: string;
  quotationValidityDays: number;
  defaultCommissionRate: number;
  timezone: string;
  dateFormat: string;
};

export default function BusinessSettings({ settings }: { settings: Settings }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);

    const result = await updateBusinessSettings(formData);

    setLoading(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Business settings updated successfully" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)]">Business Defaults</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Configure default values for quotations and invoices
        </p>
      </div>

      <div className="glass rounded-3xl p-6">
      <form action={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select
            id="currency"
            name="currency"
            defaultValue={settings.currency}
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
          <Input
            id="defaultTaxRate"
            name="defaultTaxRate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={settings.defaultTaxRate.toString()}
          />
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Default VAT/tax rate for quotations
          </p>
        </div>

        <div>
          <Label htmlFor="quotationPrefix">Quotation Number Prefix</Label>
          <Input
            id="quotationPrefix"
            name="quotationPrefix"
            defaultValue={settings.quotationPrefix}
            placeholder="QUO-"
          />
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Prefix for auto-generated quotation numbers (e.g., QUO-0001)
          </p>
        </div>

        <div>
          <Label htmlFor="quotationValidityDays">Quotation Validity (Days)</Label>
          <Input
            id="quotationValidityDays"
            name="quotationValidityDays"
            type="number"
            min="1"
            defaultValue={settings.quotationValidityDays}
          />
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Default number of days a quotation remains valid
          </p>
        </div>

        <div>
          <Label htmlFor="defaultCommissionRate">Default Commission Rate (%)</Label>
          <Input
            id="defaultCommissionRate"
            name="defaultCommissionRate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={settings.defaultCommissionRate.toString()}
          />
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Applied to sales reps without a custom rate on the Commissions page
          </p>
        </div>

        <hr className="my-6" />

        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            id="timezone"
            name="timezone"
            defaultValue={settings.timezone}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="dateFormat">Date Format</Label>
          <Select
            id="dateFormat"
            name="dateFormat"
            defaultValue={settings.dateFormat}
          >
            {DATE_FORMATS.map((df) => (
              <option key={df.value} value={df.value}>
                {df.label}
              </option>
            ))}
          </Select>
        </div>

        {message && (
          <div
            className={`rounded-lg p-3 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}
