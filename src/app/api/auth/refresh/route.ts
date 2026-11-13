import { prisma } from "@/lib/prisma";
import { generateRefreshToken, hashToken } from "@/lib/refresh-token";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { REFRESH_COOKIE_NAME } from "@/lib/constants";
import { getRefreshTokenExpiryMs, setRefreshCookie } from "@/lib/refresh-cookie";

export async function POST() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

  if (!rawToken) {
    return NextResponse.json(
      {
        error: "no refresh token",
      },
      { status: 401 },
    );
  }

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });

  if (!tokenRecord || tokenRecord.isCancelled || tokenRecord.expiresAt < new Date()) {
    return NextResponse.json(
      {
        error: "invalid refresh token",
      },
      { status: 401 },
    );
  }

  // An expired demo must not be renewable, even if the cleanup has not removed its rows yet.
  const owner = await prisma.user.findUnique({
    where: { id: tokenRecord.userId },
    select: { tenant: { select: { isDemo: true, expiresAt: true } } },
  });
  if (
    !owner ||
    (owner.tenant.isDemo && (!owner.tenant.expiresAt || owner.tenant.expiresAt <= new Date()))
  ) {
    return NextResponse.json({ error: "demo expired" }, { status: 401 });
  }

  // rotation: cancel the old one & generate new
  const newRawToken = generateRefreshToken();

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isCancelled: true },
    }),
    prisma.refreshToken.create({
      data: {
        userId: tokenRecord.userId,
        tokenHash: hashToken(newRawToken),
        expiresAt: new Date(Date.now() + getRefreshTokenExpiryMs()),
      },
    }),
  ]);

  //setting cookies
  await setRefreshCookie(newRawToken, getRefreshTokenExpiryMs());
  return NextResponse.json({ ok: true });
}
