"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateCompanySettings } from "../actions";
import { Save } from "lucide-react";

type Settings = {
  companyName: string;
  companyLogo: string | null;
  companyAddress: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyWebsite: string | null;
};

export default function CompanySettings({ settings }: { settings: Settings }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);

    const result = await updateCompanySettings(formData);

    setLoading(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Company settings updated successfully" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)]">Company Information</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Update your company details and branding
        </p>
      </div>

      <div className="glass rounded-3xl p-6">
      <form action={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            name="companyName"
            defaultValue={settings.companyName}
            required
          />
        </div>

        <div>
          <Label htmlFor="companyEmail">Company Email</Label>
          <Input
            id="companyEmail"
            name="companyEmail"
            type="email"
            defaultValue={settings.companyEmail ?? ""}
          />
        </div>

        <div>
          <Label htmlFor="companyPhone">Phone</Label>
          <Input
            id="companyPhone"
            name="companyPhone"
            defaultValue={settings.companyPhone ?? ""}
          />
        </div>

        <div>
          <Label htmlFor="companyWebsite">Website</Label>
          <Input
            id="companyWebsite"
            name="companyWebsite"
            type="url"
            defaultValue={settings.companyWebsite ?? ""}
            placeholder="https://"
          />
        </div>

        <div>
          <Label htmlFor="companyAddress">Address</Label>
          <Textarea
            id="companyAddress"
            name="companyAddress"
            defaultValue={settings.companyAddress ?? ""}
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="companyLogo">Logo URL</Label>
          <Input
            id="companyLogo"
            name="companyLogo"
            defaultValue={settings.companyLogo ?? ""}
            placeholder="https://example.com/logo.png"
          />
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            URL to your company logo image
          </p>
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
