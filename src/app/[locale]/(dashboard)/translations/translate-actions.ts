"use server";

import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { requirePlatformAdmin } from "@/lib/translations/guard";
import { getTranslationRows } from "@/lib/translations/catalog";
import { effectiveValue } from "@/lib/translations/cell";
import { maskPlaceholders } from "@/lib/translations/mask";
import {
  getProviderStatuses,
  planProviders,
  type ProviderPlan,
  type ProviderStatus,
} from "@/lib/translations/providers";
import { PROVIDER_IDS, type ProviderId } from "@/lib/translations/providers/meta";
import type { FailureReason } from "@/lib/translations/translate";
import {
  dedupeSwitches,
  translateTextsWithFallback,
  type ProviderSwitch,
} from "@/lib/translations/translate-with-fallback";

const localeSchema = z.enum(routing.locales);
const MAX_TEXT_LENGTH = 2000;
const CHUNK_MAX_ITEMS = 10;
const WORKLIST_LIMIT = 3000;

// Unknown or stale ids are ignored by planProviders, so an outdated browser setting
// never blocks translating
const providerChoice = {
  provider: z.string().max(40).nullish(),
  fallback: z.boolean().default(false),
};

function loadPlan(preferred: string | null | undefined, fallback: boolean): ProviderPlan | null {
  try {
    return planProviders(preferred, fallback);
  } catch (error) {
    console.error("Translation providers are not available:", error);
    return null;
  }
}

// A choice the server no longer offers is reported as a switch to the service used instead
function staleSelection(
  preferred: string | null | undefined,
  plan: ProviderPlan,
): ProviderSwitch[] {
  const wanted = PROVIDER_IDS.find((id) => id === preferred);
  return wanted && wanted !== plan.primary.name ? [{ from: wanted, to: plan.primary.name }] : [];
}

async function getFailureDescriber() {
  const t = await getTranslations("Translations");

  return (reason: FailureReason): string => {
    switch (reason) {
      case "unsupported":
        return t("failUnsupported");
      case "tooLong":
        return t("failTooLong");
      case "quota":
        return t("failQuota");
      case "unavailable":
        return t("failUnavailable");
      case "noResult":
        return t("failNoResult");
      case "placeholders":
        return t("failPlaceholders");
      case "syntax":
        return t("failSyntax");
    }
  };
}

// Feeds the provider settings dialog: which services the server has, never their credentials
export async function getProviderOptions(): Promise<{
  error?: string;
  providers?: ProviderStatus[];
  defaultId?: ProviderId;
}> {
  const t = await getTranslations("Translations");

  const admin = await requirePlatformAdmin();
  if (!admin) return { error: t("forbidden") };

  return getProviderStatuses();
}

const translateToLocalesSchema = z.object({
  text: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
  from: localeSchema,
  to: z.array(localeSchema).min(1).max(routing.locales.length),
  ...providerChoice,
});

// Used by the edit/add dialogs: one text, several target languages
export async function translateToLocales(input: unknown): Promise<{
  error?: string;
  results?: Record<string, string>;
  failures?: Record<string, string>;
  provider?: ProviderId;
  switched?: ProviderSwitch[];
}> {
  const t = await getTranslations("Translations");

  const admin = await requirePlatformAdmin();
  if (!admin) return { error: t("forbidden") };

  const parsed = translateToLocalesSchema.safeParse(input);
  if (!parsed.success) return { error: t("invalidInput") };
  const { text, from, provider, fallback } = parsed.data;
  const targets = [...new Set(parsed.data.to)].filter((code) => code !== from);
  if (targets.length === 0) return { error: t("invalidInput") };

  const plan = loadPlan(provider, fallback);
  if (!plan) return { error: t("providerNotConfigured") };
  const describe = await getFailureDescriber();

  const reports = await Promise.all(
    targets.map(
      async (code) => [code, await translateTextsWithFallback(plan, [text], from, code)] as const,
    ),
  );

  const results: Record<string, string> = {};
  const failures: Record<string, string> = {};
  for (const [code, report] of reports) {
    const outcome = report.outcomes[0];
    if (outcome?.ok) results[code] = outcome.text;
    else failures[code] = describe(outcome?.reason ?? "unavailable");
  }

  return {
    results,
    failures,
    provider: reports[0]?.[1].used ?? plan.primary.name,
    switched: dedupeSwitches([
      ...staleSelection(provider, plan),
      ...reports.flatMap(([, report]) => report.switched),
    ]),
  };
}

