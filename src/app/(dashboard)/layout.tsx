import { ActivationProvider } from "@/contexts/activation-context";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ActivationProvider>
      <div className="flex h-screen">
        <Sidebar />
        <main className="hide-scrollbar flex-1 overflow-hidden p-6">{children}</main>
      </div>
    </ActivationProvider>
  );
}
