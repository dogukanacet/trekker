import type { Role } from "@prisma/client";

// Upper limit to avoid overloading the browser or server with very large tables.
export const EXPORT_ROW_LIMIT = 5000;

export type ExportParams = Record<string, string | undefined>;

export type ExportContext = {
  tenantId: string;
  role: Role;
  driverId: string | null;
};
