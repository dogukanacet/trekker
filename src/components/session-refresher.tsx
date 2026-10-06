"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";

const VALIDATE_INTERVAL_MS = 30_000;

export const SessionRefresher = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const isRefreshing = useRef(false); // preventing multiple refresh calls

  useEffect(() => {
    if (session?.error === "AccessTokenExpired" && !isRefreshing.current) {
      isRefreshing.current = true;

      fetch("/api/auth/refresh", { method: "POST" })
        .then((response) => {
          if (response.ok) {
            router.refresh();
          } else {
            signOut({ callbackUrl: `/${locale}/login` });
          }
        })
        .finally(() => {
          isRefreshing.current = false;
        });
    }
  }, [session, router, locale]);

  // Rol (veya ileride başka bir hesap durumu) sunucu tarafında değişmişse,
  // access token süresi dolmasını beklemeden kullanıcıyı çıkışa zorlar.
  useEffect(() => {
    if (status !== "authenticated") return;

    const validateSession = async () => {
      try {
        const response = await fetch("/api/auth/validate");
        if (!response.ok) {
          signOut({ callbackUrl: `/${locale}/login` });
        }
      } catch {
        // Ağ hatasında sessizce geç, bir sonraki denemede tekrar kontrol edilir.
      }
    };

    const intervalId = setInterval(validateSession, VALIDATE_INTERVAL_MS);
    window.addEventListener("focus", validateSession);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", validateSession);
    };
  }, [status, locale]);

  return null;
};
