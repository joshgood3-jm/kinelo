import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { posterUrl } from "@/lib/tmdb";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function FriendProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return notFound();

  // Verify friendship
  const { data: friendship } = await supabase
    .from("friendships")
    .select("*")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`
    )
    .eq("status", "accepted")
    .single();

  if (!friendship) return notFound();

  const [{ data: profile }, { data: movies }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase
      .from("user_movies")
      .select("*, movies(*)")
      .eq("user_id", id)
      .order("elo_score", { ascending: false })
      .limit(50),
  ]);

  if (!profile) return notFound();

  const top5 = movies?.slice(0, 5) ?? [];
  const rest = movies?.slice(5) ?? [];

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <Link href="/friends" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
        <ArrowLeft size={16} /> Back
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-xl font-bold">
          {(profile.username as string)?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold">@{profile.username as string}</h1>
          {profile.full_name && <p className="text-muted-foreground text-sm">{profile.full_name as string}</p>}
          <p className="text-xs text-muted-foreground">{movies?.length ?? 0} movies ranked</p>
        </div>
      </div>

      {/* Top 5 grid */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Top 5</h2>
        <div className="grid grid-cols-5 gap-2">
          {top5.map((um, i) => {
            const movie = um.movies as { title: string; poster_path: string | null };
            const url = posterUrl(movie.poster_path, "w342");
            return (
              <div key={um.id} className="relative">
                <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-muted poster-shadow">
                  {url && <Image src={url} alt={movie.title} fill className="object-cover" sizes="20vw" />}
                </div>
                <div className="absolute -top-1 -left-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground z-10">
                  {i + 1}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Full ranked list */}
      {rest.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Full List</h2>
          <div className="space-y-2">
            {rest.map((um, i) => {
              const movie = um.movies as { title: string; poster_path: string | null; year: number; genres: string[] };
              const url = posterUrl(movie.poster_path, "w185");
              return (
                <div key={um.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                  <span className="w-7 text-center text-xs font-mono text-muted-foreground">#{i + 6}</span>
                  <div className="relative w-8 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {url && <Image src={url} alt={movie.title} fill className="object-cover" sizes="32px" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{movie.title}</p>
                    <p className="text-xs text-muted-foreground">{movie.year}</p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{um.elo_score}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
