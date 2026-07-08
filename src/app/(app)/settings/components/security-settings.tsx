"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { changePassword } from "../actions";
import { Save, Lock } from "lucide-react";

export default function SecuritySettings() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);

    const result = await changePassword(formData);

    setLoading(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Password changed successfully" });
      // Clear form
      const form = document.getElementById("password-form") as HTMLFormElement;
      form?.reset();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)]">
          Security
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Manage your password and security settings
        </p>
      </div>

      <div className="glass rounded-3xl p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Change Password</h3>
      <form id="password-form" action={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="currentPassword">Current Password *</Label>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
          />
        </div>

        <div>
          <Label htmlFor="newPassword">New Password *</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={8}
          />
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Must be at least 8 characters
          </p>
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm New Password *</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
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

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            <Lock className="mr-2 h-4 w-4" />
            {loading ? "Updating..." : "Change Password"}
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}
