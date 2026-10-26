"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { requirePlatformAdmin } from "@/lib/translations/guard";
import {
  createReferenceResolver,
  getTranslationRows,
  loadBaseMessages,
} from "@/lib/translations/catalog";
import { getIssueDescriber } from "@/lib/translations/describe-issue";
import { isPathFree } from "@/lib/translations/key-rules";
import {
  analyzeImport,
  buildExport,
  type ImportProblem,
  type TranslationExport,
} from "@/lib/translations/transfer";

const MAX_IMPORT_ENTRIES = 8000;

export type ImportReport = {
  error?: string;
  applied?: boolean;
  willUpdate?: number;
  unchanged?: number;
  newKeys?: number;
  newKeyExamples?: string[];
  unknownKeys?: number;
  unknownKeyExamples?: string[];
  unknownLocales?: string[];
  problemCount?: number;
  problems?: { locale: string; id: string; message: string }[];
};

function revalidatePanel() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/translations`);
  }
}

const exportSchema = z.object({
  locales: z.array(z.enum(routing.locales)).min(1).max(routing.locales.length),
});

export async function exportTranslations(
  input: unknown,
): Promise<{ error?: string; data?: TranslationExport; count?: number }> {
  const t = await getTranslations("Translations");

  const admin = await requirePlatformAdmin();
  if (!admin) return { error: t("forbidden") };

  const parsed = exportSchema.safeParse(input);
  if (!parsed.success) return { error: t("invalidInput") };

  const data = buildExport(await getTranslationRows(), [...new Set(parsed.data.locales)]);
  const count = Object.values(data).reduce((sum, texts) => sum + Object.keys(texts).length, 0);
  return { data, count };
}

const importSchema = z.object({
  data: z.unknown(),
  apply: z.boolean(),
  // Keys that are not in the table become new custom keys
  createKeys: z.boolean().default(false),
});

// apply = false is a dry run that only reports what would happen.
// apply = true saves every valid and changed text as a draft; nothing is published.
export async function importTranslations(input: unknown): Promise<ImportReport> {
  const t = await getTranslations("Translations");

  const admin = await requirePlatformAdmin();
  if (!admin) return { error: t("forbidden") };

  const parsedInput = importSchema.safeParse(input);
  if (!parsedInput.success) return { error: t("invalidInput") };
  const { data, apply, createKeys } = parsedInput.data;

  const [rows, resolveReference, baseTrees] = await Promise.all([
    getTranslationRows(),
    createReferenceResolver(),
    Promise.all(routing.locales.map((locale) => loadBaseMessages(locale))),
  ]);

  const parsed = analyzeImport(data, rows, resolveReference, routing.locales, MAX_IMPORT_ENTRIES, {
    createKeys,
    defaultLocale: routing.defaultLocale,
    // A new key must not land on an array or a text of any locale file
    isPathAvailable: (namespace, key) =>
      baseTrees.every((tree) => isPathFree(tree, [namespace, ...key.split(".")])),
  });
  if (!parsed.ok) {
    return { error: parsed.error === "format" ? t("importFormat") : t("importTooMany") };
  }
  const { analysis } = parsed;

  const describeIssue = await getIssueDescriber();
  const describeProblem = (problem: ImportProblem): string => {
    switch (problem.kind) {
      case "invalid":
        return describeIssue(problem.issue);
      case "notText":
        return t("problemNotText");
      case "empty":
        return t("problemEmpty");
      case "tooLong":
        return t("problemTooLong");
      case "badKey":
        return t("problemBadKey");
      case "keyConflict":
        return t("problemKeyConflict");
      case "defaultMissing":
        return t("problemDefaultMissing");
    }
  };

  const report: ImportReport = {
    applied: false,
    willUpdate: analysis.entries.length,
    unchanged: analysis.unchanged,
    newKeys: analysis.newKeys.length,
    newKeyExamples: analysis.newKeys.slice(0, 10),
    unknownKeys: analysis.unknownKeyCount,
    unknownKeyExamples: analysis.unknownKeyExamples,
    unknownLocales: analysis.unknownLocales,
    problemCount: analysis.problems.length,
    problems: analysis.problems.slice(0, 10).map((problem) => ({
      locale: problem.locale,
      id: problem.id,
      message: describeProblem(problem),
    })),
  };

  if (!apply || analysis.entries.length === 0) return report;

  const keyOf = (entry: { locale: string; namespace: string; key: string }) =>
    `${entry.locale}\u0000${entry.namespace}\u0000${entry.key}`;

  try {
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.translation.findMany({
          where: { locale: { in: [...new Set(analysis.entries.map((entry) => entry.locale))] } },
          select: { locale: true, namespace: true, key: true },
        });
        const existingKeys = new Set(existing.map(keyOf));

        const toCreate = analysis.entries.filter((entry) => !existingKeys.has(keyOf(entry)));
        const toUpdate = analysis.entries.filter((entry) => existingKeys.has(keyOf(entry)));

        if (toCreate.length > 0) {
          await tx.translation.createMany({
            data: toCreate.map((entry) => ({
              locale: entry.locale,
              namespace: entry.namespace,
              key: entry.key,
              draftValue: entry.value,
              updatedById: admin.userId,
            })),
          });
        }
        for (const entry of toUpdate) {
          await tx.translation.update({
            where: {
              locale_namespace_key: {
                locale: entry.locale,
                namespace: entry.namespace,
                key: entry.key,
              },
            },
            data: { draftValue: entry.value, updatedById: admin.userId },
          });
        }
      },
      { timeout: 60_000 },
    );
  } catch (error) {
    // Another request created the same rows between our read and write
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: t("importConflict") };
    }
    throw error;
  }

  revalidatePanel();
  return { ...report, applied: true };
}
