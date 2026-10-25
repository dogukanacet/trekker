import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { typography } from "@/lib/constants";
import { parsePagination } from "@/lib/pagination";
import { requirePlatformAdmin } from "@/lib/translations/guard";
import { countDrafts, getTranslationRows } from "@/lib/translations/catalog";
import { queryTranslationRows } from "@/lib/translations/query";
import TranslationsGrid from "@/app/[locale]/(dashboard)/translations/TranslationsGrid";
import { PublishButton } from "@/app/[locale]/(dashboard)/translations/PublishButton";
import { TranslationsSearch } from "@/app/[locale]/(dashboard)/translations/TranslationsSearch";
import { AddTranslationDialog } from "@/app/[locale]/(dashboard)/translations/AddTranslationDialog";
import { routing } from "@/i18n/routing";
import { getEnabledLocales } from "@/i18n/languages";
import { getLanguageStats } from "@/lib/translations/language-stats";
import { LanguagesDialog } from "@/app/[locale]/(dashboard)/translations/LanguagesDialog";
import { getRecentReleases } from "@/lib/translations/releases";
import { ReleaseHistoryDialog } from "@/app/[locale]/(dashboard)/translations/ReleaseHistoryDialog";

const TranslationsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    key?: string;
    namespace?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    pageSize?: string;
  }>;
}) => {
  const admin = await requirePlatformAdmin();
  if (!admin) notFound(); // Middleware cannot check this flag (Edge, no DB), so the page enforces it itself

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePagination({
    page: params.page,
    pageSize: params.pageSize,
  });

  const [allRows, draftCount, enabledLocales, releases, t] = await Promise.all([
    getTranslationRows(),
    countDrafts(),
    getEnabledLocales(),
    getRecentReleases(),
    getTranslations("Translations"),
  ]);
  const { rows, totalCount } = queryTranslationRows(
    allRows,
    params,
    { skip, take },
    {
      locales: enabledLocales,
    },
  );
  const namespaces = [...new Set(allRows.map((row) => row.namespace))].sort();
  const languageStats = getLanguageStats(
    allRows,
    routing.locales,
    enabledLocales,
    routing.defaultLocale,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>{t("title")}</h1>
          <p className={typography.secondary}>{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <ReleaseHistoryDialog releases={releases} />
          <LanguagesDialog languages={languageStats} />
          <AddTranslationDialog namespaces={namespaces} locales={enabledLocales} />
          <PublishButton draftCount={draftCount} />
        </div>
      </div>
      <TranslationsSearch />
      <TranslationsGrid
        rows={rows}
        locales={enabledLocales}
        pagination={{ page, pageSize, totalCount }}
      />
    </div>
  );
};

export default TranslationsPage;
