import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { exportRegistry } from "@/lib/export/registry";

export async function GET(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;

  // hasOwn: "constructor" gibi prototype anahtarlarının registry kaydı gibi çözülmesini engeller.
  const entry = Object.hasOwn(exportRegistry, resource) ? exportRegistry[resource] : undefined;
  if (!entry) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const session = await auth();
  const user = session?.user;
  if (!user?.tenantId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!hasPermission(user.role, entry.permission, "read")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Tenant her zaman session'dan geliyor, query'den hiç okunmuyor.
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const rows = await entry.fetchRows(query, {
    tenantId: user.tenantId,
    role: user.role,
    driverId: user.driverId,
  });

  return NextResponse.json({ rows });
}
