import type { Resource } from "@/lib/permissions";
import { EXPORT_ROW_LIMIT, type ExportContext, type ExportParams } from "@/lib/export/types";
import { getDriverRows } from "@/app/[locale]/(dashboard)/drivers/query";
import { getDepotRows } from "@/app/[locale]/(dashboard)/depots/query";
import { getVehicleRows } from "@/app/[locale]/(dashboard)/vehicles/query";
import { getRouteRows } from "@/app/[locale]/(dashboard)/routes/query";

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
  depots: {
    permission: "depots",
    fetchRows: (params, ctx) => getDepotRows(params, ctx.tenantId, exportPage),
  },
  vehicles: {
    permission: "vehicles",
    fetchRows: (params, ctx) => getVehicleRows(params, ctx.tenantId, exportPage),
  },
  routes: {
    permission: "routes",
    fetchRows: (params, ctx) => getRouteRows(params, ctx.tenantId, exportPage),
  },
};
