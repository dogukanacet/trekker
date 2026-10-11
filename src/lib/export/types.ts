import type { Role } from "@prisma/client";

// Çok büyük tablolarda tarayıcı/sunucuyu yormamak için üst sınır.
export const EXPORT_ROW_LIMIT = 5000;

export type ExportParams = Record<string, string | undefined>;

export type ExportContext = {
  tenantId: string;
  role: Role;
  driverId: string | null;
};
