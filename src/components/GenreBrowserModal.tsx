"use client";
import { useState, useEffect } from "react";
import { X, Plus, Check, Loader2, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { posterUrl } from "@/lib/tmdb";
import type { TMDBMovie } from "@/types";

const GENRES = [
  { id: 28, name: "Action" }, { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" }, { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" }, { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" }, { id: 14, name: "Fantasy" },
  { id: 36, name: "History" }, { id: 27, name: "Horror" },
  { id: 10402, name: "Music" }, { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" }, { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" }, { id: 10752, name: "War" },
  { id: 37, name: "Western" }, { id: 10751, name: "Family" },
];

interface Props {
  existingIds: Set<number>;
  onAdd: (movie: TMDBMovie) => Promise<void>;
  onClose: () => void;
}

export default function GenreBrowserModal({ existingIds, onAdd, onClose }: Props) {
  const [selectedGenre, setSelectedGenre] = useState<{ id: number; name: string } | null>(null);
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  // Track locally added ids so the button flips immediately without prop refresh
  const [localAdded, setLocalAdded] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!selectedGenre) return;
    setLoading(true);
    setMovies([]);
    // Fetch 5 pages in parallel (~100 results)
    Promise.all(
      [1, 2, 3, 4, 5].map((page) =>
        fetch(`/api/movies?mode=genre&genreId=${selectedGenre.id}&page=${page}`)
          .then((r) => r.json())
          .then((d) => d.results ?? [])
          .catch(() => [])
      )
    ).then((pages) => {
      const seen = new Set<number>();
      const all = pages.flat().filter((m: TMDBMovie) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      setMovies(all);
      setLoading(false);
    });
  }, [selectedGenre]);

  async function handleAdd(movie: TMDBMovie) {
    setAdding(movie.id);
    await onAdd(movie);
    setLocalAdded((prev) => new Set(prev).add(movie.id));
    setAdding(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-3 border-b border-border flex-shrink-0">
        <button
          onClick={selectedGenre ? () => setSelectedGenre(null) : onClose}
          className="p-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
        >
          {selectedGenre ? <ArrowLeft size={18} /> : <X size={18} />}
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg">{selectedGenre ? selectedGenre.name : "Browse by Genre"}</h2>
          {selectedGenre && !loading && movies.length > 0 && (
            <p className="text-xs text-muted-foreground">{movies.length} top-rated films</p>
          )}
        </div>
        {selectedGenre && (
          <button onClick={onClose} className="p-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Genre chips */}
      {!selectedGenre && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            {GENRES.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGenre(g)}
                className="py-4 px-2 bg-card border border-border hover:border-primary hover:text-primary rounded-xl text-sm font-medium transition-colors text-foreground"
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Genre chip strip (when a genre is selected) */}
      {selectedGenre && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide border-b border-border flex-shrink-0">
          {GENRES.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGenre(g)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedGenre.id === g.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Movie list */}
      {selectedGenre && (
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 pt-3">
              {movies.map((movie, i) => {
                const already = existingIds.has(movie.id) || localAdded.has(movie.id);
                const isAdding = adding === movie.id;
                const url = posterUrl(movie.poster_path, "w185");
                return (
                  <div key={movie.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                    <span className="w-7 text-center text-xs font-bold text-muted-foreground flex-shrink-0">#{i + 1}</span>
                    <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {url && <Image src={url} alt={movie.title} fill className="object-cover" sizes="40px" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{movie.title}</p>
                      <p className="text-xs text-muted-foreground">{movie.release_date?.slice(0, 4)}</p>
                    </div>
                    <button
                      onClick={() => !already && handleAdd(movie)}
                      disabled={already || isAdding}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
                        already ? "bg-primary/10 text-primary" : "bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground"
                      }`}
                    >
                      {isAdding ? <Loader2 size={11} className="animate-spin" /> :
                       already ? <><Check size={11} /> Added</> :
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
  );
}
