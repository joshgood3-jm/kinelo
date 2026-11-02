"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMovieDetail, tmdbMovieToMovie, posterUrl } from "@/lib/tmdb";
import { starsToListElo } from "@/lib/elo";
import MovieSearch from "@/components/MovieSearch";
import GenreBrowserModal from "@/components/GenreBrowserModal";
import PersonBrowserModal from "@/components/PersonBrowserModal";
import StarRatingModal from "@/components/StarRatingModal";
import LetterboxdImport from "@/components/LetterboxdImport";
import QuickRankModal, { type QuickRankMovie } from "@/components/QuickRankModal";
import Image from "next/image";
import { Trash2, Plus, Check, Loader2, Bookmark, ChevronDown, ChevronUp } from "lucide-react";
import type { TMDBMovie, UserMovie } from "@/types";

interface WatchlistMovie {
  movie_id: number;
  movies: { title: string; poster_path: string | null; year: number };
}

interface CuratedMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
}

type Tab = "mine" | "imdb" | "rs" | "oscars";
type OscarSubtab = "picture" | "actor" | "actress" | "director" | "screenplay";

const TABS: { id: Tab; label: string }[] = [
  { id: "mine", label: "My List" },
  { id: "oscars", label: "🏆 Oscars" },
  { id: "imdb", label: "IMDb" },
  { id: "rs", label: "Rolling Stone" },
];

