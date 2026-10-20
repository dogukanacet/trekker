import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// The flag is read from the DB on purpose: the JWT can be stale for up to 30 minutes.
// Returns null when the caller is not a platform admin.
export async function requirePlatformAdmin(): Promise<{ userId: string } | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isPlatformAdmin: true },
  });

  return user?.isPlatformAdmin ? { userId: user.id } : null;
}
