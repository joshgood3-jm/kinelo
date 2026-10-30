"use client";
import Image from "next/image";
import { Plus, Check, Loader2 } from "lucide-react";
import { posterUrl } from "@/lib/tmdb";

interface CuratedMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
}

interface Props {
  title: string;
  badge: string;
  movies: CuratedMovie[];
  existingIds: Set<number>;
  addingId: number | null;
  onAdd: (movie: CuratedMovie) => void;
}

export default function CuratedRow({ title, badge, movies, existingIds, addingId, onAdd }: Props) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
          {badge}
        </span>
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
        {movies.map((movie) => {
          const url = posterUrl(movie.poster_path, "w185");
          const isAdded = existingIds.has(movie.id);
          const isAdding = addingId === movie.id;
          const year = movie.release_date?.slice(0, 4);

          return (
            <div key={movie.id} className="flex-shrink-0 w-28 snap-start">
              <div className="relative w-28 h-40 rounded-xl overflow-hidden bg-muted mb-2">
                {url ? (
                  <Image src={url} alt={movie.title} fill className="object-cover" sizes="112px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                    {movie.title}
                  </div>
                )}
              </div>
              <p className="text-xs font-medium line-clamp-2 leading-tight mb-1">{movie.title}</p>
              {year && <p className="text-xs text-muted-foreground mb-1.5">{year}</p>}
              <button
                onClick={() => !isAdded && !isAdding && onAdd(movie)}
                disabled={isAdded || isAdding}
                className={`w-full flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isAdded
                    ? "bg-primary/10 text-primary"
                    : "bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground"
                }`}
              >
                {isAdding ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : isAdded ? (
                  <><Check size={11} /> Added</>
                ) : (
                  <><Plus size={11} /> Add</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
