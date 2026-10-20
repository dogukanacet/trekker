"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { TRANSLATIONS_TAG } from "@/i18n/messages";
import { requirePlatformAdmin } from "@/lib/translations/guard";
import {
  getTranslationRows,
  keyExistsInAnyBase,
  keyExistsInBase,
  loadBaseMessages,
} from "@/lib/translations/catalog";
import {
  findKeyConflict,
  isPathFree,
  isValidKeyPath,
  isValidNamespace,
} from "@/lib/translations/key-rules";

type ActionResult = { error?: string; success?: boolean; count?: number };

const keySchema = z.object({
  locale: z.enum(routing.locales),
  namespace: z.string().min(1).max(100),
  key: z.string().min(1).max(200),
});

const saveDraftSchema = keySchema.extend({
  value: z.string().min(1).max(2000),
});

const createKeySchema = z.object({
  namespace: z.string().trim().min(1).max(100),
  key: z.string().trim().min(1).max(200),
  values: z.record(z.string(), z.string().max(2000)),
});

const deleteKeySchema = z.object({
  namespace: z.string().min(1).max(100),
  key: z.string().min(1).max(200),
});

function revalidatePanel() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/translations`);
  }
}

export async function saveDraft(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("Translations");

  const admin = await requirePlatformAdmin();
  if (!admin) return { error: t("forbidden") };

  const parsed = saveDraftSchema.safeParse(input);
  if (!parsed.success) return { error: t("invalidInput") };
  const { locale, namespace, key, value } = parsed.data;

  // Allowed: a key present in this locale's JSON, or a custom key (in no JSON, but in the DB)
  if (!(await keyExistsInBase(locale, namespace, key))) {
    const isCustom =
      !(await keyExistsInAnyBase(namespace, key)) &&
      (await prisma.translation.count({ where: { namespace, key } })) > 0;
    if (!isCustom) return { error: t("unknownKey") };
  }

  await prisma.translation.upsert({
    where: { locale_namespace_key: { locale, namespace, key } },
    create: { locale, namespace, key, draftValue: value, updatedById: admin.userId },
    update: { draftValue: value, updatedById: admin.userId },
  });

  revalidatePanel();
  return { success: true };
}

export async function discardDraft(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("Translations");

  const admin = await requirePlatformAdmin();
  if (!admin) return { error: t("forbidden") };

  const parsed = keySchema.safeParse(input);
  if (!parsed.success) return { error: t("invalidInput") };
  const { locale, namespace, key } = parsed.data;

  const row = await prisma.translation.findUnique({
    where: { locale_namespace_key: { locale, namespace, key } },
    select: { id: true, publishedValue: true },
  });
  if (!row) return { success: true };

  if (row.publishedValue === null) {
    // Nothing published and no draft left: the row carries no information
    await prisma.translation.delete({ where: { id: row.id } });
  } else {
    await prisma.translation.update({
      where: { id: row.id },
      data: { draftValue: null, updatedById: admin.userId },
    });
  }

  revalidatePanel();
  return { success: true };
}

// Creates a new custom key as drafts. The default locale value is required;
// other locales are optional and fall back to the default locale's text.
export async function createKey(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("Translations");

  const admin = await requirePlatformAdmin();
  if (!admin) return { error: t("forbidden") };

  const parsed = createKeySchema.safeParse(input);
  if (!parsed.success) return { error: t("invalidInput") };
  const { namespace, key, values } = parsed.data;

  if (!isValidNamespace(namespace)) return { error: t("invalidNamespace") };
  if (!isValidKeyPath(key)) return { error: t("invalidKey") };

  const entries = routing.locales.flatMap((locale) => {
    const value = values[locale] ?? "";
    return value.trim() === "" ? [] : [{ locale, value }];
  });
  if (!entries.some((entry) => entry.locale === routing.defaultLocale)) {
    return { error: t("defaultLocaleRequired", { locale: routing.defaultLocale.toUpperCase() }) };
  }

  // Conflicts with known keys (JSON and custom)
  const rows = await getTranslationRows();
  const conflict = findKeyConflict(
    namespace,
    key,
    rows.map((row) => row.id),
  );
  if (conflict === "exists") return { error: t("keyExists") };
  if (conflict) return { error: t("keyConflict") };

  // Conflicts with anything else in the JSON files (arrays, top-level strings)
  const segments = [namespace, ...key.split(".")];
  for (const locale of routing.locales) {
    if (!isPathFree(await loadBaseMessages(locale), segments)) {
      return { error: t("keyConflict") };
    }
  }

  try {
    await prisma.translation.createMany({
      data: entries.map((entry) => ({
        locale: entry.locale,
        namespace,
        key,
        draftValue: entry.value,
        updatedById: admin.userId,
      })),
    });
  } catch (error) {
    // Lost a race against another request creating the same key
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: t("keyExists") };
    }
    throw error;
  }

  revalidatePanel();
  return { success: true };
}

// Only keys created from the panel can be deleted; JSON keys can only be reverted to default
export async function deleteCustomKey(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("Translations");

  const admin = await requirePlatformAdmin();
  if (!admin) return { error: t("forbidden") };

  const parsed = deleteKeySchema.safeParse(input);
  if (!parsed.success) return { error: t("invalidInput") };
  const { namespace, key } = parsed.data;

  const rows = await getTranslationRows();
  const row = rows.find((r) => r.namespace === namespace && r.key === key);
  if (!row?.isCustom) return { error: t("notCustomKey") };

  await prisma.translation.deleteMany({ where: { namespace, key } });

  // A published custom key may be live, so the cache has to be dropped too
  revalidateTag(TRANSLATIONS_TAG);
  revalidatePanel();
  return { success: true };
}

// Bulk publish: every draft becomes the published value in one atomic statement
export async function publishAll(): Promise<ActionResult> {
  const t = await getTranslations("Translations");

  const admin = await requirePlatformAdmin();
  if (!admin) return { error: t("forbidden") };

  const count = await prisma.$executeRaw`
    UPDATE "Translation"
    SET "publishedValue" = "draftValue",
        "draftValue" = NULL,
        "updatedById" = ${admin.userId},
        "updatedAt" = NOW()
    WHERE "draftValue" IS NOT NULL
  `;

  if (count === 0) return { error: t("nothingToPublish") };

  revalidateTag(TRANSLATIONS_TAG);
  revalidatePanel();
  return { success: true, count };
}
