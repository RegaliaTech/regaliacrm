"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateProfile } from "../actions";
import { Save, User as UserIcon } from "lucide-react";

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
};

export default function ProfileSettings({ user }: { user: User }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);

    const result = await updateProfile(formData);

    setLoading(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Profile updated successfully" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--foreground)]">
          My Profile
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Update your personal account information
        </p>
      </div>

      <div className="glass rounded-3xl p-6">
      <form action={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            name="name"
            defaultValue={user.name ?? ""}
            required
          />
        </div>

        <div>
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={user.email ?? ""}
            required
          />
        </div>

        <div>
          <Label>Role</Label>
          <div className="mt-2">
            <Badge tone="muted" className="text-sm">
              {user.role}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Contact an administrator to change your role
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
