import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, tenant: { select: { isDemo: true, expiresAt: true } } },
  });

  if (!user || user.role !== session.user.role) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  // An expired demo is invalid even if the cleanup has not removed its rows yet.
  if (user.tenant.isDemo && (!user.tenant.expiresAt || user.tenant.expiresAt <= new Date())) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  return NextResponse.json({ valid: true });
}
