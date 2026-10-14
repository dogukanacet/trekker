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

  // If the role (or another account state in the future) changes on the server,
  // force the user to sign out without waiting for the access token to expire.
  useEffect(() => {
    if (status !== "authenticated") return;

    const validateSession = async () => {
      try {
        const response = await fetch("/api/auth/validate");
        if (!response.ok) {
          signOut({ callbackUrl: `/${locale}/login` });
        }
      } catch {
        // Skip network errors; the state will be checked again on the next attempt.
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
