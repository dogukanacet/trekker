"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

// `locales` must be the enabled languages, never the whole pool
export function LanguageSwitcher({ locales }: { locales: readonly string[] }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Common");

  return (
    <Select
      value={locale}
      onValueChange={(value) => {
        if (value) router.replace(pathname, { locale: value });
      }}
    >
      <SelectTrigger aria-label={t("language")} size="sm">
        <Globe className="h-4 w-4" />
        <SelectValue>{(value: string) => value.toUpperCase()}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {locales.map((option) => (
          <SelectItem key={option} value={option}>
            {option.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
