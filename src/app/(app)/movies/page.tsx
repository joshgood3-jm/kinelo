"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMovieDetail, tmdbMovieToMovie, posterUrl } from "@/lib/tmdb";
import { INITIAL_ELO } from "@/lib/elo";
import MovieSearch from "@/components/MovieSearch";
import LetterboxdImport from "@/components/LetterboxdImport";
import QuickRankModal, { type QuickRankMovie } from "@/components/QuickRankModal";
import Image from "next/image";
import { starsDisplay } from "@/lib/letterboxd";
import { Trash2, Plus, Check, Loader2 } from "lucide-react";
import type { TMDBMovie, UserMovie } from "@/types";

interface CuratedMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
}

type Tab = "mine" | "imdb" | "rt" | "rs" | "oscars";

const TABS: { id: Tab; label: string }[] = [
  { id: "mine", label: "My List" },
  { id: "oscars", label: "🏆 Oscars" },
  { id: "imdb", label: "IMDb" },
  { id: "rt", label: "Rotten Tomatoes" },
  { id: "rs", label: "Rolling Stone" },
];

function toQuickRankMovie(um: UserMovie): QuickRankMovie {
  const movie = (um as unknown as { movies: { title: string; poster_path: string | null } }).movies;
  return {
    umId: um.id,
    movieId: um.movie_id,
    title: movie?.title ?? "",
    posterPath: movie?.poster_path ?? null,
    eloScore: um.elo_score,
  };
}

