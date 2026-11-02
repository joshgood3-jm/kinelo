import { createAdminClient } from "@/lib/supabase/admin";
import { parseDiaryRss } from "@/lib/letterboxd";
import { getMovieDetail, tmdbMovieToMovie } from "@/lib/tmdb";
import { starsToListElo, percentileElo } from "@/lib/elo";
import { NextResponse } from "next/server";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

async function tmdbSearchByTitle(title: string, year: number | null): Promise<number | null> {
  const params = new URLSearchParams({ api_key: TMDB_KEY!, query: title, include_adult: "false" });
  if (year) params.set("year", String(year));
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.results?.[0]?.id ?? null;
}

async function syncUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  username: string,
  lastSynced: string | null
): Promise<number> {
  const res = await fetch(`https://letterboxd.com/${encodeURIComponent(username)}/rss/`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Kinelo/1.0)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return 0;
  const xml = await res.text();
  const films = parseDiaryRss(xml);

  const cutoff = lastSynced ? new Date(lastSynced) : null;
  const { data: existing } = await admin
    .from("user_movies")
    .select("movie_id, elo_score")
    .eq("user_id", userId);
  const existingIds = new Set((existing ?? []).map((r: { movie_id: number }) => r.movie_id));
  const currentElos: number[] = (existing ?? []).map((r: { elo_score: number }) => r.elo_score);

  // On first sync (no cutoff) import all; on subsequent syncs the RSS only contains recent entries anyway
  const toAdd = films.filter((f) => !f.isRewatch && !existingIds.has(f.tmdbId ?? -1));
  // If we have a cutoff and nothing new in the feed, bail early
  if (cutoff && toAdd.length === 0) return 0;

  let added = 0;
  for (const film of toAdd) {
    try {
      const tmdbId = film.tmdbId ?? await tmdbSearchByTitle(film.title, film.year);
      if (!tmdbId || existingIds.has(tmdbId)) continue;

      const detail = await getMovieDetail(tmdbId);
      const movie = tmdbMovieToMovie(detail);

      await admin.from("movies").upsert({
        id: movie.id, title: movie.title, poster_path: movie.poster_path,
        year: movie.year, genres: movie.genres, overview: movie.overview, director: movie.director,
      });

      const seedElo = film.rating !== null
        ? starsToListElo(film.rating, currentElos)
        : percentileElo(0.5, currentElos);

      const { error } = await admin.from("user_movies").insert({
        user_id: userId,
        movie_id: tmdbId,
        elo_score: seedElo,
      });

      if (!error) {
        existingIds.add(tmdbId);
        currentElos.push(seedElo);
        added++;
      }
    } catch {
      // skip on TMDB error
    }
  }
  return added;
}

// GET = Vercel cron (requires Authorization: Bearer <CRON_SECRET>)
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("user_settings")
    .select("user_id, letterboxd_username, letterboxd_last_synced")
    .not("letterboxd_username", "is", null);

  if (!settings?.length) return NextResponse.json({ synced: 0 });

  let total = 0;
  for (const s of settings) {
    const added = await syncUser(admin, s.user_id, s.letterboxd_username, s.letterboxd_last_synced);
    total += added;
    await admin.from("user_settings")
      .update({ letterboxd_last_synced: new Date().toISOString() })
      .eq("user_id", s.user_id);
  }

  return NextResponse.json({ synced: total });
}
