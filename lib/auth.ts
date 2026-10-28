"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { createSession, deleteSession } from "./session";
import { redirect } from "next/navigation";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function loginAction(formData: FormData) {
  try {
    const rawEmail = formData.get("email");
    const rawPassword = formData.get("password");

    const validated = LoginSchema.safeParse({
      email: rawEmail,
      password: rawPassword,
    });

    if (!validated.success) {
      return { success: false, error: validated.error.errors[0].message };
    }

    const { email, password } = validated.data;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return { success: false, error: "Invalid email or password" };
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { success: false, error: "Invalid email or password" };
    }

    if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      return {
        success: false,
        error: `Account suspended until ${new Date(
          user.suspendedUntil
        ).toLocaleDateString()}`,
      };
    }

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred" };
  }
}

export async function quickLoginAction(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return { success: false, error: "Demo user not found" };
    }

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Quick login failed" };
  }
}

export async function switchRoleAction(email: string): Promise<void> {
  await quickLoginAction(email);
  redirect("/resources");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
