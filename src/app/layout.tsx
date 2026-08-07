import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FleetOps",
  description: "Multi-tenant filo ve sevkiyat yönetim platformu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
