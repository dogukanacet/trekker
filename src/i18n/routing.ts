import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Pool of all supported languages. Which ones are live is decided by the Language table.
  locales: ["tr", "en", "de", "fr", "es"],
  defaultLocale: "tr",
});
