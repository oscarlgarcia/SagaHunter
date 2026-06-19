import { Inter } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { EventIndicator } from "@/components/layout/EventIndicator";
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
          <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <main className="ml-64 flex-1 p-8">
              <div className="flex items-center justify-end mb-4">
                <EventIndicator />
              </div>
              {children}
            </main>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
