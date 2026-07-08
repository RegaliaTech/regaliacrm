import { Suspense } from "react";
import { requireUser } from "@/lib/rbac";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { ToastProvider } from "@/components/ui/toast";
import { FlashToasts } from "@/components/ui/flash-toasts";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Background texture */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.05),transparent_50%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.05),transparent_50%)]" />
      
      <Sidebar role={user.role} />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto px-6 py-7">
          <ToastProvider>
            <Suspense fallback={null}>
              <FlashToasts />
            </Suspense>
            {children}
          </ToastProvider>
        </main>
      </div>
    </div>
  );
}
