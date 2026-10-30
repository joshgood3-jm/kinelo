"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Swords, Film, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/rank", icon: Swords, label: "Rank" },
  { href: "/movies", icon: Film, label: "My List" },
  { href: "/friends", icon: Users, label: "Friends" },
  { href: "/recommendations", icon: Sparkles, label: "For You" },
];

export default function BottomNav() {
  const pathname = usePathname();
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
      </div>
    </nav>
  );
}
