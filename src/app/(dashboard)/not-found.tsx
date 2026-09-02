import Link from "next/link";
import { Button } from "@/components/ui/button";
import { typography } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className={typography.pageTitle}>Bulunamadı</h1>
      <p className={typography.secondary}>Aradığın kayıt mevcut değil ya da erişim yetkin yok.</p>
      <Button render={<Link href="/" />}>Panele Dön</Button>
    </div>
  );
}
