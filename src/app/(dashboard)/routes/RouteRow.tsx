"use client";

import { useActionState, useEffect, useState } from "react";
import type { Route, Depot } from "@prisma/client";
import Link from "next/link";
import * as routeActions from "@/app/(dashboard)/routes/actions";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

const RouteRow = ({ route, depotList }: { route: Route; depotList: Depot[] }) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [updateState, updateAction, isUpdatePending] = useActionState(
    routeActions.updateRoute.bind(null, route.id),
    { error: null, success: false },
  );
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (updateState.success) {
      toast.success("Rota başarıyla güncellendi");
      setIsEditOpen(false);
    }
  }, [updateState.success]);

  const handleDelete = async () => {
    setIsDeletePending(true);
    const result = await routeActions.deleteRoute(route.id, { error: null, success: false });
    setIsDeletePending(false);

    if (result.error) {
      setDeleteError(result.error);
    } else {
      toast.success("Rota başarıyla silindi");
      setIsDeleteOpen(false);
    }
  };

  const depotName = depotList.find((d) => d.id === route.depotId)?.name ?? "—";

  return (
    <TableRow>
      <TableCell>{route.name}</TableCell>
      <TableCell>{depotName}</TableCell>
      <TableCell>{route.createdAt.toLocaleDateString("tr")}</TableCell>
      <TableCell className="text-right space-x-2">
        <Button variant="ghost" size="icon" render={<Link href={`/routes/${route.id}`} />}>
          <Eye className="h-4 w-4" />
        </Button>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger render={<Button variant="ghost" size="icon" />}>
            <Pencil className="h-4 w-4" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rotayı Düzenle</DialogTitle>
            </DialogHeader>
            <form action={updateAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`name-${route.id}`}>Rota Adı</Label>
                <Input id={`name-${route.id}`} name="name" defaultValue={route.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`depotId-${route.id}`}>Depo</Label>
                <Select name="depotId" defaultValue={route.depotId}>
                  <SelectTrigger id={`depotId-${route.id}`}>
                    <SelectValue>
                      {(value: string) => depotList.find((d) => d.id === value)?.name}
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
              {updateState.error && <p className="text-sm text-destructive">{updateState.error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={isUpdatePending}>
                  {isUpdatePending ? "Güncelleniyor..." : "Kaydet"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogTrigger render={<Button variant="ghost" size="icon" />}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rotayı sil</AlertDialogTitle>
              <AlertDialogDescription>
                {route.name} kalıcı olarak silinecek. Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              <AlertDialogFooter>
                <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                <Button
                  type="submit"
                  className="bg-destructive hover:bg-destructive/90"
                  disabled={isDeletePending}
                >
                  {isDeletePending ? "Siliniyor..." : "Sil"}
                </Button>
              </AlertDialogFooter>
              {deleteError && <p className="text-sm text-destructive mt-2">{deleteError}</p>}
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
};

export default RouteRow;
