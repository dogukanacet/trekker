import { prisma } from "@/lib/prisma";
import { generateRefreshToken, hashToken } from "@/lib/refresh-token";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const REFRESH_COOKIE = "fleetops.refresh-token";

export async function POST() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(REFRESH_COOKIE)?.value;

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

  // rotation: cancel the old one & generate new
  const newRawToken = generateRefreshToken();
  const expiresIn = Number(process.env.REFRESH_TOKEN_EXPIRE_MS);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isCancelled: true },
    }),
    prisma.refreshToken.create({
      data: {
        userId: tokenRecord.userId,
        tokenHash: hashToken(newRawToken),
        expiresAt: new Date(Date.now() + expiresIn),
      },
    }),
  ]);

  //setting cookies
  cookieStore.set({
    name: REFRESH_COOKIE,
    value: newRawToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(expiresIn / 1000),
  });

  return NextResponse.json({ ok: true });
}
