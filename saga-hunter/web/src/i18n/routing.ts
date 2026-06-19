import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es", "fr", "it"],
  defaultLocale: "en",
  localeDetection: true,
  localePrefix: "never",
});
