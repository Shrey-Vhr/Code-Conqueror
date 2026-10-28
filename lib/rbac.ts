import { redirect } from "next/navigation";
import { getSession, SessionUser } from "./session";
import { prisma } from "./prisma";

export type Role = "STUDENT" | "RESEARCHER" | "OWNER" | "MANAGER" | "ADMIN";

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Live database check to prevent stale session privileges and enforce suspensions
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      suspendedUntil: true,
      strikes: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
    redirect("/login?error=Account+suspended");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
  };
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
  if (
    user.role === "MANAGER" &&
    (user.department === resource.department ||
      resource.department === "Campus" ||
      user.department === "Campus")
  ) {
    return true;
  }
  if ((user.role === "OWNER" || user.role === "STAFF") && user.id === resource.ownerId) {
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
