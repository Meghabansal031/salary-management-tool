import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { Header } from "@/components/layout/header";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "ACME Salary Management",
  description: "Maintain salary data and see how the organization pays people.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <Header />
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
