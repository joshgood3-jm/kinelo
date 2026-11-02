import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseDiaryRss } from "@/lib/letterboxd";
import { getMovieDetail, tmdbMovieToMovie } from "@/lib/tmdb";
import { starsToListElo, percentileElo } from "@/lib/elo";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

async function tmdbSearchByTitle(title: string, year: number | null): Promise<number | null> {
  const params = new URLSearchParams({ api_key: TMDB_KEY!, query: title, include_adult: "false" });
  if (year) params.set("year", String(year));
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.results?.[0]?.id ?? null;
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim();
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rssUrl = `https://letterboxd.com/${encodeURIComponent(username)}/rss/`;
  let xml: string;
  try {
    const rssRes = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Kinelo/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!rssRes.ok) {
      return NextResponse.json({ error: `Letterboxd user "${username}" not found or profile is private` }, { status: 404 });
    }
    xml = await rssRes.text();
  } catch {
    return NextResponse.json({ error: "Could not reach Letterboxd" }, { status: 502 });
  }

  const films = parseDiaryRss(xml);
  if (!films.length) {
    return NextResponse.json({ error: "No diary entries found. Make sure the profile is public." }, { status: 404 });
  }

  // Deduplicate (keep first occurrence = most recent)
  const seenTitles = new Set<string>();
  const unique = films.filter((f) => {
    const key = f.tmdbId ? String(f.tmdbId) : `${f.title}|${f.year}`;
    if (seenTitles.has(key)) return false;
    seenTitles.add(key);
    return !f.isRewatch;
  });

  const { data: existing } = await supabase
    .from("user_movies")
    .select("movie_id, elo_score")
    .eq("user_id", user.id);
  const existingIds = new Set((existing ?? []).map((r: { movie_id: number }) => r.movie_id));
  const currentElos: number[] = (existing ?? []).map((r: { elo_score: number }) => r.elo_score);

  // Save username to user_settings for auto-sync
  await supabase.from("user_settings").upsert({ user_id: user.id, letterboxd_username: username });

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < unique.length; i += 10) {
    const batch = unique.slice(i, i + 10);
    await Promise.all(batch.map(async (film) => {
      try {
        // Use embedded TMDB ID if present, otherwise fall back to title search
        const tmdbId = film.tmdbId ?? await tmdbSearchByTitle(film.title, film.year);
        if (!tmdbId) { failed++; return; }
        if (existingIds.has(tmdbId)) { skipped++; return; }

        const detail = await getMovieDetail(tmdbId);
        const movie = tmdbMovieToMovie(detail);

        await supabase.from("movies").upsert({
          id: movie.id, title: movie.title, poster_path: movie.poster_path,
          year: movie.year, genres: movie.genres, overview: movie.overview, director: movie.director,
        });

        const seedElo = film.rating !== null
          ? starsToListElo(film.rating, currentElos)
          : percentileElo(0.5, currentElos);

        await supabase.from("user_movies").insert({
          user_id: user.id,
          movie_id: movie.id,
          elo_score: seedElo,
        });

        existingIds.add(tmdbId);
        currentElos.push(seedElo);
        imported++;
      } catch {
        failed++;
      }
    }));
    if (i + 10 < unique.length) await new Promise((r) => setTimeout(r, 300));
  }

  return NextResponse.json({
    imported,
    skipped,
    failed,
    total: unique.length,
    message: `Imported ${imported} films from @${username}'s Letterboxd diary`,
  });
}
