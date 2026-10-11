import type { Resource } from "@/lib/permissions";
import { EXPORT_ROW_LIMIT, type ExportContext, type ExportParams } from "@/lib/export/types";
import { getDriverRows } from "@/app/[locale]/(dashboard)/drivers/query";

type ExportEntry = {
  permission: Resource;
  fetchRows: (params: ExportParams, ctx: ExportContext) => Promise<unknown[]>;
};

const exportPage = { skip: 0, take: EXPORT_ROW_LIMIT };

export const exportRegistry: Record<string, ExportEntry> = {
  drivers: {
    permission: "drivers",
    fetchRows: (params, ctx) => getDriverRows(params, ctx.tenantId, exportPage),
  },
};
