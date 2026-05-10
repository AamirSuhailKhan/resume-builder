import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/auth";
import { Providers } from "@/components/auth/Providers";
import { ThemeProvider } from "@/components/layout/theme-provider";

export const metadata: Metadata = {
  title: "ResumeAI - AI Job Platform",
  description: "AI-powered resumes, job matching, applications, interviews, and portfolio publishing.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground selection:bg-primary/20">
        <ThemeProvider>
          <Providers session={session}>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
