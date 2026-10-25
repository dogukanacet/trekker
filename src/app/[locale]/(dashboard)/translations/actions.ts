"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { TRANSLATIONS_TAG } from "@/i18n/messages";
import { LANGUAGES_TAG } from "@/i18n/languages";
import { requirePlatformAdmin } from "@/lib/translations/guard";
import {
  createReferenceResolver,
  getTranslationRows,
  keyExistsInAnyBase,
  loadBaseMessages,
} from "@/lib/translations/catalog";
import {
  findKeyConflict,
  isPathFree,
  isValidKeyPath,
  isValidNamespace,
} from "@/lib/translations/key-rules";
import { validateTranslation, type ValidationIssue } from "@/lib/translations/validate";
import { planRevert } from "@/lib/translations/revert-plan";
import type { ReleaseItemView } from "@/lib/translations/releases";

type ActionResult = { error?: string; success?: boolean; count?: number; skipped?: number };

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

const languageSchema = z.object({
  code: z.enum(routing.locales),
  enabled: z.boolean(),
});

const releaseIdSchema = z.object({ releaseId: z.string().min(1).max(50) });
const RELEASE_ITEM_LIMIT = 200;

function revalidatePanel() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/translations`);
  }
}

// Placeholder names are shown the way they are written in a message: {name} and <b>
function formatNames(names: string[]): string {
  return names.map((name) => (name.startsWith("<") ? name : `{${name}}`)).join(", ");
}

// Returns a function that turns a validation issue into a user-facing message
async function getIssueDescriber() {
  const t = await getTranslations("Translations");

  return (issue: ValidationIssue): string => {
    if (issue.type === "syntax") return t("invalidSyntax");

    const parts: string[] = [];
    if (issue.missing.length > 0) {
      parts.push(t("placeholdersMissing", { names: formatNames(issue.missing) }));
    }
    if (issue.extra.length > 0) {
      parts.push(t("placeholdersExtra", { names: formatNames(issue.extra) }));
    }
    return parts.join(" ");
  };
}

export async function saveDraft(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("Translations");

  const admin = await requirePlatformAdmin();
  if (!admin) return { error: t("forbidden") };

  const parsed = saveDraftSchema.safeParse(input);
  if (!parsed.success) return { error: t("invalidInput") };
  const { locale, namespace, key, value } = parsed.data;

  // Allowed: a key present in any locale's JSON, or a custom key (in no JSON, but in the DB)
  if (!(await keyExistsInAnyBase(namespace, key))) {
    const isCustom = (await prisma.translation.count({ where: { namespace, key } })) > 0;
    if (!isCustom) return { error: t("unknownKey") };
  }

  const resolveReference = await createReferenceResolver();
  const issue = validateTranslation(value, resolveReference(namespace, key, locale));
  if (issue) {
    const describeIssue = await getIssueDescriber();
    return { error: describeIssue(issue) };
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
// other locales are optional and show the key name until they are translated.
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
  const defaultEntry = entries.find((entry) => entry.locale === routing.defaultLocale);
  if (!defaultEntry) {
    return { error: t("defaultLocaleRequired", { locale: routing.defaultLocale.toUpperCase() }) };
  }

  // The default text defines the placeholders; every other language has to match it
  const describeIssue = await getIssueDescriber();
  for (const entry of entries) {
    const reference = entry.locale === routing.defaultLocale ? null : defaultEntry.value;
    const issue = validateTranslation(entry.value, reference);
    if (issue) return { error: `${entry.locale.toUpperCase()}: ${describeIssue(issue)}` };
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

type PublishedRow = {
  locale: string;
  namespace: string;
  key: string;
  previousValue: string | null;
  newValue: string;
};

// Bulk publish: every draft becomes the published value, and the release record
// with the previous values is written in the same transaction
export async function publishAll(): Promise<ActionResult> {
  const t = await getTranslations("Translations");

  const admin = await requirePlatformAdmin();
  if (!admin) return { error: t("forbidden") };

  // Re-validate every draft: the reference text may have changed (e.g. a deploy
  // edited the JSON) since the draft was saved
  const drafts = await prisma.translation.findMany({
    where: { draftValue: { not: null } },
    select: { locale: true, namespace: true, key: true, draftValue: true },
  });
  const resolveReference = await createReferenceResolver();
  const invalid = drafts.filter(
    (draft) =>
      draft.draftValue !== null &&
      validateTranslation(
        draft.draftValue,
        resolveReference(draft.namespace, draft.key, draft.locale),
      ) !== null,
  );
  if (invalid.length > 0) {
    const examples = invalid
      .slice(0, 3)
      .map((draft) => `${draft.locale.toUpperCase()} ${draft.namespace}.${draft.key}`)
      .join(", ");
    return { error: t("publishBlocked", { count: invalid.length, keys: examples }) };
  }

  const count = await prisma.$transaction(
    async (tx) => {
      // One statement: lock the draft rows, keep their previous published value,
      // move draft -> published, and return what changed
      const changed = await tx.$queryRaw<PublishedRow[]>`
        WITH drafts AS (
          SELECT "id", "publishedValue" AS "previousValue"
          FROM "Translation"
          WHERE "draftValue" IS NOT NULL
          FOR UPDATE
        )
        UPDATE "Translation" AS t
        SET "publishedValue" = t."draftValue",
            "draftValue" = NULL,
            "updatedById" = ${admin.userId},
            "updatedAt" = NOW()
        FROM drafts
        WHERE t."id" = drafts."id"
        RETURNING t."locale" AS "locale",
                  t."namespace" AS "namespace",
                  t."key" AS "key",
                  drafts."previousValue" AS "previousValue",
                  t."publishedValue" AS "newValue"
      `;
      if (changed.length === 0) return 0;

      const release = await tx.translationRelease.create({
        data: { kind: "PUBLISH", createdById: admin.userId },
        select: { id: true },
      });
      await tx.translationReleaseItem.createMany({
        data: changed.map((row) => ({
          releaseId: release.id,
          locale: row.locale,
          namespace: row.namespace,
          key: row.key,
          previousValue: row.previousValue,
          newValue: row.newValue,
        })),
      });
      return changed.length;
    },
    { timeout: 30_000 },
  );

  if (count === 0) return { error: t("nothingToPublish") };

  revalidateTag(TRANSLATIONS_TAG);
  revalidatePanel();
  return { success: true, count };
}

export async function setLanguageEnabled(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("Translations");

  const admin = await requirePlatformAdmin();
  if (!admin) return { error: t("forbidden") };

  const parsed = languageSchema.safeParse(input);
  if (!parsed.success) return { error: t("invalidLanguage") };
  const { code, enabled } = parsed.data;

  if (code === routing.defaultLocale && !enabled) {
    return { error: t("cannotDisableDefault") };
  }

  await prisma.language.upsert({
    where: { code },
    create: { code, enabled, updatedById: admin.userId },
    update: { enabled, updatedById: admin.userId },
  });

  revalidateTag(LANGUAGES_TAG);
  revalidatePanel();
  return { success: true };
}

// Undoes one release. Texts that changed after it are skipped (see planRevert).
// The undo itself is recorded as a new release, so the history stays append-only.
export async function revertRelease(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("Translations");

  const admin = await requirePlatformAdmin();
  if (!admin) return { error: t("forbidden") };

  const parsed = releaseIdSchema.safeParse(input);
  if (!parsed.success) return { error: t("invalidInput") };
  const { releaseId } = parsed.data;

  const outcome = await prisma.$transaction(
    async (tx) => {
      const release = await tx.translationRelease.findUnique({
        where: { id: releaseId },
        select: {
          items: {
            select: {
              locale: true,
              namespace: true,
              key: true,
              previousValue: true,
              newValue: true,
            },
          },
        },
      });
      if (!release) return { status: "notFound" as const };

      // A superset of the affected rows is fine: the plan matches them exactly
      const rows = await tx.translation.findMany({
        where: {
          locale: { in: [...new Set(release.items.map((item) => item.locale))] },
          namespace: { in: [...new Set(release.items.map((item) => item.namespace))] },
        },
        select: {
          locale: true,
          namespace: true,
          key: true,
          publishedValue: true,
          draftValue: true,
        },
      });

      const plan = planRevert(release.items, rows);
      if (plan.operations.length === 0) return { status: "nothing" as const };

      for (const operation of plan.operations) {
        const { locale, namespace, key } = operation.item;
        const where = { locale_namespace_key: { locale, namespace, key } };

        if (operation.type === "delete") {
          await tx.translation.delete({ where });
        } else if (operation.type === "update") {
          await tx.translation.update({
            where,
            data: { publishedValue: operation.target, updatedById: admin.userId },
          });
        } else {
          await tx.translation.create({
            data: {
              locale,
              namespace,
              key,
              publishedValue: operation.target,
              updatedById: admin.userId,
            },
          });
        }
      }

      const revert = await tx.translationRelease.create({
        data: { kind: "REVERT", revertsReleaseId: releaseId, createdById: admin.userId },
        select: { id: true },
      });
      await tx.translationReleaseItem.createMany({
        data: plan.operations.map((operation) => ({
          releaseId: revert.id,
          locale: operation.item.locale,
          namespace: operation.item.namespace,
          key: operation.item.key,
          previousValue: operation.current,
          newValue: operation.target,
        })),
      });

      return {
        status: "done" as const,
        reverted: plan.operations.length,
        skipped: plan.skipped,
      };
    },
    { timeout: 30_000 },
  );

  if (outcome.status === "notFound") return { error: t("releaseNotFound") };
  if (outcome.status === "nothing") return { error: t("nothingToRevert") };

  revalidateTag(TRANSLATIONS_TAG);
  revalidatePanel();
  return { success: true, count: outcome.reverted, skipped: outcome.skipped };
}

// Loaded lazily when a release is expanded in the history dialog
export async function getReleaseItems(
  releaseId: string,
): Promise<{ error?: string; items?: ReleaseItemView[]; truncated?: boolean }> {
  const t = await getTranslations("Translations");

  const admin = await requirePlatformAdmin();
  if (!admin) return { error: t("forbidden") };

  const parsed = releaseIdSchema.safeParse({ releaseId });
  if (!parsed.success) return { error: t("invalidInput") };

  const rows = await prisma.translationReleaseItem.findMany({
    where: { releaseId: parsed.data.releaseId },
    orderBy: [{ namespace: "asc" }, { key: "asc" }, { locale: "asc" }],
    take: RELEASE_ITEM_LIMIT + 1,
  });

  return {
    items: rows.slice(0, RELEASE_ITEM_LIMIT).map((row) => ({
      id: row.id,
      locale: row.locale,
      path: `${row.namespace}.${row.key}`,
      previousValue: row.previousValue,
      newValue: row.newValue,
    })),
    truncated: rows.length > RELEASE_ITEM_LIMIT,
  };
}
