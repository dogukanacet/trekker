import type { Role } from "@prisma/client";

export type Resource = "depots" | "vehicles" | "drivers" | "routes" | "dispatches" | "users";
export type Action = "read" | "create" | "update" | "delete";

const ALL: readonly Action[] = ["read", "create", "update", "delete"];

const permissions: Record<Role, Partial<Record<Resource, readonly Action[]>>> = {
  ADMIN: {
    depots: ALL,
    vehicles: ALL,
    drivers: ALL,
    routes: ALL,
    dispatches: ALL,
    users: ALL,
  },
  DISPATCHER: {
    depots: ["read"],
    vehicles: ALL,
    drivers: ALL,
    routes: ALL,
    dispatches: ALL,
  },
  DRIVER: {
    dispatches: ["read"],
  },
};

export function can(role: Role | undefined, resource: Resource, action: Action): boolean {
  if (!role) return false;
  return permissions[role][resource]?.includes(action) ?? false;
}
