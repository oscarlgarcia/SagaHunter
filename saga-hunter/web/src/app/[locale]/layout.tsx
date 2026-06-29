import { StrictMode } from "react";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { EventIndicator } from "@/components/layout/EventIndicator";
import { PushNotifier } from "@/components/layout/PushNotifier";
import { TRPCProvider } from "@/trpc/client";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const SSEToasts = dynamic(() => import("@/components/layout/SSEToasts").then((m) => m.SSEToasts), { ssr: false });

const inter = Inter({ subsets: ["latin"] });

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <StrictMode>
        <NextIntlClientProvider messages={messages}>
          <TRPCProvider>
          <ThemeProvider>
          <ToastProvider>
          <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
            <Sidebar />
            <main className="ml-64 flex-1 p-8">
              <div className="flex items-center justify-end mb-4">
                <EventIndicator />
              </div>
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
            <SSEToasts />
            <PushNotifier />
          </div>
          </ToastProvider>
          </ThemeProvider>
          </TRPCProvider>
        </NextIntlClientProvider>
        </StrictMode>
      </body>
    </html>
  );
}
