"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import { posterUrl } from "@/lib/tmdb";
import { newRatings } from "@/lib/elo";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, X } from "lucide-react";

const CONFETTI_COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#A8E6CF", "#FF8B94", "#C7B8EA", "#FFA07A", "#98D8C8"];

function ConfettiPiece({ left, delay, color, size, round }: { left: string; delay: string; color: string; size: string; round: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: "-12px",
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: round ? "50%" : "2px",
        animation: `confettiFall 2.2s ${delay} cubic-bezier(.4,0,.6,1) forwards`,
        transform: `rotate(${Math.random() * 360}deg)`,
      }}
    />
  );
}

function Confetti() {
  const pieces = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${(i / 40) * 100 + (Math.random() * 2.5 - 1.25)}%`,
      delay: `${(Math.random() * 0.6).toFixed(2)}s`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: `${6 + Math.random() * 7}px`,
      round: Math.random() > 0.5,
    }))
  );
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <style>{`@keyframes confettiFall { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }`}</style>
      {pieces.current.map((p) => <ConfettiPiece key={p.id} {...p} />)}
    </div>
  );
}

export interface QuickRankMovie {
  umId: string;
  movieId: number;
  title: string;
  posterPath: string | null;
  eloScore: number;
}

interface Props {
  userId: string;
  newMovie: QuickRankMovie;
  pool: QuickRankMovie[]; // neighborhood pool for comparisons
  fullPool?: QuickRankMovie[]; // full list for rank calculation
  onDone: () => void;
  onClose?: () => void; // dismiss without navigating away
}

const MAX_COMPARISONS = 6;

function pickOpponents(pool: QuickRankMovie[], count: number): QuickRankMovie[] {
  if (pool.length === 0) return [];
  const sorted = [...pool].sort((a, b) => b.eloScore - a.eloScore);
  const n = Math.min(count, sorted.length);
  // Divide into n buckets and pick one random movie from each
  const bucketSize = sorted.length / n;
  return Array.from({ length: n }, (_, i) => {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    const idx = start + Math.floor(Math.random() * Math.max(1, end - start));
    return sorted[Math.min(idx, sorted.length - 1)];
  });
}

export default function QuickRankModal({ userId, newMovie, pool, fullPool, onDone, onClose }: Props) {
  const supabase = createClient();

  const maxComps = Math.min(MAX_COMPARISONS, pool.length);
  const [opponents] = useState(() => pickOpponents(pool, maxComps));
  const [compCount, setCompCount] = useState(0);
  const [currentElo, setCurrentElo] = useState(newMovie.eloScore);
  const [done, setDone] = useState(pool.length === 0);
  const [choosing, setChoosing] = useState(false);
  const [finalRank, setFinalRank] = useState<number | null>(null);
  const [topSpot, setTopSpot] = useState(false);

  const opponent = opponents[compCount];
  const progress = maxComps > 0 ? compCount / maxComps : 1;

  async function choose(newMovieWon: boolean) {
    if (choosing || done) return;
    setChoosing(true);

    const winnerUmId = newMovieWon ? newMovie.umId : opponent.umId;
    const loserUmId = newMovieWon ? opponent.umId : newMovie.umId;
    const winnerElo = newMovieWon ? currentElo : opponent.eloScore;
    const loserElo = newMovieWon ? opponent.eloScore : currentElo;
    const { winner: newWinElo, loser: newLoseElo } = newRatings(winnerElo, loserElo);
    const newNewMovieElo = newMovieWon ? newWinElo : newLoseElo;

    await Promise.all([
      supabase.from("user_movies").update({ elo_score: newWinElo }).eq("id", winnerUmId),
      supabase.from("user_movies").update({ elo_score: newLoseElo }).eq("id", loserUmId),
      supabase.from("comparisons").insert({
        user_id: userId,
        winner_movie_id: newMovieWon ? newMovie.movieId : opponent.movieId,
        loser_movie_id: newMovieWon ? opponent.movieId : newMovie.movieId,
      }),
    ]);

    setCurrentElo(newNewMovieElo);

    // Check if new movie just claimed #1 across the full list
    const rankSource = fullPool ?? pool;
    const isTopNow = rankSource.every((m) => m.eloScore <= newNewMovieElo);
    if (isTopNow && newMovieWon && !topSpot) {
      setTopSpot(true);
      setTimeout(() => setTopSpot(false), 3000);
    }

    const nextCount = compCount + 1;

    if (nextCount >= maxComps) {
      const rankSource = fullPool ?? pool;
      const rank = rankSource.filter((m) => m.eloScore > newNewMovieElo).length + 1;
      setFinalRank(rank);
      setDone(true);
    } else {
      setCompCount(nextCount);
    }
    setChoosing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      {topSpot && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <Confetti />
          <div className="relative z-20 bg-card border border-border rounded-3xl px-8 py-6 text-center shadow-2xl mx-6">
            <p className="text-4xl mb-2">🏆</p>
            <p className="text-xl font-bold">New #1!</p>
            <p className="text-muted-foreground text-sm mt-1">"{newMovie.title}" is your top-ranked film</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="relative px-4 pt-10 pb-4 text-center">
        <button
          onClick={onClose ?? onDone}
          className="absolute right-4 top-10 p-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
        >
          <X size={18} />
        </button>
        {done ? (
          <div>
            <CheckCircle size={32} className="text-primary mx-auto mb-2" />
            <h2 className="text-xl font-bold">Ranked!</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {finalRank !== null
                ? `"${newMovie.title}" placed around #${finalRank} in your list`
                : `"${newMovie.title}" has been added to your list`}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Quick Rank</p>
            <h2 className="text-xl font-bold">Which do you prefer?</h2>
            <p className="text-muted-foreground text-sm mt-1">Tap to rank your new pick</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!done && (
        <div className="px-8 mb-4">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground mt-1">{compCount + 1} of {maxComps}</p>

        </div>
      )}

      {/* Cards */}
      {!done && opponent && (
        <div className="flex gap-3 px-4 flex-1 items-center justify-center">
          {/* New movie — always on left */}
          <button
            onClick={() => choose(true)}
            disabled={choosing}
            className="flex flex-col items-center gap-2 p-3 bg-card border-2 border-primary/40 hover:border-primary rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 relative"
            style={{ width: "44vw", maxWidth: 180 }}
          >
            <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 bg-primary text-primary-foreground rounded-full z-10">NEW</span>
            <div className="relative w-full rounded-xl overflow-hidden bg-muted" style={{ height: "min(42vw, 180px)", aspectRatio: "2/3" }}>
              {posterUrl(newMovie.posterPath, "w342") ? (
                <Image
                  src={posterUrl(newMovie.posterPath, "w342")!}
                  alt={newMovie.title}
                  fill className="object-cover"
                  sizes="180px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground p-2 text-center">{newMovie.title}</div>
              )}
            </div>
            <p className="font-semibold text-xs leading-tight line-clamp-2 text-center">{newMovie.title}</p>
          </button>

          {/* Opponent */}
          <button
            onClick={() => choose(false)}
            disabled={choosing}
            className="flex flex-col items-center gap-2 p-3 bg-card border-2 border-border hover:border-primary rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50"
            style={{ width: "44vw", maxWidth: 180 }}
          >
            <div className="relative w-full rounded-xl overflow-hidden bg-muted" style={{ height: "min(42vw, 180px)", aspectRatio: "2/3" }}>
              {posterUrl(opponent.posterPath, "w342") ? (
                <Image
                  src={posterUrl(opponent.posterPath, "w342")!}
                  alt={opponent.title}
                  fill className="object-cover"
                  sizes="180px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground p-2 text-center">{opponent.title}</div>
              )}
            </div>
            <p className="font-semibold text-xs leading-tight line-clamp-2 text-center">{opponent.title}</p>
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-8 flex flex-col gap-3">
        {done ? (
          <>
            <button
              onClick={onDone}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-semibold text-base"
            >
              Go to My List
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-muted-foreground text-sm text-center"
              >
                Stay here
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => { setDone(true); onDone(); }}
            className="text-muted-foreground text-sm text-center"
          >
            Skip remaining comparisons
          </button>
        )}
      </div>
    </div>
  );
}
