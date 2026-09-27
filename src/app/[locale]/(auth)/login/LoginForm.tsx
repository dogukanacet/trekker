"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/[locale]/(auth)/login/actions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

export function LoginForm() {
  const t = useTranslations("Auth");
  const [state, formAction, isPending] = useActionState(loginAction, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" type="email" name="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" type="password" name="password" required />
        <div className="flex items-center justify-between">
          <Link href="/forgot-password" className="text-sm text-primary hover:underline ml-auto">
            {t("forgotPassword")}
          </Link>
        </div>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? t("loggingIn") : t("login")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-primary hover:underline">
          {t("register")}
        </Link>
      </p>
    </form>
  );
}
