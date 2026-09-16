"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import type { Depot } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

const RoutesFilterBar = ({ depotList }: { depotList: Depot[] }) => {
  const common = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) {
        params.set("q", search);
      } else {
        params.delete("q");
      }
      startTransition(() => {
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    }, 400);

    return () => clearTimeout(timeout);
  }, [search]);

  const handleDepotChange = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "all") {
      params.delete("depotId");
    } else {
      params.set("depotId", value);
    }
    startTransition(() => {
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  const clearFilters = () => {
    setSearch("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("depotId");
    startTransition(() => {
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Input
        placeholder={common("searchByNamePlaceholder")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
      <Select value={searchParams.get("depotId") ?? "all"} onValueChange={handleDepotChange}>
        <SelectTrigger className="w-48">
          <SelectValue>
            {(value: string) =>
              value === "all" ? common("allDepots") : depotList.find((d) => d.id === value)?.name
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{common("allDepots")}</SelectItem>
          {depotList.map((depot) => (
            <SelectItem key={depot.id} value={depot.id}>
              {depot.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(search || searchParams.get("depotId")) && (
        <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
          {common("clearFilters")}
        </Button>
      )}
    </div>
  );
};

export default RoutesFilterBar;
