"use server";

import { signOut } from "@/lib/auth";
import { cancelRefreshToken } from "@/lib/refresh-token";
import { cookies } from "next/headers";

const REFRESH_COOKIE = "fleetops.refresh-token";

export async function logoutAction() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (rawToken) {
    await cancelRefreshToken(rawToken);
  }

  cookieStore.delete({ name: REFRESH_COOKIE, path: "/" });

  await signOut({ redirectTo: "/login" });
}
