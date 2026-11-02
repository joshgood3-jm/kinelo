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

// How much of star N (1-based) to fill given a rating
function fillWidth(starIndex: number, rating: number): string {
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
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
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
        <div
          className="flex gap-1"
          onMouseLeave={() => setHovered(0)}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <div key={star} className="relative text-5xl leading-none select-none w-10 h-10 flex items-center justify-center">
              {/* Empty star base */}
              <span className="text-muted-foreground/25">★</span>
              {/* Filled overlay clipped to fill width */}
              <span
                className="absolute inset-0 overflow-hidden text-amber-400 flex items-center justify-center pointer-events-none"
                style={{ width: fillWidth(star, display) }}
              >
                ★
              </span>
              {/* Left half — 0.5 increment */}
              <button
                className="absolute inset-y-0 left-0 w-1/2"
                onMouseEnter={() => setHovered(star - 0.5)}
                onClick={() => setSelected(star - 0.5)}
                aria-label={`${star - 0.5} stars`}
              />
              {/* Right half — whole star */}
              <button
                className="absolute inset-y-0 right-0 w-1/2"
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

      <div className="px-6 py-8">
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
