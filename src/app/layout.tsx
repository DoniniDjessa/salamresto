import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SalamResto || Omnichannel Output & KDS",
  description: "Next-gen restaurant operating system",
};

import Sidebar from "@/components/Sidebar";
import { SidebarProvider } from "@/context/SidebarContext";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${outfit.variable}`}>
      <body style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', margin: 0, minHeight: '100vh' }}>
        <SidebarProvider>
          <Sidebar />
          <ClientLayoutWrapper>
            {children}
          </ClientLayoutWrapper>
        </SidebarProvider>
      </body>
    </html>
  );
}
