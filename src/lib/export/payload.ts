import type { Role } from "@prisma/client";

// Çok büyük tablolarda tarayıcı/sunucuyu yormamak için üst sınır.
export const EXPORT_ROW_LIMIT = 5000;

export type ExportCell = string | number | null;
export type ExportColumnType = "text" | "date";

export type ExportPayload = {
  title: string;
  columns: { key: string; header: string; type: ExportColumnType }[];
  rows: Record<string, ExportCell>[];
};

export type ExportParams = Record<string, string | undefined>;

export type ExportContext = {
  tenantId: string;
  role: Role;
  driverId: string | null;
  locale: string;
};

type ExportColumnDef<T> = {
  key: string;
  header: string;
  type?: ExportColumnType;
  value: (row: T) => string | number | Date | null | undefined;
};

export function toExportPayload<T>(
  title: string,
  columns: ExportColumnDef<T>[],
  rows: T[],
): ExportPayload {
  return {
    title,
    columns: columns.map(({ key, header, type }) => ({ key, header, type: type ?? "text" })),
    rows: rows.map((row) =>
      Object.fromEntries(
        columns.map((column): [string, ExportCell] => {
          const value = column.value(row);
          // Tarihler ISO string olarak gider, biçimlendirme tarayıcıda (kullanıcının locale/saat diliminde) yapılır.
          return [column.key, value instanceof Date ? value.toISOString() : (value ?? null)];
        }),
      ),
    ),
  };
}
