"use server";

import { signIn } from "@/lib/auth";
import { z } from "zod";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

const registerSchema = z.object({
  email: z.string().min(3, "email is required"),
  password: z.string().min(8, "password is required"),
  companyName: z.string().min(1, "company name is required"),
});

export async function registerAction(formData: FormData) {
  try {
    const companyName = formData.get("companyName") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const validationResult = registerSchema.safeParse({
      email,
      password,
      companyName,
    });

    if (!validationResult.success) {
      throw new Error("Geçersiz form verileri");
    }

    const validData = validationResult.data;

    const isEmailExist = await prisma.user.findUnique({
      where: { email: validData.email },
    });

    if (isEmailExist) {
      throw new Error("Bu e-posta adresi zaten kullanımda");
    }

    const passwordHash = await bcrypt.hash(validData.password, 10);

    await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: validData.companyName },
      });

      await tx.depot.create({
        data: { name: "Ana Depo", tenantId: tenant.id },
      });

      await tx.user.create({
        data: {
          email: validData.email,
          passwordHash,
          tenantId: tenant.id,
          role: "ADMIN",
        },
      });
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      throw new Error("Geçersiz e-posta veya şifre");
    }

    throw error;
  }

  // 5. Yönlendirmeyi her şey başarıyla bittikten sonra, try-catch dışında yapın
  redirect("/login");
}