const OSCAR_SUBTABS: { id: OscarSubtab; label: string }[] = [
  { id: "picture",    label: "Best Picture" },
  { id: "actor",      label: "Best Actor" },
  { id: "actress",    label: "Best Actress" },
  { id: "director",   label: "Best Director" },
  { id: "screenplay", label: "Best Screenplay" },
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
  const [genreBrowserOpen, setGenreBrowserOpen] = useState(false);
  const [personBrowser, setPersonBrowser] = useState<{ id: number; name: string; profile_path: string | null; known_for_department: string } | null>(null);
  const [starPending, setStarPending] = useState<{ id: number; title: string; posterPath: string | null } | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistMovie[]>([]);
  const [watchlistOpen, setWatchlistOpen] = useState(true);
  const [movingFromWatchlist, setMovingFromWatchlist] = useState<number | null>(null);

  const [curated, setCurated] = useState<{ imdb: CuratedMovie[]; rollingStone: CuratedMovie[]; oscars: CuratedMovie[] } | null>(null);
  const [curatedAddingId, setCuratedAddingId] = useState<number | null>(null);
  const [oscarSubtab, setOscarSubtab] = useState<OscarSubtab>("picture");
  const [oscarCache, setOscarCache] = useState<Partial<Record<OscarSubtab, CuratedMovie[]>>>({});
  const [oscarLoading, setOscarLoading] = useState<OscarSubtab | null>(null);

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
    const { data: wl } = await supabase
      .from("watchlist")
      .select("movie_id, movies(title, poster_path, year)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setWatchlist((wl as unknown as WatchlistMovie[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadMovies(); }, [loadMovies]);
  useEffect(() => {
    fetch("/api/curated").then((r) => r.json()).then(setCurated).catch(() => {});
  }, []);

  // Insert movie into user list with seeded ELO, then open quick rank against similar-rated movies
  async function insertAndRank(movieId: number, title: string, posterPath: string | null, currentPool: UserMovie[], seedElo: number) {
    if (!userId) return;
    const { data: inserted } = await supabase
      .from("user_movies")
      .insert({ user_id: userId, movie_id: movieId, elo_score: seedElo })
      .select("id")
      .single();

    if (!inserted) return;
    const allPool = currentPool.map(toQuickRankMovie);
    // Compare only against movies with similar ELO — widen band if pool is thin
    const BAND = 250;
    let pool = allPool.filter((m) => Math.abs(m.eloScore - seedElo) <= BAND);
    if (pool.length < 3) pool = allPool.filter((m) => Math.abs(m.eloScore - seedElo) <= 500);
    if (pool.length < 2) pool = allPool;
    setQuickRank({
      newMovie: { umId: inserted.id, movieId, title, posterPath, eloScore: seedElo },
      pool,
    });
  }

  // Upsert movie metadata then pause for star rating before inserting into user list
  async function addMovie(tmdbMovie: TMDBMovie) {
    if (!userId) return;
    const detail = await getMovieDetail(tmdbMovie.id);
    const movie = tmdbMovieToMovie(detail);
    await supabase.from("movies").upsert({
      id: movie.id, title: movie.title, poster_path: movie.poster_path,
      year: movie.year, genres: movie.genres, overview: movie.overview, director: movie.director,
    });
    setStarPending({ id: movie.id, title: movie.title, posterPath: movie.poster_path });
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
    setStarPending({ id: m.id, title: m.title, posterPath: m.poster_path });
  }

  async function handleStarConfirmed(stars: number) {
    if (!starPending) return;
    const { id, title, posterPath } = starPending;
    setStarPending(null);
    const currentElos = userMovies.map((um) => um.elo_score);
    await insertAndRank(id, title, posterPath, userMovies, starsToListElo(stars, currentElos));
  }

  async function removeFromWatchlist(movieId: number) {
    if (!userId) return;
    await supabase.from("watchlist").delete().eq("user_id", userId).eq("movie_id", movieId);
    setWatchlist((prev) => prev.filter((w) => w.movie_id !== movieId));
  }

  async function moveWatchlistToList(wm: WatchlistMovie) {
    if (!userId) return;
    setMovingFromWatchlist(wm.movie_id);
    setStarPending({ id: wm.movie_id, title: wm.movies.title, posterPath: wm.movies.poster_path });
    await supabase.from("watchlist").delete().eq("user_id", userId).eq("movie_id", wm.movie_id);
    setWatchlist((prev) => prev.filter((w) => w.movie_id !== wm.movie_id));
    setMovingFromWatchlist(null);
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

  function handleQuickRankClose() {
    setQuickRank(null);
    loadMovies();
  }

  async function selectOscarSubtab(sub: OscarSubtab) {
    setOscarSubtab(sub);
    if (sub === "picture" || oscarCache[sub] !== undefined) return;
    setOscarLoading(sub);
    try {
      const res = await fetch(`/api/curated?oscar=${sub}`);
      const data = await res.json();
      setOscarCache((prev) => ({ ...prev, [sub]: data.results ?? [] }));
    } catch {
      setOscarCache((prev) => ({ ...prev, [sub]: [] }));
    }
    setOscarLoading(null);
  }

  const curatedList: CuratedMovie[] =
    tab === "imdb"   ? (curated?.imdb ?? []) :
    tab === "rs"     ? (curated?.rollingStone ?? []) :
    tab === "oscars" && oscarSubtab === "picture" ? (curated?.oscars ?? []) :
    tab === "oscars" ? (oscarCache[oscarSubtab] ?? []) : [];

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
          <MovieSearch onAdd={addMovie} existingIds={existingIds} onGenreBrowse={() => setGenreBrowserOpen(true)} onPersonBrowse={(p) => setPersonBrowser(p)} />
          {/* Watchlist section */}
          {watchlist.length > 0 && (
            <div className="mb-2">
              <button
                onClick={() => setWatchlistOpen((o) => !o)}
                className="flex items-center gap-2 w-full text-left py-2"
              >
                <Bookmark size={14} className="text-amber-500" fill="currentColor" />
                <span className="text-sm font-semibold">Watchlist</span>
                <span className="text-xs text-muted-foreground ml-1">{watchlist.length}</span>
                <span className="ml-auto text-muted-foreground">
                  {watchlistOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </button>
              {watchlistOpen && (
                <div className="space-y-2">
                  {watchlist.map((wm) => {
                    const url = posterUrl(wm.movies?.poster_path, "w185");
                    const isMoving = movingFromWatchlist === wm.movie_id;
                    return (
                      <div key={wm.movie_id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                        <Bookmark size={14} className="text-amber-500 flex-shrink-0" fill="currentColor" />
                        <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {url && <Image src={url} alt={wm.movies?.title ?? ""} fill className="object-cover" sizes="40px" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{wm.movies?.title}</p>
                          <p className="text-xs text-muted-foreground">{wm.movies?.year}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => moveWatchlistToList(wm)}
                            disabled={isMoving}
                            className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full font-medium hover:bg-primary/20 transition-colors"
                          >
                            {isMoving ? <Loader2 size={10} className="animate-spin" /> : "Add to list"}
                          </button>
                          <button onClick={() => removeFromWatchlist(wm.movie_id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="border-t border-border mt-3 mb-1" />
            </div>
          )}

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

      {/* Oscar subtabs */}
      {tab === "oscars" && (
        <div className="flex gap-1 overflow-x-auto scrollbar-hide px-4 pb-3">
          {OSCAR_SUBTABS.map((sub) => (
            <button
              key={sub.id}
              onClick={() => selectOscarSubtab(sub.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                oscarSubtab === sub.id
                  ? "bg-amber-500 text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* Curated list tabs */}
      {tab !== "mine" && (
        <div className="px-4 pb-24">
          {!curated || oscarLoading === oscarSubtab ? (
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

    {genreBrowserOpen && (
      <GenreBrowserModal
        existingIds={existingIds}
        onAdd={addMovie}
        onClose={() => setGenreBrowserOpen(false)}
      />
    )}

    {personBrowser && (
      <PersonBrowserModal
        person={personBrowser}
        existingIds={existingIds}
        onAdd={addMovie}
        onClose={() => setPersonBrowser(null)}
      />
    )}

    {starPending && (
      <StarRatingModal
        movie={starPending}
        onConfirm={handleStarConfirmed}
      />
    )}

    {showImport && (
      <LetterboxdImport onClose={() => setShowImport(false)} onImported={loadMovies} />
    )}

    {quickRank && userId && (
      <QuickRankModal
        userId={userId}
        newMovie={quickRank.newMovie}
        pool={quickRank.pool}
        onDone={handleQuickRankDone}
        onClose={handleQuickRankClose}
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
