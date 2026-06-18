import type { Metadata, Viewport } from "next";
import { PwaRegister } from "./pwa-register";
import { PullToRefresh } from "@/components/PullToRefresh";
import { ERPProvider } from "@/lib/erp-state";
import "./globals.css";

export const metadata: Metadata = {
  title: "렌트플로우",
  description: "렌터카 사고대차 ERP 모바일 PWA",
  manifest: "/manifest.json",
  applicationName: "렌트플로우",
  appleWebApp: {
    capable: true,
    title: "렌트플로우",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "렌트플로우",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#176B5B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <ERPProvider>
          <PwaRegister />
          <PullToRefresh>{children}</PullToRefresh>
        </ERPProvider>
      </body>
    </html>
  );
}
