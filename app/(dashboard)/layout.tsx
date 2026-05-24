import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/demo/ats");
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={session.user} />
      <div className="lg:pl-72">
        <Topbar />
        <ErrorBoundary>
          <main className="min-h-[calc(100vh-4rem)] py-6 sm:py-8">{children}</main>
        </ErrorBoundary>
      </div>
    </div>
  );
}
