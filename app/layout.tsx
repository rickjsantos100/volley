import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { GlobalHeader } from "@/components/global-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Volleyball Game Management",
  description: "A simple app for organizing volleyball game events.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <GlobalHeader />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
