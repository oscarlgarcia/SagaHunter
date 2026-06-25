"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LayoutDashboard, BookText, Rss, Bot, GitBranch, Activity, Languages, Check, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTheme } from "./ThemeProvider";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, key: "dashboard" },
  { href: "/stories", icon: BookText, key: "stories" },
  { href: "/feeds", icon: Rss, key: "feeds" },
  { href: "/agents", icon: Bot, key: "agents" },
  { href: "/pipelines", icon: GitBranch, key: "pipelines" },
  { href: "/monitor", icon: Activity, key: "monitor" },
];

const LOCALES = ["en", "es", "fr", "it"];

export function Sidebar() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [langOpen, setLangOpen] = useState(false);

  const switchLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
    setLangOpen(false);
  };
  const { theme, toggle } = useTheme();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-saga-400">Saga</span>Hunter
        </h1>
        <p className="text-xs text-gray-400 mt-1">Story Discovery Engine</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-saga-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              {t(`nav.${item.key}`)}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-700 space-y-2">
        <button
          onClick={toggle}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          <span className="flex-1 text-left">{theme === "dark" ? "Light" : "Dark"} Mode</span>
        </button>
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <Languages className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">{t(`locale.${locale}`)}</span>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">{locale}</span>
          </button>
          {langOpen && (
            <div className="absolute bottom-full mb-1 left-0 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
              {LOCALES.map((l) => (
                <button
                  key={l}
                  onClick={() => switchLocale(l)}
                  className={cn(
                    "flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs transition-colors",
                    l === locale
                      ? "text-saga-400 bg-gray-700"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  )}
                >
                  <span className="w-3.5 flex justify-center">
                    {l === locale && <Check className="w-3 h-3" />}
                  </span>
                  <span>{t(`locale.${l}`)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500">v0.1.0 &middot; Local Agent Mesh</div>
      </div>
    </aside>
  );
}
