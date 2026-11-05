"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { newRatings } from "@/lib/elo";
import { posterUrl } from "@/lib/tmdb";
import Image from "next/image";
import Link from "next/link";
import { Trophy, SkipForward } from "lucide-react";

const CONFETTI_COLORS = ["#FF6B6B","#4ECDC4","#FFE66D","#A8E6CF","#FF8B94","#C7B8EA","#FFA07A","#818cf8"];

function Confetti() {
  const pieces = useRef(
    Array.from({ length: 48 }, (_, i) => ({
      id: i,
      left: `${(i / 48) * 100 + (Math.random() * 2 - 1)}%`,
      delay: `${(Math.random() * 0.7).toFixed(2)}s`,
      dur: `${(1.9 + Math.random() * 0.7).toFixed(2)}s`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: `${5 + Math.random() * 8}px`,
      round: Math.random() > 0.5,
      rot: Math.round(Math.random() * 360),
    }))
  );
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <style>{`@keyframes cf{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}`}</style>
      {pieces.current.map((p) => (
        <div key={p.id} style={{
          position: "absolute", top: "-12px", left: p.left,
          width: p.size, height: p.size, background: p.color,
          borderRadius: p.round ? "50%" : "2px",
          transform: `rotate(${p.rot}deg)`,
          animation: `cf ${p.dur} ${p.delay} ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

function TopSpotOverlay({ title, onDismiss }: { title: string; onDismiss: () => void }) {
  return (
    <div
      onClick={onDismiss}
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <Confetti />
      <div style={{ position: "relative", zIndex: 1, margin: "0 24px" }}
        className="bg-card border border-border rounded-3xl px-8 py-7 text-center shadow-2xl"
      >
        <p style={{ fontSize: 44, marginBottom: 6 }}>🏆</p>
        <p className="text-xl font-bold" style={{ background: "linear-gradient(135deg,#a78bfa,#f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>New #1!</p>
        <p className="text-muted-foreground text-sm mt-1">
          <span className="font-semibold text-foreground">"{title}"</span><br />is your top-ranked film
        </p>
        <p className="text-xs text-muted-foreground mt-4">Tap to continue</p>
      </div>
    </div>
  );
}

const CHALLENGER_THRESHOLD = 25;

interface RankableMovie {
  id: string;
  movie_id: number;
  elo_score: number;
  title: string;
  poster_path: string | null;
  year: number;
}

type SessionResult = { winner: RankableMovie; loser: RankableMovie; count: number } | null;

export default function RankPage() {
  const [movies, setMovies] = useState<RankableMovie[]>([]);
  const [pair, setPair] = useState<[RankableMovie, RankableMovie] | null>(null);
  const [loading, setLoading] = useState(true);
  const [choosing, setChoosing] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [lastResult, setLastResult] = useState<SessionResult>(null);
  const [topSpotMovie, setTopSpotMovie] = useState<string | null>(null);
  const [isChampionshipMatch, setIsChampionshipMatch] = useState(false);

  const supabase = createClient();

  const loadMovies = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("user_movies")
      .select("id, movie_id, elo_score, movies(title, poster_path, year)")
      .eq("user_id", user.id);

    if (!data) return;
    type MovieRow = { title: string; poster_path: string | null; year: number };
    const ranked = data.map((um) => ({
      id: um.id,
      movie_id: um.movie_id,
      elo_score: um.elo_score,
      title: (um.movies as unknown as MovieRow).title,
      poster_path: (um.movies as unknown as MovieRow).poster_path,
      year: (um.movies as unknown as MovieRow).year,
    }));
    setMovies(ranked);
    setLoading(false);
    pickPair(ranked);
  }, [supabase]);

  function pickPair(movieList: RankableMovie[]) {
    if (movieList.length < 2) { setPair(null); return; }
    const sorted = [...movieList].sort((a, b) => b.elo_score - a.elo_score);
    const champion = sorted[0];
    const challenger = sorted.slice(1).find((m) => champion.elo_score - m.elo_score <= CHALLENGER_THRESHOLD);
    if (challenger) {
      setIsChampionshipMatch(true);
      setPair(Math.random() > 0.5 ? [champion, challenger] : [challenger, champion]);
      return;
    }
    setIsChampionshipMatch(false);
    // Prefer movies with similar ELO scores for more meaningful comparisons
    const topHalf = sorted.slice(0, Math.max(2, Math.ceil(sorted.length / 2)));
    const a = topHalf[Math.floor(Math.random() * topHalf.length)];
    // Find a movie within 200 ELO points of a (close match)
    const candidates = movieList.filter((m) => m.id !== a.id && Math.abs(m.elo_score - a.elo_score) < 200);
    const b = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : movieList.filter((m) => m.id !== a.id)[Math.floor(Math.random() * (movieList.length - 1))];
    setPair(Math.random() > 0.5 ? [a, b] : [b, a]);
  }

  useEffect(() => { loadMovies(); }, [loadMovies]);

  async function choose(winner: RankableMovie, loser: RankableMovie) {
    setChoosing(true);
    const { winner: newWinner, loser: newLoser } = newRatings(winner.elo_score, loser.elo_score);
    const { data: { user } } = await supabase.auth.getUser();

    await Promise.all([
      supabase.from("user_movies").update({ elo_score: newWinner, comparisons_count: winner.elo_score }).eq("id", winner.id),
      supabase.from("user_movies").update({ elo_score: newLoser, comparisons_count: loser.elo_score }).eq("id", loser.id),
      supabase.from("comparisons").insert({
        user_id: user!.id,
        winner_movie_id: winner.movie_id,
        loser_movie_id: loser.movie_id,
      }),
    ]);

    const prevNo1 = movies.reduce((a, b) => a.elo_score > b.elo_score ? a : b);

    const updated = movies.map((m) => {
      if (m.id === winner.id) return { ...m, elo_score: newWinner };
      if (m.id === loser.id) return { ...m, elo_score: newLoser };
      return m;
    });

    const newNo1 = updated.reduce((a, b) => a.elo_score > b.elo_score ? a : b);
    if (isChampionshipMatch && newNo1.id === winner.id && prevNo1.id !== winner.id) {
      setTopSpotMovie(winner.title);
    }

    setSessionCount((c) => c + 1);
    setLastResult({ winner: { ...winner, elo_score: newWinner }, loser: { ...loser, elo_score: newLoser }, count: sessionCount + 1 });
    setMovies(updated);
    pickPair(updated);
    setChoosing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading your movies…</div>
      </div>
    );
  }

  if (movies.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <Trophy size={48} className="text-primary mb-4" />
        <h2 className="text-xl font-bold mb-2">Add at least 2 movies first</h2>
        <p className="text-muted-foreground mb-6">Head to My List to add movies, then come back to rank them.</p>
        <Link href="/movies" className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium">
          Add Movies
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-4 pt-8">
      {topSpotMovie && <TopSpotOverlay title={topSpotMovie} onDismiss={() => setTopSpotMovie(null)} />}
      <div className="text-center mb-6">
        {isChampionshipMatch && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
            style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff" }}>
            ⚔️ Championship Match
          </div>
        )}
        <h1 className="text-2xl font-bold mb-1">Which do you prefer?</h1>
        <p className="text-muted-foreground text-sm">
          {sessionCount > 0 ? `${sessionCount} ranked this session` : "Tap a movie to vote"}
        </p>
      </div>

      {pair && (
        <div className="flex gap-4 justify-center items-stretch flex-1">
          {pair.map((movie, idx) => (
            <button
              key={movie.id}
              onClick={() => !choosing && choose(movie, pair[1 - idx])}
              disabled={choosing}
              className="flex-1 flex flex-col items-center gap-3 p-4 bg-card border-2 border-border rounded-2xl hover:border-primary hover:glow-primary transition-all duration-200 active:scale-95 disabled:opacity-50 max-w-[48%]"
            >
              <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-muted poster-shadow">
                {posterUrl(movie.poster_path, "w342") ? (
                  <Image
                    src={posterUrl(movie.poster_path, "w342")!}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 45vw, 200px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                    {movie.title}
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm leading-tight line-clamp-2">{movie.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{movie.year}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-3 mt-6 mb-4">
        <button
          onClick={() => pickPair(movies)}
          disabled={choosing}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          <SkipForward size={16} /> Skip this pair
        </button>

        {lastResult && (
          <div className="text-xs text-muted-foreground text-center">
            <span className="text-primary font-medium">{lastResult.winner.title}</span>
            {" "}&gt; {lastResult.loser.title}
          </div>
        )}
      </div>
    </div>
  );
}
