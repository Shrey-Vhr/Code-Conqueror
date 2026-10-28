import { redirect } from "next/navigation";
import { getSession, SessionUser } from "./session";

export type Role = "STUDENT" | "RESEARCHER" | "OWNER" | "MANAGER" | "ADMIN";

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(allowedRoles: Role[]): Promise<SessionUser> {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role as Role)) {
    redirect("/resources");
  }
  return session;
}

export function canManageResource(
  user: SessionUser,
  resource: { ownerId: string; department: string }
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "MANAGER" && (user.department === resource.department || user.department === "Campus" || user.department === "General")) {
    return true;
  }
  if (user.role === "OWNER" && user.id === resource.ownerId) {
    return true;
  }
  return false;
}

export function canReviewBooking(
  user: SessionUser,
  resource: { ownerId: string; department: string }
): boolean {
  return canManageResource(user, resource);
}

export function isStaff(role: string): boolean {
  return ["OWNER", "MANAGER", "ADMIN"].includes(role);
}

export function isManagerOrAdmin(role: string): boolean {
  return role === "MANAGER" || role === "ADMIN";
}
