import { searchMovies, discoverMovies } from "@/lib/tmdb";
import { NextRequest, NextResponse } from "next/server";

const BASE = "https://api.themoviedb.org/3";
const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

async function tmdbGet(path: string, params: Record<string, string> = {}) {
  const q = new URLSearchParams({ api_key: API_KEY!, ...params });
  const res = await fetch(`${BASE}${path}?${q}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const mode = req.nextUrl.searchParams.get("mode") ?? "title";

  try {
    if (mode === "person") {
      if (!q.trim()) return NextResponse.json({ results: [] });
      const department = req.nextUrl.searchParams.get("department"); // "Acting" | "Directing"
      const data = await tmdbGet("/search/person", { query: q, include_adult: "false" });
      const results = (data.results ?? []).filter((p: { known_for_department: string }) =>
        !department || p.known_for_department === department
      );
      return NextResponse.json({ results });
    }

    if (mode === "credits") {
      const personId = req.nextUrl.searchParams.get("personId");
      if (!personId) return NextResponse.json({ results: [] });
      const data = await tmdbGet(`/person/${personId}/movie_credits`);
      const seen = new Set<number>();
      const combined = [
        ...(data.cast ?? []),
        ...((data.crew ?? []).filter((c: { job: string }) => c.job === "Director")),
      ].filter((m: { id: number; vote_count?: number }) => {
        if (seen.has(m.id) || (m.vote_count ?? 0) < 50) return false;
        seen.add(m.id);
        return true;
      }).sort((a: { popularity: number }, b: { popularity: number }) => b.popularity - a.popularity)
        .slice(0, 20);
      return NextResponse.json({ results: combined });
    }

    if (mode === "genre") {
      const genreId = req.nextUrl.searchParams.get("genreId");
      if (!genreId) return NextResponse.json({ results: [] });
      const data = await discoverMovies({
        with_genres: genreId,
        sort_by: "vote_average.desc",
        "vote_count.gte": "300",
        language: "en-US",
      });
      return NextResponse.json({ results: data.results ?? [] });
    }

    // Default: title search
    if (!q.trim()) return NextResponse.json({ results: [] });
    const data = await searchMovies(q);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
