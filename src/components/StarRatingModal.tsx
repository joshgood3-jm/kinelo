"use client";
import { useState } from "react";
import Image from "next/image";
import { posterUrl } from "@/lib/tmdb";

interface Props {
  movie: { id: number; title: string; posterPath: string | null };
  onConfirm: (stars: number) => void;
}

const LABELS: Record<number, string> = {
  0.5: "Hard pass",
  1:   "Not for me",
  1.5: "Mostly bad",
  2:   "It's okay",
  2.5: "Decent",
  3:   "Liked it",
  3.5: "Quite good",
  4:   "Really liked it",
  4.5: "Nearly perfect",
  5:   "All-time favorite",
};

// Percentage of star N (1-based) that should be filled amber
function fillPct(starIndex: number, rating: number): string {
  if (rating >= starIndex) return "100%";
  if (rating >= starIndex - 0.5) return "50%";
  return "0%";
}

export default function StarRatingModal({ movie, onConfirm }: Props) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);

  const display = hovered || selected;
  const url = posterUrl(movie.posterPath, "w342");

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {url && (
          <div className="relative w-32 h-48 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0">
            <Image src={url} alt={movie.title} fill className="object-cover" sizes="128px" />
          </div>
        )}

        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Rate to rank</p>
          <h2 className="text-xl font-bold leading-tight">{movie.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">How good is it?</p>
        </div>

        {/* Half-star picker */}
        <div className="flex gap-2" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <div key={star} className="relative" style={{ width: 44, height: 44, fontSize: 44, lineHeight: 1 }}>
              {/* Empty star (base layer) */}
              <span className="text-muted-foreground/25 select-none">★</span>
              {/* Filled amber overlay — left-aligned text clipped at fillPct width */}
              <span
                className="absolute top-0 left-0 overflow-hidden text-amber-400 whitespace-nowrap select-none pointer-events-none"
                style={{ width: fillPct(star, display) }}
              >
                ★
              </span>
              {/* Left half click zone → half-star */}
              <button
                className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
                onMouseEnter={() => setHovered(star - 0.5)}
                onClick={() => setSelected(star - 0.5)}
                aria-label={`${star - 0.5} stars`}
              />
              {/* Right half click zone → whole star */}
              <button
                className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
                onMouseEnter={() => setHovered(star)}
                onClick={() => setSelected(star)}
                aria-label={`${star} stars`}
              />
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground h-5">
          {display > 0 ? LABELS[display] : ""}
        </p>
      </div>

      {/* Button sits above the bottom nav bar */}
      <div className="px-6 pb-28 pt-4">
        <button
          onClick={() => selected > 0 && onConfirm(selected)}
          disabled={selected === 0}
          className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-semibold text-base disabled:opacity-30 transition-opacity"
        >
          Rank It
        </button>
      </div>
    </div>
  );
}
