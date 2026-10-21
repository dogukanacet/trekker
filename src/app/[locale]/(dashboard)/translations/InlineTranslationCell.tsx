"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { TranslationRow } from "@/lib/translations/catalog";
import { effectiveValue } from "@/lib/translations/cell";
import { discardDraft, saveDraft } from "@/app/[locale]/(dashboard)/translations/actions";

// Icons stay hidden until the cell is hovered or focused (always visible on touch screens)
const HOVER_ONLY =
  "opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100";

export function InlineTranslationCell({ row, locale }: { row: TranslationRow; locale: string }) {
  const t = useTranslations("Translations");
  const common = useTranslations("Common");
  const cell = row.cells[locale];

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing) {
      const input = inputRef.current;
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    }
  }, [isEditing]);

  // Custom keys have no JSON value, but every locale cell of them is editable
  if (!cell) {
    return <span className="text-muted-foreground">{common("notAvailable")}</span>;
  }

  const current = effectiveValue(cell);
  // An <input> cannot hold line breaks, so those texts are edited in the dialog
  const canEditInline = !current.includes("\n");
  const isDraft = cell.draft !== null;

  const startEditing = () => {
    setValue(current);
    setIsEditing(true);
  };

  const stopEditing = () => setIsEditing(false);

  const save = () => {
    if (value === current) {
      stopEditing();
      return;
    }
    if (value.trim() === "") {
      // Stay in edit mode so the user can fix the value
      toast.error(t("emptyValue"));
      return;
    }
    startTransition(async () => {
      const result = await saveDraft({
        locale,
        namespace: row.namespace,
        key: row.key,
        value,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      stopEditing();
    });
  };

  const discard = () => {
    startTransition(async () => {
      const result = await discardDraft({
        locale,
        namespace: row.namespace,
        key: row.key,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("draftDiscarded"));
    });
  };

  // Pressing an icon must not move focus away from the input, otherwise the
  // resulting blur would close the editor before the click is handled
  const keepFocus = (event: React.MouseEvent) => event.preventDefault();

  return (
    <div
      ref={wrapperRef}
      className="group flex w-full items-center gap-1 h-full"
      // Keep the grid from handling keys while the user interacts with the cell
      onKeyDown={(e) => e.stopPropagation()}
      onBlur={(event) => {
        if (!isEditing || isPending) return;
        // Focus moving between the input and the buttons is not leaving the cell
        if (wrapperRef.current?.contains(event.relatedTarget)) return;
        stopEditing();
      }}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={value}
          readOnly={isPending}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              stopEditing();
            }
          }}
          // Inset ring: an outer ring would be clipped by the grid cell
          className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none read-only:opacity-60 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring/50"
        />
      ) : (
        <span
          title={current}
          className={`min-w-0 flex-1 truncate ${
            isDraft ? "italic text-amber-700 dark:text-amber-400" : ""
          }`}
        >
          {current || common("notAvailable")}
        </span>
      )}

      {isEditing && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          aria-label={common("save")}
          title={common("save")}
          disabled={isPending}
          onMouseDown={keepFocus}
          onClick={save}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      )}

      {!isEditing && isDraft && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-6 w-6 shrink-0 ${HOVER_ONLY}`}
          aria-label={t("discardDraft")}
          title={t("discardDraft")}
          disabled={isPending}
          onClick={discard}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
      )}

      {canEditInline && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isEditing ? t("cancelEdit") : t("editInline")}
          title={isEditing ? t("cancelEdit") : t("editInline")}
          disabled={isPending}
          onMouseDown={keepFocus}
          onClick={isEditing ? stopEditing : startEditing}
          className={`h-6 w-6 shrink-0 ${isEditing ? "bg-muted" : HOVER_ONLY}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
