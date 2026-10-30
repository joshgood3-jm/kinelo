import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Swords, ChevronRight } from "lucide-react";
import { posterUrl } from "@/lib/tmdb";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: topMovies }, { data: friendActivity }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("user_movies")
      .select("*, movies(*)")
      .eq("user_id", user.id)
      .order("elo_score", { ascending: false })
      .limit(5),
    supabase
      .from("friendships")
      .select(`
        addressee:profiles!friendships_addressee_id_fkey(id, username),
        requester:profiles!friendships_requester_id_fkey(id, username)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq("status", "accepted")
      .limit(5),
  ]);

  const hasMovies = topMovies && topMovies.length > 0;

  return (
    <div className="px-4 pt-8 pb-4 space-y-8">
      {/* Header */}
      <div>
        <p className="text-muted-foreground text-sm">Hello,</p>
        <h1 className="text-2xl font-bold">@{profile?.username ?? "there"} 👋</h1>
      </div>

      {/* Top 5 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Top 5</h2>
          <Link href="/movies" className="text-sm text-primary flex items-center gap-1">
            Full list <ChevronRight size={14} />
          </Link>
        </div>

        {!hasMovies ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-muted-foreground mb-4">No movies ranked yet.</p>
            <Link
              href="/movies"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90"
            >
              Add your first movies
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {topMovies.map((um, i) => {
              const movie = um.movies as { title: string; poster_path: string | null; year: number; genres: string[] };
              const url = posterUrl(movie.poster_path, "w185");
              return (
                <div key={um.id} className="flex items-center gap-4 bg-card border border-border rounded-2xl p-3">
                  <span className="w-7 text-center text-sm font-bold text-muted-foreground">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {url && <Image src={url} alt={movie.title} fill className="object-cover" sizes="40px" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{movie.title}</p>
                    <p className="text-xs text-muted-foreground">{movie.year} · {movie.genres?.[0]}</p>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{um.elo_score}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick Rank CTA */}
      <Link
        href="/rank"
        className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-2xl p-5 hover:bg-primary/15 transition-colors"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Swords size={18} className="text-primary" />
            <span className="font-semibold text-primary">Start Ranking</span>
          </div>
          <p className="text-sm text-muted-foreground">Compare movies head-to-head to build your list</p>
        </div>
        <ChevronRight size={20} className="text-primary" />
      </Link>

      {/* Friends count */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Friends</h2>
          <Link href="/friends" className="text-sm text-primary flex items-center gap-1">
            View all <ChevronRight size={14} />
          </Link>
        </div>
        {friendActivity && friendActivity.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {friendActivity.map((f) => {
              type FriendProfile = { id: string; username: string };
              const requester = f.requester as unknown as FriendProfile;
              const addressee = f.addressee as unknown as FriendProfile;
              const friend = requester?.id === user.id ? addressee : requester;
              return (
                <Link
                  key={friend?.id}
                  href={`/friends/${friend?.id}`}
                  className="px-3 py-1.5 bg-card border border-border rounded-full text-sm hover:border-primary transition-colors"
                >
                  @{friend?.username}
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            <Link href="/friends" className="text-primary hover:underline">Find friends</Link> to see their movie lists
          </p>
        )}
      </section>
    </div>
  );
}
