import { SecurityDashboard } from "@/features/security/SecurityDashboard";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { checkPermission } from "@/lib/security/rbac";
import { AlertCircle } from "lucide-react";

export const metadata = {
  title: "Security Operations | CareerOS",
};

export default async function SecurityPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userContext = {
    id: session.user.id,
    role: session.user.role || "USER",
    plan: (session.user.plan as any) || "free",
  };

  // Pre-flight check on Server Side: enforce RBAC permissions
  const permission = checkPermission(userContext, "read", "audit_logs");

  if (!permission.allowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 max-w-md mx-auto text-center space-y-4">
        <div className="h-16 w-16 bg-red-950/20 text-red-500 rounded-full flex items-center justify-center border border-red-900/30">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground">
          You do not have the required permissions to view the security operations console. 
          Please contact your administrator if you believe this is in error.
        </p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <SecurityDashboard />
    </div>
  );
}
