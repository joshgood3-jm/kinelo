import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseRatingsCsv, ratingToElo } from "@/lib/letterboxd";
import { getMovieDetail, tmdbMovieToMovie } from "@/lib/tmdb";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const INITIAL_ELO = 1000;

async function tmdbSearch(title: string, year: number | null): Promise<number | null> {
  const params = new URLSearchParams({ api_key: TMDB_KEY!, query: title, include_adult: "false" });
  if (year) params.set("year", String(year));
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  // Try exact year match first, then fall back to first result
  const exact = year ? data.results?.find((r: { release_date?: string }) =>
    r.release_date?.startsWith(String(year))) : null;
  return (exact ?? data.results?.[0])?.id ?? null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const text = await file.text();
  const films = parseRatingsCsv(text);
  if (!films.length) return NextResponse.json({ error: "No films found in CSV" }, { status: 400 });

  // Check existing movies
  const { data: existing } = await supabase.from("user_movies").select("movie_id").eq("user_id", user.id);
  const existingIds = new Set((existing ?? []).map((r) => r.movie_id));

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  // Deduplicate
  const seen = new Set<string>();
  const unique = films.filter((f) => {
    const key = `${f.title}|${f.year}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Process in batches of 10
  for (let i = 0; i < unique.length; i += 10) {
    const batch = unique.slice(i, i + 10);
    await Promise.all(batch.map(async (film) => {
      try {
        const tmdbId = await tmdbSearch(film.title, film.year);
        if (!tmdbId) { failed++; return; }
        if (existingIds.has(tmdbId)) {
          // Update letterboxd_rating if we now have one
          if (film.rating) {
            await supabase
              .from("user_movies")
              .update({ letterboxd_rating: film.rating })
              .eq("user_id", user.id)
              .eq("movie_id", tmdbId)
              .is("letterboxd_rating", null);
          }
          skipped++;
          return;
        }

        const detail = await getMovieDetail(tmdbId);
        const movie = tmdbMovieToMovie(detail);

        await supabase.from("movies").upsert({
          id: movie.id, title: movie.title, poster_path: movie.poster_path,
          year: movie.year, genres: movie.genres, overview: movie.overview, director: movie.director,
        });

        const elo = film.rating ? ratingToElo(film.rating) : INITIAL_ELO;
        await supabase.from("user_movies").insert({
          user_id: user.id,
          movie_id: movie.id,
          elo_score: elo,
          letterboxd_rating: film.rating,
        });

        existingIds.add(tmdbId);
        imported++;
      } catch {
        failed++;
      }
    }));
    if (i + 10 < unique.length) await new Promise((r) => setTimeout(r, 300));
  }

  return NextResponse.json({ imported, skipped, failed, total: unique.length });
}
