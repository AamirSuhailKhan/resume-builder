import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/auth";
import { Providers } from "@/components/auth/Providers";
import { ThemeProvider } from "@/components/layout/theme-provider";

export const metadata: Metadata = {
  title: {
    default: "CareerOS — Your career, automated",
    template: "%s | CareerOS",
  },
  description: "CareerOS is the AI career operating system for Indian professionals. Apply smarter, negotiate better, grow faster.",
  openGraph: {
    title: "CareerOS — Your career, automated",
    description: "CareerOS is the AI career operating system for Indian professionals.",
    siteName: "CareerOS",
  },
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
