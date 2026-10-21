import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getEnabledLocales } from "@/i18n/languages";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locales = await getEnabledLocales();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageSwitcher locales={locales} />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-2xl font-semibold">Trekker</h1>
        {children}
      </div>
    </div>
  );
}
