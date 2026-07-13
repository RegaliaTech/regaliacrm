"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateEmailSettings } from "../actions";
import { Save, Mail } from "lucide-react";

type Settings = {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  smtpPassword: string | null;
  smtpFrom: string | null;
  smtpFromName: string | null;
  smtpSecure: boolean;
};

export default function EmailSettings({ settings }: { settings: Settings }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);

    const result = await updateEmailSettings(formData);

    setLoading(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Email settings updated successfully" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)]">
          Email & SMTP Configuration
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Configure SMTP settings for sending quotations and follow-up emails
        </p>
      </div>

      <div className="glass rounded-3xl p-6">
      <form action={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="smtpHost">SMTP Host</Label>
            <Input
              id="smtpHost"
              name="smtpHost"
              defaultValue={settings.smtpHost ?? ""}
              placeholder="smtp.gmail.com"
            />
          </div>

          <div>
            <Label htmlFor="smtpPort">SMTP Port</Label>
            <Input
              id="smtpPort"
              name="smtpPort"
              type="number"
              defaultValue={settings.smtpPort ?? 587}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="smtpUsername">SMTP Username</Label>
          <Input
            id="smtpUsername"
            name="smtpUsername"
            defaultValue={settings.smtpUsername ?? ""}
            placeholder="your-email@gmail.com"
          />
        </div>

        <div>
          <Label htmlFor="smtpPassword">SMTP Password</Label>
          <Input
            id="smtpPassword"
            name="smtpPassword"
            type="password"
            defaultValue={settings.smtpPassword ?? ""}
            placeholder="••••••••••••"
          />
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            For Gmail, use an app-specific password
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="smtpSecure"
            name="smtpSecure"
            defaultChecked={settings.smtpSecure}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="smtpSecure" className="font-normal">
            Use TLS/SSL
          </Label>
        </div>

        <hr className="my-6" />

        <div>
          <Label htmlFor="smtpFrom">From Email</Label>
          <Input
            id="smtpFrom"
            name="smtpFrom"
            type="email"
            defaultValue={settings.smtpFrom ?? ""}
            placeholder="noreply@yourcompany.com"
          />
        </div>

        <div>
          <Label htmlFor="smtpFromName">From Name</Label>
          <Input
            id="smtpFromName"
            name="smtpFromName"
            defaultValue={settings.smtpFromName ?? ""}
            placeholder="Regalia CRM"
          />
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

        <div className="flex justify-end gap-2">
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
