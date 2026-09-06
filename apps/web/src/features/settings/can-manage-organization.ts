export function canManageOrganization(role: string): boolean {
  return role === "owner" || role === "admin";
}
