import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseDiaryRss, ratingToElo } from "@/lib/letterboxd";
import { getMovieDetail, tmdbMovieToMovie } from "@/lib/tmdb";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const INITIAL_ELO = 1000;

async function tmdbSearch(title: string, year: number | null): Promise<number | null> {
  const params = new URLSearchParams({
    api_key: TMDB_KEY!,
    query: title,
    include_adult: "false",
  });
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

  // Fetch Letterboxd diary RSS
  const rssUrl = `https://letterboxd.com/${encodeURIComponent(username)}/rss/`;
  let xml: string;
  try {
    const rssRes = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Cinematch/1.0)" },
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

  // Deduplicate by title+year
  const seen = new Set<string>();
  const unique = films.filter((f) => {
    const key = `${f.title}|${f.year}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Check which movies are already in user's list
  const { data: existing } = await supabase
    .from("user_movies")
    .select("movie_id")
    .eq("user_id", user.id);
  const existingIds = new Set((existing ?? []).map((r) => r.movie_id));

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  // Process in batches of 10 to respect TMDB rate limits
  for (let i = 0; i < unique.length; i += 10) {
    const batch = unique.slice(i, i + 10);
    await Promise.all(batch.map(async (film) => {
      try {
        const tmdbId = await tmdbSearch(film.title, film.year);
        if (!tmdbId) { failed++; return; }
        if (existingIds.has(tmdbId)) { skipped++; return; }

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
    // Small delay between batches
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
