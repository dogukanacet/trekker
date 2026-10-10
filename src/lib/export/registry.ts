import type { Resource } from "@/lib/permissions";
import type { ExportContext, ExportParams, ExportPayload } from "@/lib/export/payload";
import { buildDriversExport } from "@/lib/export/drivers";

type ExportEntry = {
  permission: Resource;
  build: (params: ExportParams, ctx: ExportContext) => Promise<ExportPayload>;
};

export const exportRegistry: Record<string, ExportEntry> = {
  drivers: { permission: "drivers", build: buildDriversExport },
};
