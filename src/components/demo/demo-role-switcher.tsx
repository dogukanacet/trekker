"use client";

import { useState, useTransition } from "react";
import { getSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { switchDemoRoleAction } from "@/app/[locale]/(dashboard)/demo-actions";

const ROLES = ["ADMIN", "DISPATCHER", "DRIVER"] as const satisfies readonly Role[];

export function DemoRoleSwitcher({ currentRole }: { currentRole: Role }) {
  const t = useTranslations("Demo");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const switchTo = (role: Role) => {
    setError(null);
    startTransition(async () => {
      const result = await switchDemoRoleAction(role);
      if (!result.success) {
        setError(result.error);
        return;
      }
      await getSession(); // refresh the client-side session before navigating
      router.push("/"); // the current page may be off-limits for the new role
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-medium">{t("viewAs")}</span>
      {ROLES.map((role) => (
        <Button
          key={role}
          type="button"
          size="sm"
          variant={role === currentRole ? "default" : "outline"}
          disabled={isPending || role === currentRole}
          onClick={() => switchTo(role)}
        >
          {t(`roles.${role}`)}
        </Button>
      ))}
      {error && <span className="text-destructive">{error}</span>}
    </div>
  );
}
