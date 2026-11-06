"use client";
import { useEffect, useState, useRef } from "react";
import { posterUrl, getMovieDetail, tmdbMovieToMovie } from "@/lib/tmdb";
import Image from "next/image";
import { Sparkles, Plus, Check, X, Bookmark, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { starsToListElo, neighborhoodPool } from "@/lib/elo";
import QuickRankModal, { type QuickRankMovie } from "@/components/QuickRankModal";
import StarRatingModal from "@/components/StarRatingModal";
import type { TMDBMovieDetail, UserMovie } from "@/types";

interface Rec { movie: TMDBMovieDetail; score: number; reasons: string[] }

const PAGE_SIZE = 8;

export default function RecommendationsPage() {
  const poolRef = useRef<Rec[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const [queue, setQueue] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [justAdded, setJustAdded] = useState<Set<number>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [quickRank, setQuickRank] = useState<{ newMovie: QuickRankMovie; pool: QuickRankMovie[]; fullPool: QuickRankMovie[] } | null>(null);
  const [starPending, setStarPending] = useState<{ movie: TMDBMovieDetail; m: { id: number; title: string; poster_path: string | null } } | null>(null);
  const userMoviesRef = useRef<UserMovie[]>([]);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      let alreadyAdded = new Set<number>();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase.from("user_movies").select("*, movies(*)").eq("user_id", user.id).order("elo_score", { ascending: false });
        if (data) {
          userMoviesRef.current = data as unknown as UserMovie[];
          alreadyAdded = new Set(data.map((r: { movie_id: number }) => r.movie_id));
        }
        const { data: wl } = await supabase.from("watchlist").select("movie_id").eq("user_id", user.id);
        const watchlistIds = new Set<number>(wl?.map((r: { movie_id: number }) => r.movie_id) ?? []);
        if (watchlistIds.size > 0) setSavedIds(watchlistIds);
        for (const id of watchlistIds) alreadyAdded.add(id);
      }

      // Server does all the heavy lifting — TMDB credits graph, scoring, ranking
      const res = await fetch("/api/recommendations");
      const data = await res.json();

      const recs: Rec[] = (data.recs ?? data.fallback ?? []).filter(
        (r: Rec) => !alreadyAdded.has(r.movie.id)
      );

      poolRef.current = recs;
      setHiddenIds(alreadyAdded);
      setQueue(recs.slice(0, PAGE_SIZE));
      setLoading(false);
    })();
  }, [supabase]);

  const visible = queue.filter((r) => !hiddenIds.has(r.movie.id));

  function hide(movieId: number) {
    setHiddenIds((prev) => new Set([...prev, movieId]));
    setQueue((prev) => {
      const shownIds = new Set(prev.map((r) => r.movie.id));
      const next = poolRef.current.find((r) => !shownIds.has(r.movie.id) && !hiddenIds.has(r.movie.id) && r.movie.id !== movieId);
      return next ? [...prev, next] : prev;
    });
  }

  async function saveToWatchlist(movie: TMDBMovieDetail) {
    if (!userId || savedIds.has(movie.id)) return;
    setSaving(movie.id);
    const detail = await getMovieDetail(movie.id);
    const m = tmdbMovieToMovie(detail);
    await supabase.from("movies").upsert({ id: m.id, title: m.title, poster_path: m.poster_path, year: m.year, genres: m.genres, overview: m.overview, director: m.director });
    await supabase.from("watchlist").upsert({ user_id: userId, movie_id: m.id });
    setSavedIds((prev) => new Set([...prev, movie.id]));
    setSaving(null);
    setTimeout(() => hide(movie.id), 600);
  }

  async function addToList(movie: TMDBMovieDetail) {
    if (!userId || justAdded.has(movie.id)) return;
    setAdding(movie.id);
    const detail = await getMovieDetail(movie.id);
    const m = tmdbMovieToMovie(detail);
    await supabase.from("movies").upsert({ id: m.id, title: m.title, poster_path: m.poster_path, year: m.year, genres: m.genres, overview: m.overview, director: m.director });
    setAdding(null);
    setStarPending({ movie, m: { id: m.id, title: m.title, poster_path: m.poster_path } });
  }

  async function handleStarConfirmed(stars: number) {
    if (!starPending || !userId) return;
    const { movie, m } = starPending;
    setStarPending(null);
    const currentElos = userMoviesRef.current.map((um) => um.elo_score);
    const seedElo = starsToListElo(stars, currentElos);
    const { data: inserted } = await supabase.from("user_movies").insert({ user_id: userId, movie_id: m.id, elo_score: seedElo }).select("id").single();

    if (inserted) {
      const allPool = userMoviesRef.current.map((um) => {
        const mov = (um as unknown as { movies: { title: string; poster_path: string | null } }).movies;
        return { umId: um.id, movieId: um.movie_id, title: mov?.title ?? "", posterPath: mov?.poster_path ?? null, eloScore: um.elo_score };
      });
      const champion = allPool.length > 0 ? allPool.reduce((a, b) => a.eloScore > b.eloScore ? a : b) : null;
      const poolWithoutChampion = champion ? allPool.filter((m) => m.umId !== champion.umId) : allPool;
      setQuickRank({ newMovie: { umId: inserted.id, movieId: m.id, title: m.title, posterPath: m.poster_path ?? null, eloScore: seedElo }, pool: neighborhoodPool(poolWithoutChampion, seedElo), fullPool: allPool });
    }

    if (savedIds.has(movie.id)) {
      await supabase.from("watchlist").delete().eq("user_id", userId).eq("movie_id", movie.id);
      setSavedIds((prev) => { const s = new Set(prev); s.delete(movie.id); return s; });
    }
    setJustAdded((prev) => new Set([...prev, movie.id]));
    setTimeout(() => hide(movie.id), 700);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Sparkles size={32} className="text-primary animate-pulse" />
        <p className="text-muted-foreground">Finding your next watch…</p>
      </div>
    );
  }

  if (poolRef.current.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <p className="text-4xl mb-4">🎬</p>
        <p className="text-muted-foreground">Rank at least a few movies first and we&apos;ll personalize recommendations for you.</p>
      </div>
    );
  }

  return (
    <>
    {starPending && (
      <StarRatingModal
        movie={{ id: starPending.m.id, title: starPending.m.title, posterPath: starPending.m.poster_path }}
        onConfirm={handleStarConfirmed}
      />
    )}
    {quickRank && userId && (
      <QuickRankModal
        userId={userId}
        newMovie={quickRank.newMovie}
        pool={quickRank.pool}
        fullPool={quickRank.fullPool}
        onDone={() => { setQuickRank(null); }}
      />
    )}
    <div className="px-4 pt-8 pb-24 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-primary" />
          <h1 className="text-2xl font-bold">Your Next Watch</h1>
        </div>
        <p className="text-muted-foreground text-sm">Picks based on your rankings</p>
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-2xl mb-3">✓</p>
          <p>You&apos;ve gone through all your recommendations. Check back after ranking more movies.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(({ movie, reasons }) => {
            const url = posterUrl(movie.poster_path, "w342");
            const isAdding = adding === movie.id;
            const isAdded = justAdded.has(movie.id);
            const isSaving = saving === movie.id;
            const isSaved = savedIds.has(movie.id);
            const year = movie.release_date?.slice(0, 4);
            const genres = movie.genres?.map((g: { name: string }) => g.name).slice(0, 2).join(", ") ?? "";

            return (
              <div key={movie.id} className="flex gap-4 bg-card border border-border rounded-2xl p-4 relative">
                <button onClick={() => hide(movie.id)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1" aria-label="Not interested">
                  <X size={16} />
                </button>
                <div className="relative w-20 h-28 rounded-xl overflow-hidden bg-muted poster-shadow flex-shrink-0">
                  {url ? <Image src={url} alt={movie.title} fill className="object-cover" sizes="80px" /> : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground p-1 text-center">{movie.title}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <p className="font-semibold leading-tight mb-1">{movie.title}</p>
                  <p className="text-xs text-muted-foreground mb-2">{year}{genres ? ` · ${genres}` : ""}</p>
                  {reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {reasons.map((r) => (
                        <span key={r} className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{r}</span>
                      ))}
                    </div>
                  )}
                  {movie.overview && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{movie.overview}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => addToList(movie)}
                      disabled={isAdded || isAdding}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-full transition-colors disabled:opacity-60"
                    >
                      {isAdded ? <><Check size={12} /> Added!</> : isAdding ? <><Loader2 size={12} className="animate-spin" /> Adding…</> : <><Plus size={12} /> Add to list</>}
                    </button>
                    <button
                      onClick={() => saveToWatchlist(movie)}
                      disabled={isSaved || isSaving}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors disabled:opacity-60 ${isSaved ? "bg-amber-500/10 text-amber-500" : "bg-muted hover:bg-muted/80 text-muted-foreground"}`}
                    >
                      <Bookmark size={12} fill={isSaved ? "currentColor" : "none"} />
                      {isSaved ? "Saved" : isSaving ? "Saving…" : "Watchlist"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
}
