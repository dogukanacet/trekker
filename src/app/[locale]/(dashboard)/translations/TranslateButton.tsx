"use client";

import { useTranslations } from "next-intl";
import { Languages, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TranslateButton({
  onClick,
  disabled,
  loading,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const t = useTranslations("Translations");

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      title={t("translateFromThisHint")}
    >
      {loading ? (
        <LoaderCircle className="mr-1 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Languages className="mr-1 h-3.5 w-3.5" />
      )}
      {t("translateFromThis")}
    </Button>
  );
}
