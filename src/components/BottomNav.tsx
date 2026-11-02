"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Swords, Film, Users, Sparkles, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/rank", icon: Swords, label: "Rank" },
  { href: "/movies", icon: Film, label: "My List" },
  { href: "/friends", icon: Users, label: "Friends" },
  { href: "/recommendations", icon: Sparkles, label: "Next Watch" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-card/95 backdrop-blur border-t border-border z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
        >
          <LogOut size={20} strokeWidth={1.5} />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
