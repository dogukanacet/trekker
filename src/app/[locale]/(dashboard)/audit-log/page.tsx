import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import { parsePagination } from "@/lib/pagination";
import { hasPermission } from "@/lib/permissions";
import AuditLogGrid from "@/app/[locale]/(dashboard)/audit-log/AuditLogGrid";
import {
  buildAuditWhere,
  getAuditRows,
  type AuditFilterParams,
} from "@/app/[locale]/(dashboard)/audit-log/query";

const AuditLogPage = async ({
  searchParams,
}: {
  searchParams: Promise<
    AuditFilterParams & {
      actorEmail?: string;
      resourceLabel?: string;
      sortBy?: string;
      sortOrder?: string;
      page?: string;
      pageSize?: string;
    }
  >;
}) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;

  // The middleware is the first gate; this is the second, so the page is safe on its own.
  if (!tenantId || !hasPermission(session?.user?.role, "auditLog", "read")) {
    notFound();
  }

  const params = (await searchParams) as Record<string, string | undefined>;
  const { page, pageSize, skip, take } = parsePagination({
    page: params.page,
    pageSize: params.pageSize,
  });

  const [rows, totalCount] = await Promise.all([
    getAuditRows(params, tenantId, { skip, take }),
    prisma.auditLog.count({ where: buildAuditWhere(params, tenantId) }),
  ]);
  const t = await getTranslations("AuditLog");

  return (
    <div className="space-y-6">
      <div>
        <h1 className={typography.pageTitle}>{t("title")}</h1>
        <p className={typography.secondary}>{t("subtitle")}</p>
      </div>

      <AuditLogGrid rows={rows} pagination={{ page, pageSize, totalCount }} />
    </div>
  );
};

export default AuditLogPage;
