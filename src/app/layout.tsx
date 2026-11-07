import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PwaAutoUpdater } from "@/components/pwa-auto-updater";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    manifest: "/manifest.webmanifest",
    applicationName: "Waleedex",
    title: "Waleedex | متاجرنا",
    description: "منصة المتاجر المتعددة",
    icons: { icon: "/icon.svg", apple: "/icon.svg" },
  };
}

export default function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params?: Promise<any>;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-screen bg-cream text-ink-800 antialiased">
        <PwaAutoUpdater />
        {children}
      </body>
    </html>
  );
}