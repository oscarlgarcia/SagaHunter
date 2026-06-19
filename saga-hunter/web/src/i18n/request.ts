import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  const resolved = locale ?? "en";
  return {
    locale: resolved,
    messages: (await import(`../../messages/${resolved}.json`)).default,
  };
});
