import { createClient } from "@/lib/supabase/server";
import { getMovieDetail, discoverMovies, getPopularMovies } from "@/lib/tmdb";
import { NextResponse } from "next/server";
import type { TMDBMovieDetail } from "@/types";

const TRAKT_KEY = process.env.TRAKT_API_KEY!;
const TRAKT_HEADERS = {
  "Content-Type": "application/json",
  "trakt-api-version": "2",
  "trakt-api-key": TRAKT_KEY,
};

async function traktRelated(tmdbId: number): Promise<{ title: string; year: number; tmdbId: number }[]> {
  // Resolve TMDB ID → Trakt slug
  const searchRes = await fetch(`https://api.trakt.tv/search/tmdb/${tmdbId}?type=movie`, { headers: TRAKT_HEADERS });
  if (!searchRes.ok) return [];
  const searchData = await searchRes.json();
  const slug = searchData?.[0]?.movie?.ids?.slug;
  if (!slug) return [];

  const relRes = await fetch(`https://api.trakt.tv/movies/${slug}/related?limit=12`, { headers: TRAKT_HEADERS });
  if (!relRes.ok) return [];
  const related = await relRes.json();
  if (!Array.isArray(related)) return [];

  return related
    .filter((r: { ids?: { tmdb?: number } }) => r.ids?.tmdb)
    .map((r: { title: string; year: number; ids: { tmdb: number } }) => ({
      title: r.title,
      year: r.year,
      tmdbId: r.ids.tmdb,
    }));
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: userMovies } = await supabase
    .from("user_movies")
    .select("movie_id, elo_score, movies(id, title, genres, director)")
    .eq("user_id", user.id)
    .order("elo_score", { ascending: false })
    .limit(20);

  if (!userMovies || userMovies.length === 0) {
    const popular = await getPopularMovies();
    return NextResponse.json({
      recommendations: popular.results.slice(0, 10).map((m) => ({
        movie: m,
        score: 0,
        reasons: ["Popular right now"],
      })),
    });
  }

  const rankedIds = new Set(userMovies.map((um) => um.movie_id));

  // Build taste profile from top 10
  const genreFreq: Record<string, number> = {};
  const directorFreq: Record<string, number> = {};
  userMovies.slice(0, 10).forEach((um, idx) => {
    const weight = (10 - idx) / 10;
    const movie = um.movies as { genres?: string[]; director?: string } | null;
    movie?.genres?.forEach((g) => { genreFreq[g] = (genreFreq[g] ?? 0) + weight; });
    if (movie?.director) { directorFreq[movie.director] = (directorFreq[movie.director] ?? 0) + weight * 2; }
  });

  // Fetch Trakt related movies for top 5
  const topMovieIds = userMovies.slice(0, 5).map((um) => um.movie_id);
  const traktResults = await Promise.all(topMovieIds.map((id) => traktRelated(id).catch(() => [])));

  // Collect candidates by TMDB ID
  const candidateMap = new Map<number, { title: string; year: number; tmdbId: number; sources: number[] }>();
  traktResults.forEach((related, i) => {
    const sourceId = topMovieIds[i];
    for (const r of related) {
      if (rankedIds.has(r.tmdbId)) continue;
      if (candidateMap.has(r.tmdbId)) {
        candidateMap.get(r.tmdbId)!.sources.push(sourceId);
      } else {
        candidateMap.set(r.tmdbId, { ...r, sources: [sourceId] });
      }
    }
  });

  // If few candidates, supplement with Discover by top genres
  if (candidateMap.size < 15) {
    const topGenres = Object.entries(genreFreq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);
    const genreIdMap: Record<string, string> = {
      Action: "28", Adventure: "12", Animation: "16", Comedy: "35",
      Crime: "80", Documentary: "99", Drama: "18", Fantasy: "14",
      Horror: "27", Mystery: "9648", Romance: "10749", "Science Fiction": "878",
      Thriller: "53", War: "10752", Western: "37",
    };
    const ids = topGenres.map((g) => genreIdMap[g]).filter(Boolean).join(",");
    if (ids) {
      const discovered = await discoverMovies({ with_genres: ids, sort_by: "vote_average.desc", "vote_count.gte": "500" });
      for (const m of discovered.results) {
        if (!rankedIds.has(m.id) && !candidateMap.has(m.id)) {
          candidateMap.set(m.id, { title: m.title, year: parseInt(m.release_date?.slice(0, 4) ?? "0"), tmdbId: m.id, sources: [] });
        }
      }
    }
  }

  // Fetch full TMDB details for top candidates (sort by source overlap first)
  const sorted = Array.from(candidateMap.values()).sort((a, b) => b.sources.length - a.sources.length);
  const topCandidates = sorted.slice(0, 60);
  const detailResults = await Promise.allSettled(topCandidates.map((c) => getMovieDetail(c.tmdbId)));

  const GENRE_ID_MAP: Record<number, string> = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
    80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
    14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
    9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  };

  // Map source movie IDs to titles for reason labels
  const sourceIdToTitle = new Map(userMovies.slice(0, 5).map((um) => {
    const m = um.movies as unknown as { title: string } | null;
    return [um.movie_id, m?.title ?? ""];
  }));

  const scored: { movie: TMDBMovieDetail; score: number; reasons: string[] }[] = [];

  detailResults.forEach((result, i) => {
    if (result.status !== "fulfilled") return;
    const movie = result.value;
    const candidate = topCandidates[i];
    let score = candidate.sources.length * 3; // overlap bonus
    const reasons: string[] = [];

    const raw = movie as { genre_ids?: number[]; genres?: { id?: number; name: string }[] };
    const movieGenres: string[] = raw.genres?.map((g) => g.name) ??
      (raw.genre_ids ?? []).map((id) => GENRE_ID_MAP[id]).filter(Boolean);

    movieGenres.forEach((g) => {
      if (genreFreq[g]) { score += genreFreq[g]; if (!reasons.includes(`You love ${g}`)) reasons.push(`You love ${g}`); }
    });

    const director = (movie as { director?: string }).director ??
      (movie as { credits?: { crew?: { job: string; name: string }[] } }).credits?.crew?.find((c) => c.job === "Director")?.name;
    if (director && directorFreq[director]) { score += directorFreq[director]; reasons.push(`More from ${director}`); }

    // If recommended by multiple top movies, show that as the reason
    if (candidate.sources.length > 1) {
      reasons.unshift(`Liked by ${candidate.sources.length} of your top picks`);
    } else if (candidate.sources.length === 1) {
      const sourceTitle = sourceIdToTitle.get(candidate.sources[0]);
      if (sourceTitle) reasons.unshift(`Because you liked "${sourceTitle}"`);
    }

    score += Math.min((movie.vote_average ?? 0) / 10, 1);
    scored.push({ movie, score, reasons: reasons.slice(0, 2) });
  });

  scored.sort((a, b) => b.score - a.score);

  return NextResponse.json({ recommendations: scored.slice(0, 40) });
}
