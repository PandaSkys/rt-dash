import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// Dynamique : le nonce de la CSP change à chaque requête.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RT-Dash",
  description: "Dashboard d'administration RT-Dash",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
