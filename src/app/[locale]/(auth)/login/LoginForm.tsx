"use client";

import { useActionState, useEffect } from "react";
import { getSession } from "next-auth/react";
import { loginAction } from "@/app/[locale]/(auth)/login/actions";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

export function LoginForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(loginAction, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) {
      getSession().then(() => {
        router.push("/");
      });
    }
  }, [state.success]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" type="email" name="email" required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t("password")}</Label>
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            {t("forgotPassword")}
          </Link>
        </div>
        <Input id="password" type="password" name="password" required />
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
