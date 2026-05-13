import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { auth } from "@/auth";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container-premium flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-foreground">ResumeAI</p>
              <p className="mt-1 text-xs text-muted-foreground">Career setup</p>
            </div>
          </div>
        </div>
      </header>
      <main className="container-premium py-8 sm:py-10">{children}</main>
    </div>
  );
}
