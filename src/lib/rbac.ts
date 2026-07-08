import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
};

/** Require an authenticated user; redirect to /login otherwise. */
export async function requireUser(): Promise<SessionUser> {
  // Dev-only preview fallback: lets you view the UI before a database/auth
  // is configured. Never active in production. Remove PREVIEW_NO_AUTH to
  // enforce real login locally.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.PREVIEW_NO_AUTH === "true"
  ) {
    return {
      id: "preview-user",
      name: "Ali Sheikh",
      email: "admin@regaliacms.app",
      role: "ADMIN",
    };
  }

  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user as SessionUser;
}

/** Require one of the given roles; redirect to /dashboard if not allowed. */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}

export function can(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}

/** Roles permitted to create/edit business records. */
export const WRITE_ROLES: Role[] = ["ADMIN", "SALES", "ACCOUNTS"];
export const ADMIN_ROLES: Role[] = ["ADMIN"];
/** Roles permitted to view/manage financial records (expenses, PNL). */
export const FINANCE_ROLES: Role[] = ["ADMIN", "ACCOUNTS"];
