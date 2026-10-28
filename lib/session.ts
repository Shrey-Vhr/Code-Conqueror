import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = process.env.SESSION_SECRET || "super-secret-campus-share-jwt-key-32-chars-long!";
const key = new TextEncoder().encode(SECRET_KEY);
const COOKIE_NAME = "campus-session";
const EXPIRATION_DAYS = 7;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
}

export async function signSession(payload: SessionUser): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRATION_DAYS}d`)
    .sign(key);
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySession(token);
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await signSession(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: EXPIRATION_DAYS * 24 * 60 * 60,
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
