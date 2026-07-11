import type { Role } from "@/types";

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/dashboards/group-admin/dashboard",
  MEMBER: "/dashboards/group-member/dashboard",
  VENDOR: "/dashboards/vendor-hub/dashboard",
  CUSTOMER: "/dashboards/vendor-customer/dashboard"
};

export function roleHomePath(role: Role) {
  return ROLE_HOME[role];
}

export function groupListPathByRole(role: Role) {
  if (role === "ADMIN") return "/dashboards/group-admin/groups";
  if (role === "MEMBER") return "/dashboards/group-member/groups";
  return "/dashboards/group-member/groups";
}

export function installmentListPathByRole(role: Role) {
  if (role === "VENDOR") return "/dashboards/vendor-hub/installments";
  if (role === "CUSTOMER") return "/dashboards/vendor-customer/installments";
  return "/dashboards/vendor-customer/installments";
}

export function installmentDetailPathByRole(role: Role, id: string) {
  return `${installmentListPathByRole(role)}/${id}`;
}

export function groupDetailPathByRole(role: Role, id: string) {
  return `${groupListPathByRole(role)}/${id}`;
}
