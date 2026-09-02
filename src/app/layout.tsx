import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/app/providers";
import { SessionRefresher } from "@/app/api/components/SessionRefresher";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Trekker",
  description: "Multi-tenant filo ve sevkiyat yönetim platformu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Providers>
          {children}
          <SessionRefresher />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
