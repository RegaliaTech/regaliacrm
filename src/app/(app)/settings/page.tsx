import { requireUser } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { redirect } from "next/navigation";
import { Building2, Mail, Briefcase, User as UserIcon, Lock, Users, Settings2 } from "lucide-react";
import CompanySettings from "./components/company-settings";
import EmailSettings from "./components/email-settings";
import BusinessSettings from "./components/business-settings";
import ProfileSettings from "./components/profile-settings";
import SecuritySettings from "./components/security-settings";
// import UserManagement from "./components/user-management";
import { prisma } from "@/lib/db";import type { Role } from "@prisma/client";
type SectionKey = "company" | "email" | "business" | "app" | "profile" | "security";

const ADMIN_SECTIONS = [
  { key: "company" as SectionKey, label: "Company", icon: Building2, description: "Company information and branding" },
  { key: "email" as SectionKey, label: "Email & SMTP", icon: Mail, description: "Email configuration" },
  { key: "business" as SectionKey, label: "Business", icon: Briefcase, description: "Business defaults and preferences" },
  // { key: "users" as SectionKey, label: "Users", icon: Users, description: "Manage users and permissions" },
  { key: "app" as SectionKey, label: "Application", icon: Settings2, description: "System settings" },
  { key: "profile" as SectionKey, label: "My Profile", icon: UserIcon, description: "Your personal information" },
  { key: "security" as SectionKey, label: "Security", icon: Lock, description: "Password and authentication" },
];

const USER_SECTIONS = [
  { key: "profile" as SectionKey, label: "My Profile", icon: UserIcon, description: "Your personal information" },
  { key: "security" as SectionKey, label: "Security", icon: Lock, description: "Password and authentication" },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  
  const sections = isAdmin ? ADMIN_SECTIONS : USER_SECTIONS;
  const { section } = await searchParams;
  const activeSection: SectionKey = 
    (sections.find((s) => s.key === section)?.key as SectionKey) ?? sections[0].key;

  // Redirect non-admin trying to access admin sections
  if (!isAdmin && ["company", "email", "business", "users", "app"].includes(activeSection)) {
    redirect("/settings?section=profile");
  }

  const settings = await getSettings();
  
  // Get users for user management
  let users: Array<{
    id: string;
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  
  if (isAdmin) {
    try {
      users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      // Database not available - use empty array
      console.warn("Database not available for user list");
    }
  }

  return (
    <div className="flex gap-6 -mx-6 -my-7 min-h-screen">
      {/* Sidebar Navigation */}
      <aside className="w-72 border-r border-[var(--border)] bg-white shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="p-6 border-b border-[var(--border)]">
          <h1 className="text-xl font-bold text-[var(--foreground)]">Settings</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {isAdmin ? "System configuration" : "Account settings"}
          </p>
        </div>
        
        <nav className="space-y-1 p-4">
          {sections.map(({ key, label, icon: Icon, description }) => {
            const isActive = activeSection === key;
            return (
              <a
                key={key}
                href={`/settings?section=${key}`}
                className={`flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-50 hover:text-[var(--foreground)]"
                }`}
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{label}</div>
                  <div className={`mt-0.5 text-xs ${isActive ? "text-white/80" : "text-slate-500"}`}>
                    {description}
                  </div>
                </div>
              </a>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 bg-slate-50 py-6 pr-6">
        <div className="mx-auto max-w-4xl">
          {activeSection === "company" && isAdmin && (
            <CompanySettings settings={settings} />
          )}
          {activeSection === "email" && isAdmin && (
            <EmailSettings settings={settings} />
          )}
          {activeSection === "business" && isAdmin && (
            <BusinessSettings settings={settings} />
          )}
          {/* {activeSection === "users" && isAdmin && (
            <UserManagement users={users} />
          )} */}
          {activeSection === "app" && isAdmin && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--foreground)]">Application Settings</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  System-wide configuration and preferences
                </p>
              </div>
              <div className="glass rounded-3xl p-6">
                <p className="text-sm text-slate-600">Application settings coming soon...</p>
              </div>
            </div>
          )}
          {activeSection === "profile" && (
            <ProfileSettings user={user} />
          )}
          {activeSection === "security" && (
            <SecuritySettings />
          )}
        </div>
      </div>
    </div>
  );
}
