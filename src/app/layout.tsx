import type { Metadata, Viewport } from "next";
import { Inter, Outfit, Bebas_Neue, Oswald, Ubuntu } from "next/font/google";
import "./globals.css";

const inter  = Inter({      variable: "--font-inter",  subsets: ["latin"] });
const outfit = Outfit({     variable: "--font-outfit", subsets: ["latin"] });
const bebas  = Bebas_Neue({ variable: "--font-bebas",  subsets: ["latin"], weight: "400" });
const oswald = Oswald({     variable: "--font-oswald", subsets: ["latin"], weight: ["400","500","600","700"] });
const ubuntu = Ubuntu({     variable: "--font-ubuntu", subsets: ["latin"], weight: ["400","500","700"] });

export const metadata: Metadata = {
  title: "Marmite d'Or — Gestion Restaurant",
  description: "Système de gestion omnicanal pour restaurant",
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: "Marmite d'Or" },
};

export const viewport: Viewport = {
  themeColor: '#F97316',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
};

import Sidebar from "@/components/Sidebar";
import { SidebarProvider } from "@/context/SidebarContext";
import { AuthProvider } from "@/context/AuthContext";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${outfit.variable} ${bebas.variable} ${oswald.variable} ${ubuntu.variable}`}>
      <body style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', margin: 0, minHeight: '100vh' }}>
        <ServiceWorkerRegister />
        <AuthProvider>
          <SidebarProvider>
            <Sidebar />
            <ClientLayoutWrapper>
              {children}
            </ClientLayoutWrapper>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
