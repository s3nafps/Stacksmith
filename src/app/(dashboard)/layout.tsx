import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <Sidebar />
      <main className="lg:pl-[240px] min-h-screen transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