export default function MoviesPage() {
  const [tab, setTab] = useState<Tab>("mine");
  const [userMovies, setUserMovies] = useState<UserMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [quickRank, setQuickRank] = useState<{ newMovie: QuickRankMovie; pool: QuickRankMovie[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ umId: string; title: string } | null>(null);

  const [curated, setCurated] = useState<{ imdb: CuratedMovie[]; rottenTomatoes: CuratedMovie[]; rollingStone: CuratedMovie[]; oscars: CuratedMovie[] } | null>(null);
  const [curatedAddingId, setCuratedAddingId] = useState<number | null>(null);

  const supabase = createClient();
  const existingIds = new Set(userMovies.map((um) => um.movie_id));

  const loadMovies = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase
      .from("user_movies")
      .select("*, movies(*)")
      .eq("user_id", user.id)
      .order("elo_score", { ascending: false });
    setUserMovies((data as unknown as UserMovie[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadMovies(); }, [loadMovies]);
  useEffect(() => {
    fetch("/api/curated").then((r) => r.json()).then(setCurated).catch(() => {});
  }, []);

  // Shared: insert movie + open quick rank modal
  async function insertAndRank(movieId: number, title: string, posterPath: string | null, currentPool: UserMovie[]) {
    if (!userId) return;
    const { data: inserted } = await supabase
      .from("user_movies")
      .insert({ user_id: userId, movie_id: movieId, elo_score: INITIAL_ELO })
      .select("id")
      .single();

    if (!inserted) return;
    const pool = currentPool.map(toQuickRankMovie);
    setQuickRank({
      newMovie: { umId: inserted.id, movieId, title, posterPath, eloScore: INITIAL_ELO },
      pool,
    });
  }

  async function addMovie(tmdbMovie: TMDBMovie) {
    if (!userId) return;
    const detail = await getMovieDetail(tmdbMovie.id);
    const movie = tmdbMovieToMovie(detail);
    await supabase.from("movies").upsert({
      id: movie.id, title: movie.title, poster_path: movie.poster_path,
      year: movie.year, genres: movie.genres, overview: movie.overview, director: movie.director,
    });
    await insertAndRank(movie.id, movie.title, movie.poster_path, userMovies);
  }

  async function addCuratedMovie(movie: CuratedMovie) {
    if (!userId || existingIds.has(movie.id)) return;
    setCuratedAddingId(movie.id);
    const detail = await getMovieDetail(movie.id);
    const m = tmdbMovieToMovie(detail);
    await supabase.from("movies").upsert({
      id: m.id, title: m.title, poster_path: m.poster_path,
      year: m.year, genres: m.genres, overview: m.overview, director: m.director,
    });
    setCuratedAddingId(null);
    await insertAndRank(m.id, m.title, m.poster_path, userMovies);
  }

  async function removeMovie(umId: string) {
    await supabase.from("user_movies").delete().eq("id", umId);
    setUserMovies((prev) => prev.filter((m) => m.id !== umId));
  }

  function handleQuickRankDone() {
    setQuickRank(null);
    loadMovies();
    setTab("mine");
  }

  const curatedList: CuratedMovie[] =
    tab === "imdb" ? (curated?.imdb ?? []) :
    tab === "rt" ? (curated?.rottenTomatoes ?? []) :
    tab === "rs" ? (curated?.rollingStone ?? []) :
    tab === "oscars" ? (curated?.oscars ?? []) : [];

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading…</div>;
  }

  return (
    <>
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-4 pt-8 pb-3">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">My Movies</h1>
            <p className="text-muted-foreground text-sm">{userMovies.length} movies ranked</p>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 text-xs bg-muted hover:bg-muted/80 border border-border px-3 py-2 rounded-lg transition-colors font-medium mt-1"
          >
            <span className="text-base leading-none">🎞</span>
            Letterboxd
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* My List tab */}
      {tab === "mine" && (
        <div className="px-4 pb-24 space-y-3">
          <MovieSearch onAdd={addMovie} existingIds={existingIds} />
          {userMovies.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-4xl mb-4">🎬</p>
              <p>Search above to add movies and start ranking.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {userMovies.map((um, i) => {
                const movie = (um as unknown as { movies: { title: string; poster_path: string | null; year: number; genres: string[] } }).movies;
                const url = posterUrl(movie?.poster_path, "w185");
                return (
                  <div key={um.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                    <span className="w-8 text-center text-sm font-bold text-muted-foreground flex-shrink-0">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                    <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {url && <Image src={url} alt={movie?.title ?? ""} fill className="object-cover" sizes="40px" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{movie?.title}</p>
                      <p className="text-xs text-muted-foreground">{movie?.year}{movie?.genres?.[0] ? ` · ${movie.genres[0]}` : ""}</p>
                      {um.letterboxd_rating != null && (
                        <p className="text-xs text-amber-400 mt-0.5">{starsDisplay(um.letterboxd_rating)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{um.elo_score}</span>
                      <button onClick={() => setConfirmDelete({ umId: um.id, title: movie?.title ?? "" })} className="text-muted-foreground hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Curated list tabs */}
      {tab !== "mine" && (
        <div className="px-4 pb-24">
          {!curated ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-2 mt-2">
              {curatedList.map((movie, i) => {
                const url = posterUrl(movie.poster_path, "w185");
                const isAdded = existingIds.has(movie.id);
                const isAdding = curatedAddingId === movie.id;
                const year = movie.release_date?.slice(0, 4);
                const rankLabel = tab === "oscars" ? `'${String(parseInt(year ?? "0") + 1).slice(2)}` : `#${i + 1}`;
                return (
                  <div key={movie.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                    <span className="w-8 text-center text-sm font-bold text-muted-foreground flex-shrink-0">{rankLabel}</span>
                    <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {url && <Image src={url} alt={movie.title} fill className="object-cover" sizes="40px" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{movie.title}</p>
                      <p className="text-xs text-muted-foreground">{year}</p>
                    </div>
                    <button
                      onClick={() => addCuratedMovie(movie)}
                      disabled={isAdded || isAdding}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
                        isAdded ? "bg-primary/10 text-primary" : "bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground"
                      }`}
                    >
                      {isAdding ? <Loader2 size={11} className="animate-spin" /> :
                       isAdded ? <><Check size={11} /> Added</> :
                       <><Plus size={11} /> Add</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>

    {showImport && (
      <LetterboxdImport onClose={() => setShowImport(false)} onImported={loadMovies} />
    )}

    {quickRank && userId && (
      <QuickRankModal
        userId={userId}
        newMovie={quickRank.newMovie}
        pool={quickRank.pool}
        onDone={handleQuickRankDone}
      />
    )}

    {confirmDelete && (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-8">
        <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
          <p className="font-semibold text-base mb-1">Remove from list?</p>
          <p className="text-sm text-muted-foreground mb-6">
            &ldquo;{confirmDelete.title}&rdquo; and its ranking history will be deleted.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmDelete(null)}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { removeMovie(confirmDelete.umId); setConfirmDelete(null); }}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
