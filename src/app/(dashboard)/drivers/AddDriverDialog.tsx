"use client";

import { useActionState, useEffect, useState } from "react";
import type { Depot } from "@prisma/client";
import * as driverActions from "@/app/(dashboard)/drivers/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

export function AddDriverDialog({ depotList }: { depotList: Depot[] }) {
  const [open, setOpen] = useState(false);
  const [actionState, formAction, isPending] = useActionState(driverActions.createDriver, {
    error: null,
  });

  useEffect(() => {
    if (!isPending && actionState.error === null && actionState !== undefined) {
      setOpen(false);
    }
  }, [isPending, actionState]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" />
        Sürücü Ekle
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Sürücü</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Ad Soyad</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseUntil">Ehliyet Bitiş Tarihi</Label>
            <Input id="licenseUntil" name="licenseUntil" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="depotId">Depo</Label>
            <Select name="depotId" required>
              <SelectTrigger id="depotId">
                <SelectValue>
                  {(value: string | null) =>
                    value ? depotList.find((d) => d.id === value)?.name : "Depo seç"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {depotList.map((depot) => (
                  <SelectItem key={depot.id} value={depot.id}>
                    {depot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {actionState.error && <p className="text-sm text-destructive">{actionState.error}</p>}
          <DialogFooter>
            <Button type="submit">Ekle</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
