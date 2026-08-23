"use server";

import { signIn, auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueRefreshToken } from "@/lib/refresh-token";
import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) throw new Error("couldnt get session info");

    const refreshToken = await issueRefreshToken(user.id);

    // set cookies after login
    const expiresIn = Math.floor(Number(process.env.REFRESH_TOKEN_EXPIRE_MS) / 1000); // convert to seconds

    const cookieStore = await cookies();
    cookieStore.set({
      name: "fleetops.refresh-token",
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: expiresIn,
    });

    redirect("/");
  } catch (error) {
    if (error instanceof AuthError) {
      throw new Error("Invalid email or password");
    }

    throw error;
  }
}