const worklistSchema = z.object({
  source: localeSchema,
  target: localeSchema,
  onlyMissing: z.boolean(),
});

// Lists the texts a bulk translation would send, so the client can run it in small chunks
export async function getBulkWorklist(input: unknown): Promise<{
  error?: string;
  items?: { id: string; text: string }[];
  unsupported?: number;
  alreadyTranslated?: number;
}> {
  const t = await getTranslations("Translations");

  const admin = await requirePlatformAdmin();
  if (!admin) return { error: t("forbidden") };

  const parsed = worklistSchema.safeParse(input);
  if (!parsed.success || parsed.data.source === parsed.data.target) {
    return { error: t("invalidInput") };
  }
  const { source, target, onlyMissing } = parsed.data;

  const rows = await getTranslationRows();
  const items: { id: string; text: string }[] = [];
  let unsupported = 0;
  let alreadyTranslated = 0;

  for (const row of rows) {
    const sourceCell = row.cells[source];
    const text = sourceCell ? effectiveValue(sourceCell) : "";
    if (text.trim() === "") continue;

    const targetCell = row.cells[target];
    if (onlyMissing && targetCell && effectiveValue(targetCell).trim() !== "") {
      alreadyTranslated++;
      continue;
    }
    if (maskPlaceholders(text) === null) {
      unsupported++;
      continue;
    }
    if (items.length < WORKLIST_LIMIT) items.push({ id: row.id, text });
  }

  return { items, unsupported, alreadyTranslated };
}

const chunkSchema = z.object({
  from: localeSchema,
  to: localeSchema,
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(300),
        text: z.string().min(1).max(MAX_TEXT_LENGTH),
      }),
    )
    .min(1)
    .max(CHUNK_MAX_ITEMS),
  ...providerChoice,
});

// Translates a small chunk of a bulk run. The client calls it repeatedly, which keeps every
// request short and lets the run be stopped and report progress. The service that finished
// the chunk is returned so the client can keep using it for the next ones.
export async function translateChunk(input: unknown): Promise<{
  error?: string;
  results?: Record<string, string>;
  failed?: { id: string; reason: string }[];
  // Set when every allowed service ran out of quota or is down: the client should stop
  stopped?: boolean;
  provider?: ProviderId;
  switched?: ProviderSwitch[];
}> {
  const t = await getTranslations("Translations");

  const admin = await requirePlatformAdmin();
  if (!admin) return { error: t("forbidden") };

  const parsed = chunkSchema.safeParse(input);
  if (!parsed.success || parsed.data.from === parsed.data.to) return { error: t("invalidInput") };
  const { from, to, items, provider, fallback } = parsed.data;

  const plan = loadPlan(provider, fallback);
  if (!plan) return { error: t("providerNotConfigured") };
  const describe = await getFailureDescriber();

  const report = await translateTextsWithFallback(
    plan,
    items.map((item) => item.text),
    from,
    to,
  );

  const results: Record<string, string> = {};
  const failed: { id: string; reason: string }[] = [];
  let stopped = false;

  for (const [index, outcome] of report.outcomes.entries()) {
    const item = items[index];
    if (!item) continue;

    if (outcome.ok) {
      results[item.id] = outcome.text;
      continue;
    }
    failed.push({ id: item.id, reason: describe(outcome.reason) });
    if (outcome.reason === "quota" || outcome.reason === "unavailable") stopped = true;
  }

  return {
    results,
    failed,
    stopped,
    provider: report.used,
    switched: dedupeSwitches([...staleSelection(provider, plan), ...report.switched]),
  };
}
