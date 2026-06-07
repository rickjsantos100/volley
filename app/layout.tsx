import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { GlobalAccountMenu } from "@/components/global-account-menu";
import { GlobalDashboardLink } from "@/components/global-dashboard-link";
import { GlobalLanguageToggle } from "@/components/global-language-toggle";
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
          <GlobalAccountMenu />
          <GlobalDashboardLink />
          <GlobalLanguageToggle />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
