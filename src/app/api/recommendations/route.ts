import { createClient } from "@/lib/supabase/server";
import { getMovieDetail, getSimilarMovies, discoverMovies, getPopularMovies } from "@/lib/tmdb";
import { NextResponse } from "next/server";
import type { TMDBMovieDetail } from "@/types";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user's ranked movies ordered by ELO
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

  // Build taste profile from top 10 ranked movies
  const genreFreq: Record<string, number> = {};
  const directorFreq: Record<string, number> = {};

  userMovies.slice(0, 10).forEach((um, idx) => {
    const weight = (10 - idx) / 10; // higher rank = higher weight
    const movie = um.movies as { genres?: string[]; director?: string } | null;
    movie?.genres?.forEach((g) => {
      genreFreq[g] = (genreFreq[g] ?? 0) + weight;
    });
    if (movie?.director) {
      directorFreq[movie.director] = (directorFreq[movie.director] ?? 0) + weight * 2;
    }
  });

  // Fetch similar movies for top 5 ranked
  const topMovieIds = userMovies.slice(0, 5).map((um) => um.movie_id);
  const similarPromises = topMovieIds.map((id) => getSimilarMovies(id).catch(() => ({ results: [] })));
  const similarResults = await Promise.all(similarPromises);

  // Collect candidates
  const candidateMap = new Map<number, TMDBMovieDetail>();

  const MIN_VOTES = 500;

  for (const { results } of similarResults) {
    for (const m of results) {
      if (!rankedIds.has(m.id) && !candidateMap.has(m.id) && (m.vote_count ?? 0) >= MIN_VOTES) {
        candidateMap.set(m.id, m as unknown as TMDBMovieDetail);
      }
    }
  }

  // If few candidates, supplement with discover
  if (candidateMap.size < 15) {
    const topGenres = Object.entries(genreFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g]) => g);

    // Map genre names to TMDB genre IDs (common ones)
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
          candidateMap.set(m.id, m as unknown as TMDBMovieDetail);
        }
      }
    }
  }

  // TMDB genre ID → name map
  const GENRE_ID_MAP: Record<number, string> = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
    80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
    14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
    9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  };

  // Score each candidate
  const scored = Array.from(candidateMap.values()).map((movie) => {
    let score = 0;
    const reasons: string[] = [];

    // Handle both genre_ids (numbers) and genres (objects with names)
    const raw = movie as { genre_ids?: number[]; genres?: { id?: number; name: string }[] };
    const movieGenres: string[] = raw.genres?.map((g) => g.name) ??
      (raw.genre_ids ?? []).map((id) => GENRE_ID_MAP[id]).filter(Boolean);

    movieGenres.forEach((g) => {
      if (genreFreq[g]) {
        score += genreFreq[g];
        if (!reasons.includes(`You love ${g}`)) reasons.push(`You love ${g}`);
      }
    });

    const director = (movie as { director?: string; credits?: { crew?: { job: string; name: string }[] } }).director ??
      (movie as { credits?: { crew?: { job: string; name: string }[] } }).credits?.crew?.find((c) => c.job === "Director")?.name;

    if (director && directorFreq[director]) {
      score += directorFreq[director];
      reasons.push(`More from ${director}`);
    }

    score += Math.min((movie.vote_average ?? 0) / 10, 1);

    return {
      movie,
      score,
      reasons: reasons.slice(0, 2),
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    recommendations: scored.slice(0, 40),
  });
}
