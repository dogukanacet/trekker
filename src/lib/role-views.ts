import type { Role } from "@prisma/client";
import type { Session } from "next-auth";
import type { ComponentType } from "react";

export type RoleViewProps = { session: Session | null };

type RoleViewMap = Partial<Record<Role, ComponentType<RoleViewProps>>> & {
  default: ComponentType<RoleViewProps>;
};

export function resolveRoleView(
  views: RoleViewMap,
  role: Role | undefined,
): ComponentType<RoleViewProps> {
  if (role && views[role]) return views[role]!;
  return views.default;
}
