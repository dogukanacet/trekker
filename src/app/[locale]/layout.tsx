import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getEnabledLocales } from "@/i18n/languages";
import { SessionRefresher } from "@/components/session-refresher";

// No generateStaticParams on purpose: whether a language is live is decided at
// runtime (Language table), so pages must not be prerendered per pool locale.

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // A language that exists in the pool but is switched off sends visitors to the default one
  const enabledLocales = await getEnabledLocales();
  if (!enabledLocales.includes(locale)) {
    redirect({ href: "/", locale: routing.defaultLocale });
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
      <SessionRefresher />
    </NextIntlClientProvider>
  );
}
