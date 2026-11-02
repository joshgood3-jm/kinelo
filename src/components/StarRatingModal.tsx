"use client";
import { useState } from "react";
import Image from "next/image";
import { posterUrl } from "@/lib/tmdb";

interface Props {
  movie: { id: number; title: string; posterPath: string | null };
  onConfirm: (stars: number) => void;
}

const LABELS: Record<number, string> = {
  1: "Not for me",
  2: "It's okay",
  3: "Pretty good",
  4: "Really liked it",
  5: "One of my favorites",
};

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

        {/* Stars */}
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setSelected(star)}
              className={`text-5xl leading-none transition-all duration-100 select-none ${
                star <= display ? "text-amber-400 scale-110" : "text-muted-foreground/30 scale-100"
              }`}
            >
              ★
            </button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground h-5 transition-opacity">
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
