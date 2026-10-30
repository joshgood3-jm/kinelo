import Link from "next/link";

export default async function LandingPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (supabaseUrl.startsWith("http")) {
    const { createClient } = await import("@/lib/supabase/server");
    const { redirect } = await import("next/navigation");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/home");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Cinematic background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-md">
        <div className="mb-6">
          <span className="text-6xl">🎬</span>
        </div>
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Kinelo
        </h1>
        <p className="text-muted-foreground text-lg mb-2">
          Rank movies head-to-head.
        </p>
        <p className="text-muted-foreground mb-10">
          Build your definitive list, see what your friends love, and discover films made for you.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/signup"
            className="w-full py-3 px-6 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="w-full py-3 px-6 bg-card border border-border text-foreground font-semibold rounded-xl hover:bg-muted transition-colors"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-6 text-center">
          {[
            { icon: "⚔️", label: "Pairwise Ranking" },
            { icon: "👥", label: "Friends Lists" },
            { icon: "✨", label: "AI Picks" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <span className="text-2xl">{icon}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
