"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: "/vehicles",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      throw new Error("Invalid email or password");
    }

    throw error;
  }
}
