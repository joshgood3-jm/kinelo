import { createClient } from "@/lib/supabase/server";
import { getPopularMovies } from "@/lib/tmdb";
import { NextResponse } from "next/server";

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
      topMovieIds: [],
      rankedIds: [],
      genreFreq: {},
      directorFreq: {},
      fallback: popular.results.slice(0, 10).map((m) => ({ movie: m, score: 0, reasons: ["Popular right now"] })),
    });
  }

  const rankedIds = userMovies.map((um) => um.movie_id);
  const genreFreq: Record<string, number> = {};
  const directorFreq: Record<string, number> = {};

  userMovies.slice(0, 10).forEach((um, idx) => {
    const weight = (10 - idx) / 10;
    const movie = um.movies as { genres?: string[]; director?: string } | null;
    movie?.genres?.forEach((g) => { genreFreq[g] = (genreFreq[g] ?? 0) + weight; });
    if (movie?.director) { directorFreq[movie.director] = (directorFreq[movie.director] ?? 0) + weight * 2; }
  });

  // Source titles for reason labels (top 5)
  const topMovies = userMovies.slice(0, 5).map((um) => ({
    tmdbId: um.movie_id,
    title: (um.movies as unknown as { title: string } | null)?.title ?? "",
  }));

  return NextResponse.json({ topMovies, rankedIds, genreFreq, directorFreq, fallback: null });
}
