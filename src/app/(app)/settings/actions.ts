"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/rbac";
import { updateSettings } from "@/lib/settings";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Company Settings (ADMIN only)
// ---------------------------------------------------------------------------

const companySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyLogo: z.string().optional().nullable(),
  companyAddress: z.string().optional().nullable(),
  companyPhone: z.string().optional().nullable(),
  companyEmail: z.string().email().optional().or(z.literal("")).nullable(),
  companyWebsite: z.string().url().optional().or(z.literal("")).nullable(),
});

export async function updateCompanySettings(formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  
  const parsed = companySchema.safeParse({
    companyName: formData.get("companyName"),
    companyLogo: formData.get("companyLogo") || null,
    companyAddress: formData.get("companyAddress") || null,
    companyPhone: formData.get("companyPhone") || null,
    companyEmail: formData.get("companyEmail") || null,
    companyWebsite: formData.get("companyWebsite") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await updateSettings(parsed.data, user.id);
  revalidatePath("/settings");
  
  return { success: true };
}

// ---------------------------------------------------------------------------
// Email/SMTP Settings (ADMIN only)
// ---------------------------------------------------------------------------

const emailSchema = z.object({
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional().nullable(),
  smtpUsername: z.string().optional().nullable(),
  smtpPassword: z.string().optional().nullable(),
  smtpFrom: z.string().email().optional().or(z.literal("")).nullable(),
  smtpFromName: z.string().optional().nullable(),
  smtpSecure: z.boolean().default(false),
});

export async function updateEmailSettings(formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  
  const parsed = emailSchema.safeParse({
    smtpHost: formData.get("smtpHost") || null,
    smtpPort: formData.get("smtpPort") || null,
    smtpUsername: formData.get("smtpUsername") || null,
    smtpPassword: formData.get("smtpPassword") || null,
    smtpFrom: formData.get("smtpFrom") || null,
    smtpFromName: formData.get("smtpFromName") || null,
    smtpSecure: formData.get("smtpSecure") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await updateSettings(parsed.data, user.id);
  revalidatePath("/settings");
  
  return { success: true };
}

// ---------------------------------------------------------------------------
// Business Settings (ADMIN only)
// ---------------------------------------------------------------------------

const businessSchema = z.object({
  currency: z.string().min(1),
  defaultTaxRate: z.coerce.number().min(0).max(100),
  quotationPrefix: z.string().min(1),
  quotationValidityDays: z.coerce.number().int().min(1),
  defaultCommissionRate: z.coerce.number().min(0).max(100),
  timezone: z.string().min(1),
  dateFormat: z.string().min(1),
});

export async function updateBusinessSettings(formData: FormData) {
  const user = await requireRole(["ADMIN"]);

  const parsed = businessSchema.safeParse({
    currency: formData.get("currency"),
    defaultTaxRate: formData.get("defaultTaxRate"),
    quotationPrefix: formData.get("quotationPrefix"),
    quotationValidityDays: formData.get("quotationValidityDays"),
    defaultCommissionRate: formData.get("defaultCommissionRate"),
    timezone: formData.get("timezone"),
    dateFormat: formData.get("dateFormat"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await updateSettings(parsed.data, user.id);
  revalidatePath("/settings");
  
  return { success: true };
}

// ---------------------------------------------------------------------------
// User Profile (All users)
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
});

export async function updateProfile(formData: FormData) {
  const user = await requireUser();

  if (user.id === "preview-user") {
    return {
      error:
        "This is a preview session with no real account — profile changes can't be saved.",
    };
  }

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Check if email is already taken by another user
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (existing && existing.id !== user.id) {
    return { error: "Email already in use" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Change Password (All users)
// ---------------------------------------------------------------------------

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function changePassword(formData: FormData) {
  const user = await requireUser();

  if (user.id === "preview-user") {
    return {
      error:
        "This is a preview session with no real account — password changes can't be saved.",
    };
  }

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Verify current password
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!dbUser) {
    return { error: "User not found" };
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, dbUser.passwordHash);
  if (!valid) {
    return { error: "Current password is incorrect" };
  }

  // Hash and update new password
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// User Management (ADMIN only)
// ---------------------------------------------------------------------------

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "SALES", "ACCOUNTS", "VIEWER"]),
  isActive: z.boolean().default(true),
});

export async function createUser(formData: FormData) {
  await requireRole(["ADMIN"]);
  
  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (existing) {
    return { error: "Email already in use" };
  }

  // Hash password and create user
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "SALES", "ACCOUNTS", "VIEWER"]),
  isActive: z.boolean().default(true),
});

export async function updateUser(userId: string, formData: FormData) {
  await requireRole(["ADMIN"]);

  const parsed = updateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Check if email is taken by another user
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (existing && existing.id !== userId) {
    return { error: "Email already in use" };
  }

  // Prevent locking everyone out: don't let the edit demote or deactivate the
  // last remaining active admin.
  const wouldLoseAdmin =
    parsed.data.role !== "ADMIN" || !parsed.data.isActive;
  if (wouldLoseAdmin && (await isLastActiveAdmin(userId))) {
    return {
      error: "This is the last active admin — change another user to admin first.",
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const actor = await requireRole(["ADMIN"]);

  if (userId === actor.id) {
    return { error: "You can't delete your own account." };
  }

  if (await isLastActiveAdmin(userId)) {
    return {
      error: "This is the last active admin — assign another admin first.",
    };
  }

  // FK-safe: every User relation is onDelete: SetNull, so the user's owned
  // records are un-assigned rather than blocking the delete.
  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    return { error: "Failed to delete user. Please try again." };
  }

  revalidatePath("/settings");
  return { success: true };
}

/**
 * True if `userId` is an active ADMIN and no other active admin exists — i.e.
 * removing/demoting them would leave the system with no admin.
 */
async function isLastActiveAdmin(userId: string): Promise<boolean> {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });
  if (!target || target.role !== "ADMIN" || !target.isActive) return false;

  const otherActiveAdmins = await prisma.user.count({
    where: { role: "ADMIN", isActive: true, id: { not: userId } },
  });
  return otherActiveAdmins === 0;
}
