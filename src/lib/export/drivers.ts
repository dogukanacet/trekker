import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { buildOrderBy } from "@/lib/build-order-by";
import { buildDriverWhere, driverSortKeys } from "@/app/[locale]/(dashboard)/drivers/query";
import {
  EXPORT_ROW_LIMIT,
  toExportPayload,
  type ExportContext,
  type ExportParams,
  type ExportPayload,
} from "@/lib/export/payload";

export async function buildDriversExport(
  params: ExportParams,
  ctx: ExportContext,
): Promise<ExportPayload> {
  const t = await getTranslations({ locale: ctx.locale, namespace: "Drivers" });

  const drivers = await prisma.driver.findMany({
    where: buildDriverWhere(params, ctx.tenantId),
    include: { depot: { select: { name: true } } },
    orderBy: buildOrderBy(driverSortKeys, params.sortBy, params.sortOrder),
    take: EXPORT_ROW_LIMIT,
  });

  return toExportPayload(
    t("title"),
    [
      { key: "fullName", header: t("name"), value: (row) => row.fullName },
      { key: "depot", header: t("depot"), value: (row) => row.depot.name },
      {
        key: "licenseUntil",
        header: t("licenseUntil"),
        type: "date",
        value: (row) => row.licenseUntil,
      },
    ],
    drivers,
  );
}
