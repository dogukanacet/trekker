"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { TRANSLATIONS_TAG } from "@/i18n/messages";
import { requirePlatformAdmin } from "@/lib/translations/guard";
import { keyExistsInBase } from "@/lib/translations/catalog";

type ActionResult = { error?: string; success?: boolean; count?: number };

const keySchema = z.object({
  locale: z.enum(routing.locales),
  namespace: z.string().min(1).max(100),
  key: z.string().min(1).max(200),
});

const saveDraftSchema = keySchema.extend({
  value: z.string().min(1).max(2000),
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

  // Only keys that exist in the bundled JSON can be overridden
  if (!(await keyExistsInBase(locale, namespace, key))) {
    return { error: t("unknownKey") };
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
