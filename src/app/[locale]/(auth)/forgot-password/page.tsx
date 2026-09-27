"use client";

import { useActionState, useEffect, useState } from "react";
import { requestPasswordReset } from "@/app/[locale]/(auth)/forgot-password/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const ForgotPasswordPage = () => {
  const t = useTranslations("Auth");
  const common = useTranslations("Common");
  const [actionState, formAction, isPending] = useActionState(requestPasswordReset, {
    error: null,
    success: false,
    email: "",
  });
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (actionState.success && !submittedEmail && actionState.email) {
      setSubmittedEmail(actionState.email);
    }
  }, [actionState.success, submittedEmail, actionState.email]);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("forgotPasswordTitle")}</CardTitle>
        <CardDescription>{t("forgotPasswordDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionState.success ? (
          <p className="text-sm text-muted-foreground">
            {t("forgotPasswordSent", { email: submittedEmail ?? "" })}
          </p>
        ) : (
          <form id="forgot-password-form" action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            {actionState.error && <p className="text-sm text-destructive">{actionState.error}</p>}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? common("sending") : t("sendResetLink")}
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="block text-center text-sm text-muted-foreground hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </CardContent>
    </Card>
  );
};

export default ForgotPasswordPage;
