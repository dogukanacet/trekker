import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { TRANSLATIONS_TAG } from "@/i18n/messages";

// Temporary dev-only helper, removed once the publish action exists
export function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  revalidateTag(TRANSLATIONS_TAG);
  return NextResponse.json({ ok: true });
}
