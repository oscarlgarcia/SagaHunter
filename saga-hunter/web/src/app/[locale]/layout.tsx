import { Inter } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { EventIndicator } from "@/components/layout/EventIndicator";
import { SSEToasts } from "@/components/layout/SSEToasts";
import { PushNotifier } from "@/components/layout/PushNotifier";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

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
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
          <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
            <Sidebar />
            <main className="ml-64 flex-1 p-8">
              <div className="flex items-center justify-end mb-4">
                <EventIndicator />
              </div>
              {children}
            </main>
            <SSEToasts />
            <PushNotifier />
          </div>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
