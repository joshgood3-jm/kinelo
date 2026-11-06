import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
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

interface SyncedMovie {
  umId: string;
  movieId: number;
  title: string;
  posterPath: string | null;
  eloScore: number;
}

interface SyncResult {
  synced: SyncedMovie[];
  debug: { rssFetchOk: boolean; rssStatus: number; filmsInRss: number; newInRss: number; skipped: { title: string; reason: string }[] };
}

async function syncUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  username: string,
  lastSynced: string | null
): Promise<SyncResult> {
  const rssRes = await fetch(`https://letterboxd.com/${encodeURIComponent(username)}/rss/`, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
    signal: AbortSignal.timeout(10000),
  });

  const debug = { rssFetchOk: rssRes.ok, rssStatus: rssRes.status, filmsInRss: 0, newInRss: 0, skipped: [] as { title: string; reason: string }[] };
  if (!rssRes.ok) return { synced: [], debug };

  const xml = await rssRes.text();
  const films = parseDiaryRss(xml);
  debug.filmsInRss = films.length;

  const cutoff = lastSynced ? new Date(lastSynced) : null;
  const { data: existing } = await admin
    .from("user_movies")
    .select("movie_id, elo_score")
    .eq("user_id", userId);
  const existingIds = new Set((existing ?? []).map((r: { movie_id: number }) => r.movie_id));
  const currentElos: number[] = (existing ?? []).map((r: { elo_score: number }) => r.elo_score);

  const toAdd = films.filter((f) => !f.isRewatch && !existingIds.has(f.tmdbId ?? -1));
  debug.newInRss = toAdd.length;
  if (cutoff && toAdd.length === 0) return { synced: [], debug };

  const synced: SyncedMovie[] = [];
  for (const film of toAdd) {
    try {
      const tmdbId = film.tmdbId ?? await tmdbSearchByTitle(film.title, film.year);
      if (!tmdbId) { debug.skipped.push({ title: film.title, reason: "tmdb_not_found" }); continue; }
      if (existingIds.has(tmdbId)) { debug.skipped.push({ title: film.title, reason: "already_in_list" }); continue; }

      const detail = await getMovieDetail(tmdbId);
      const movie = tmdbMovieToMovie(detail);

      await admin.from("movies").upsert({
        id: movie.id, title: movie.title, poster_path: movie.poster_path,
        year: movie.year, genres: movie.genres, overview: movie.overview, director: movie.director,
      });

      const seedElo = film.rating !== null
        ? starsToListElo(film.rating, currentElos)
        : percentileElo(0.5, currentElos);

      const { data: inserted, error } = await admin.from("user_movies").insert({
        user_id: userId,
        movie_id: tmdbId,
        elo_score: seedElo,
      }).select("id").single();

      if (!error && inserted) {
        existingIds.add(tmdbId);
        currentElos.push(seedElo);
        synced.push({ umId: inserted.id, movieId: tmdbId, title: movie.title, posterPath: movie.poster_path, eloScore: seedElo });
      } else if (error) {
        debug.skipped.push({ title: film.title, reason: `db_error:${error.code}` });
      }
    } catch (e) {
      debug.skipped.push({ title: film.title, reason: `exception:${String(e).slice(0, 80)}` });
    }
  }
  return { synced, debug };
}

// POST = manual "Sync now" triggered by the logged-in user
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const username: string | undefined = body.username;
  if (!username) return NextResponse.json({ error: "No Letterboxd username provided" }, { status: 400 });

  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("user_settings")
    .select("letterboxd_last_synced")
    .eq("user_id", user.id)
    .single();

  const { synced, debug } = await syncUser(admin, user.id, username, settings?.letterboxd_last_synced ?? null);
  await admin.from("user_settings")
    .update({ letterboxd_last_synced: new Date().toISOString() })
    .eq("user_id", user.id);

  return NextResponse.json({ added: synced.length, movies: synced, debug });
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
    const { synced } = await syncUser(admin, s.user_id, s.letterboxd_username, s.letterboxd_last_synced);
    total += synced.length;
    await admin.from("user_settings")
      .update({ letterboxd_last_synced: new Date().toISOString() })
      .eq("user_id", s.user_id);
  }

  return NextResponse.json({ synced: total });
}
