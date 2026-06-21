import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { GlobalHeader } from "@/components/global-header";
import { PwaServiceWorker } from "@/components/pwa-service-worker";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-barlow-condensed",
  weight: ["700"],
});

export const metadata: Metadata = {
  applicationName: "Voley Lisboa",
  title: "Voley Lisboa",
  description: "A simple app for organizing volleyball game events.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Voley Lisboa",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#061b6b",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body className={`${inter.variable} ${barlowCondensed.variable}`}>
        <NextIntlClientProvider>
          <PwaServiceWorker />
          <GlobalHeader />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
