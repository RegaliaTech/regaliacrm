"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createUser, updateUser } from "../actions";
import type { Role } from "@prisma/client";

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
};

export default function UserFormDialog({
  user,
  onClose,
}: {
  user: User | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const isEdit = !!user;

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);

    const result = isEdit
      ? await updateUser(user.id, formData)
      : await createUser(formData);

    setLoading(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: isEdit ? "User updated successfully" : "User created successfully" });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            {isEdit ? "Edit User" : "Create New User"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form action={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={user?.name ?? ""}
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={user?.email ?? ""}
              required
              disabled={loading}
            />
          </div>

          {!isEdit && (
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
                disabled={loading}
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Minimum 8 characters
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="role">Role *</Label>
            <Select
              id="role"
              name="role"
              defaultValue={user?.role ?? "VIEWER"}
              required
              disabled={loading}
            >
              <option value="ADMIN">Admin - Full access</option>
              <option value="SALES">Sales - Create quotations</option>
              <option value="ACCOUNTS">Accounts - Financial access</option>
              <option value="VIEWER">Viewer - Read-only access</option>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              defaultChecked={user?.isActive ?? true}
              className="h-4 w-4 rounded border-gray-300"
              disabled={loading}
            />
            <Label htmlFor="isActive" className="font-normal">
              Active user account
            </Label>
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

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update User" : "Create User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
