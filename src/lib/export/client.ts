import type { GridColumn } from "@/components/data-grid";

export type ExportTable = { title: string; headers: string[]; rows: string[][] };

const PDF_FONT_NAME = "DejaVuSans";
// Prisma DateTime'ları JSON'dan ISO string olarak gelir (Date nesnesi değil).
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function formatValue(value: string | number | Date | null | undefined, locale: string): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date || (typeof value === "string" && ISO_DATE_PATTERN.test(value))) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(locale);
  }
  return String(value);
}

export function buildExportTable<T>(
  title: string,
  columns: GridColumn<T>[],
  rows: T[],
  locale: string,
): ExportTable {
  const exportable = columns.filter((column) => !!(column.exportValue ?? column.value));
  return {
    title,
    headers: exportable.map((column) => column.header),
    rows: rows.map((row) =>
      exportable.map((column) => formatValue((column.exportValue ?? column.value)?.(row), locale)),
    ),
  };
}

function buildFilename(resource: string, extension: string): string {
  return `${resource}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// CSV injection: "=", "+", "-", "@" ile başlayan hücreler Excel'de formül olarak çalışabilir.
function toCsvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",;\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function downloadCsv(table: ExportTable, resource: string, locale: string) {
  // Türkçe Excel liste ayırıcı olarak ";" bekler, virgüllü CSV tek kolonda açılır.
  const delimiter = locale === "tr" ? ";" : ",";
  const lines = [table.headers, ...table.rows].map((cells) => cells.map(toCsvCell).join(delimiter));

  // BOM: Excel'in dosyayı UTF-8 olarak tanıyıp ş, ğ, İ gibi harfleri bozmamasını sağlar.
  const content = "\uFEFF" + lines.join("\r\n");
  triggerDownload(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
    buildFilename(resource, "csv"),
  );
}

let fontBase64Promise: Promise<string> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function loadFontBase64(): Promise<string> {
  if (!fontBase64Promise) {
    fontBase64Promise = fetch("/fonts/DejaVuSans.ttf")
      .then((response) => {
        if (!response.ok) throw new Error("Font could not be loaded");
        return response.arrayBuffer();
      })
      .then(arrayBufferToBase64)
      .catch((error) => {
        fontBase64Promise = null; // sonraki denemede tekrar denesin
        throw error;
      });
  }
  return fontBase64Promise;
}

export async function downloadPdf(table: ExportTable, resource: string, subtitle: string) {
  // Ağır kütüphaneler sadece PDF istendiğinde yüklensin.
  const [{ jsPDF }, { autoTable }, fontBase64] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    loadFontBase64(),
  ]);

  const doc = new jsPDF({ orientation: table.headers.length > 4 ? "landscape" : "portrait" });
  doc.addFileToVFS(`${PDF_FONT_NAME}.ttf`, fontBase64);
  doc.addFont(`${PDF_FONT_NAME}.ttf`, PDF_FONT_NAME, "normal");
  doc.setFont(PDF_FONT_NAME, "normal");

  doc.setFontSize(14);
  doc.text(table.title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(subtitle, 14, 22);

  autoTable(doc, {
    startY: 27,
    head: [table.headers],
    body: table.rows,
    // Sadece "normal" stilini yüklediğimiz için başlıkta da bold kullanmıyoruz.
    styles: { font: PDF_FONT_NAME, fontStyle: "normal", fontSize: 9 },
    headStyles: { font: PDF_FONT_NAME, fontStyle: "normal", fillColor: [79, 70, 229] },
  });

  doc.save(buildFilename(resource, "pdf"));
}
