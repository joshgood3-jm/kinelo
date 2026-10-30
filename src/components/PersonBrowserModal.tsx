"use client";
import { useState, useEffect } from "react";
import { X, Plus, Check, Loader2, User } from "lucide-react";
import Image from "next/image";
import { posterUrl } from "@/lib/tmdb";
import type { TMDBMovie } from "@/types";

interface TMDBPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
}

interface Props {
  person: TMDBPerson;
  existingIds: Set<number>;
  onAdd: (movie: TMDBMovie) => Promise<void>;
  onClose: () => void;
}

export default function PersonBrowserModal({ person, existingIds, onAdd, onClose }: Props) {
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<number | null>(null);
  const [localAdded, setLocalAdded] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/movies?mode=credits&personId=${person.id}`)
      .then((r) => r.json())
      .then((d) => { setMovies(d.results ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [person.id]);

  async function handleAdd(movie: TMDBMovie) {
    setAdding(movie.id);
    await onAdd(movie);
    setLocalAdded((prev) => new Set(prev).add(movie.id));
    setAdding(null);
  }

  const photoUrl = person.profile_path
    ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-3 border-b border-border flex-shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
        >
          <X size={18} />
        </button>
        <div className="relative w-9 h-9 rounded-full overflow-hidden bg-muted flex-shrink-0">
          {photoUrl ? (
            <Image src={photoUrl} alt={person.name} fill className="object-cover" sizes="36px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={16} className="text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg leading-tight truncate">{person.name}</h2>
          {!loading && (
            <p className="text-xs text-muted-foreground">{movies.length} films</p>
          )}
        </div>
      </div>

      {/* Movie list */}
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
    </div>
  );
}
