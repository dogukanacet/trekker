"use client";

import { useActionState, useEffect } from "react";
import { getSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { createDemoAction } from "@/app/[locale]/(auth)/login/demo-actions";

export function TryDemoButton() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createDemoAction, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      getSession().then(() => {
        router.push("/");
      });
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" variant="outline" className="w-full" disabled={isPending}>
        {isPending ? t("demoStarting") : t("tryDemo")}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <p className="text-center text-xs text-muted-foreground">{t("demoHint")}</p>
    </form>
  );
}
