"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/app/[locale]/(auth)/reset-password/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const ResetPasswordPage = () => {
  const t = useTranslations("Auth");
  const common = useTranslations("Common");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [actionState, formAction, isPending] = useActionState(resetPassword.bind(null, token), {
    error: null,
    success: false,
  });

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("resetPasswordTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{t("invalidResetLink")}</p>
          <Link
            href="/forgot-password"
            className="mt-4 block text-center text-sm text-muted-foreground hover:underline"
          >
            {t("requestNewLink")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("resetPasswordTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {actionState.success ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("resetPasswordSuccess")}</p>
            <Link href="/login">
              <Button className="w-full">{t("goToLogin")}</Button>
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t("newPassword")}</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            {actionState.error && <p className="text-sm text-destructive">{actionState.error}</p>}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? common("updating") : t("resetPassword")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default ResetPasswordPage;
