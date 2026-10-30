"use client";
import { useState, useCallback, useRef } from "react";
import { Search, X, Plus, Check } from "lucide-react";
import { posterUrl } from "@/lib/tmdb";
import type { TMDBMovie } from "@/types";
import Image from "next/image";

interface Props {
  onAdd: (movie: TMDBMovie) => Promise<void>;
  existingIds?: Set<number>;
}

export default function MovieSearch({ onAdd, existingIds = new Set() }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/movies?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setLoading(false);
    }, 300);
  }, []);

  async function handleAdd(movie: TMDBMovie) {
    setAdding(movie.id);
    await onAdd(movie);
    setAdding(null);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
          placeholder="Search for a movie…"
          className="w-full pl-9 pr-9 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <X size={16} />
          </button>
        )}
      </div>

      {(results.length > 0 || loading) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl overflow-hidden shadow-2xl">
          {loading && <div className="p-3 text-muted-foreground text-sm text-center">Searching…</div>}
          {results.slice(0, 6).map((movie) => {
            const already = existingIds.has(movie.id);
            const isAdding = adding === movie.id;
            const url = posterUrl(movie.poster_path, "w185");
            return (
              <div key={movie.id} className="flex items-center gap-3 p-3 hover:bg-muted transition-colors">
                <div className="relative w-8 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                  {url && <Image src={url} alt={movie.title} fill className="object-cover" sizes="32px" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{movie.title}</p>
                  <p className="text-xs text-muted-foreground">{movie.release_date?.slice(0, 4)}</p>
                </div>
                <button
                  onClick={() => !already && handleAdd(movie)}
                  disabled={already || isAdding}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 disabled:opacity-50 transition-colors"
                >
                  {already ? <Check size={14} className="text-primary" /> : isAdding ? <span className="text-xs">…</span> : <Plus size={14} className="text-primary" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
