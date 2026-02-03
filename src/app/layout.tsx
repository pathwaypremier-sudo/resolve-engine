import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./print.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Resolve Engine — Structured UK Dispute Resolution",
  description:
    "Resolve Engine helps consumers follow the correct procedural route for disputes. Structured, rules-based, starting with parking tickets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
