import { auth } from "@/lib/auth";
import { logoutAction } from "@/app//(dashboard)/logout/actions";
import { ThemeToggle } from "@/components/theme-toggle";

export async function Topbar() {
  const session = await auth();
  return (
    <header className="h-14 border-b flex items-center justify-between px-6">
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        {session?.user?.email}
        <ThemeToggle />
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Çıkış yap
        </button>
      </form>
    </header>
  );
}
