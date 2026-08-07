import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

// TODO (Hafta 1): Credentials provider'ı gerçek kullanıcı doğrulamasıyla
// (bcrypt hash karşılaştırması) tamamla. Şu an sadece iskelet.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        // TODO: prisma ile kullanıcıyı tenant bağlamında bul ve şifreyi doğrula
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    // TODO: JWT'ye tenantId ve role bilgisini ekle (multi-tenant + RBAC için kritik)
    async jwt({ token }) {
      return token;
    },
  },
});
