import type { Metadata } from "next";
import { brand } from "@/lib/branding";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.pageTitle,
  description: brand.pageDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
