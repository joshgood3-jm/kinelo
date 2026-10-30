"use client";
import { useState, useCallback, useRef } from "react";
import { Search, X, Plus, Check, User } from "lucide-react";
import { posterUrl } from "@/lib/tmdb";
import type { TMDBMovie } from "@/types";
import Image from "next/image";

interface Props {
  onAdd: (movie: TMDBMovie) => Promise<void>;
  existingIds?: Set<number>;
  onGenreBrowse?: () => void;
  onPersonBrowse?: (person: TMDBPerson) => void;
}

type SearchMode = "title" | "actor" | "director" | "genre";

interface TMDBPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  known_for: Array<{ title?: string; name?: string }>;
}

export default function MovieSearch({ onAdd, existingIds = new Set(), onGenreBrowse, onPersonBrowse }: Props) {
  const [mode, setMode] = useState<SearchMode>("title");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBMovie[]>([]);
  const [personResults, setPersonResults] = useState<TMDBPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearSearch() {
    setQuery("");
    setResults([]);
    setPersonResults([]);
  }

  function switchMode(m: SearchMode) {
    setMode(m);
    clearSearch();
    if (m === "genre") onGenreBrowse?.();
  }

  const search = useCallback((q: string, currentMode: SearchMode) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setPersonResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      if (currentMode === "title") {
        const res = await fetch(`/api/movies?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } else {
        const department = currentMode === "actor" ? "Acting" : "Directing";
        const res = await fetch(`/api/movies?mode=person&q=${encodeURIComponent(q)}&department=${department}`);
        const data = await res.json();
        setPersonResults(data.results ?? []);
      }
      setLoading(false);
    }, 300);
  }, []);

  function selectPerson(person: TMDBPerson) {
    clearSearch();
    onPersonBrowse?.(person);
  }

  async function handleAdd(movie: TMDBMovie) {
    setAdding(movie.id);
    await onAdd(movie);
    setAdding(null);
  }

  const showDropdown = results.length > 0 || personResults.length > 0 || loading;

  return (
    <div className="space-y-2">
      {/* Mode tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5">
        {(["title", "actor", "director", "genre"] as SearchMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "title" ? "🎬 Title" : m === "actor" ? "🎭 Actor" : m === "director" ? "🎥 Director" : "🏷 Genre"}
          </button>
        ))}
      </div>

      {/* Search input (title / actor / director only) */}
      {mode !== "genre" && (
        <div className="relative">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); search(e.target.value, mode); }}
              placeholder={
                mode === "actor" ? "Search actor name…" :
                mode === "director" ? "Search director name…" :
                "Search for a movie…"
              }
              className="w-full pl-9 pr-9 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
            />
            {query && (
              <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X size={16} />
              </button>
            )}
          </div>

          {showDropdown && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl overflow-hidden shadow-2xl">
              {loading && <div className="p-3 text-muted-foreground text-sm text-center">Searching…</div>}

              {/* Person results */}
              {personResults.slice(0, 5).map((person) => (
                <button
                  key={person.id}
                  onClick={() => selectPerson(person)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                >
                  <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    {person.profile_path ? (
                      <Image src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} alt={person.name} fill className="object-cover" sizes="32px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><User size={14} className="text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{person.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {person.known_for?.slice(0, 2).map((k) => k.title ?? k.name).join(", ")}
                    </p>
                  </div>
                </button>
              ))}

              {/* Movie results */}
              {results.slice(0, 8).map((movie) => {
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
      )}
    </div>
  );
}
