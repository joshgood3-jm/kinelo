const BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

export const POSTER_URL = "https://image.tmdb.org/t/p/w500";
export const BACKDROP_URL = "https://image.tmdb.org/t/p/w1280";

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("api_key", API_KEY!);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  return res.json();
}

export async function searchMovies(query: string) {
  return tmdbFetch<{ results: import("@/types").TMDBMovie[] }>("/search/movie", {
    query,
    include_adult: "false",
  });
}

export async function getMovieDetail(id: number) {
  return tmdbFetch<import("@/types").TMDBMovieDetail>(
    `/movie/${id}`,
    { append_to_response: "credits" }
  );
}

export async function getSimilarMovies(id: number) {
  return tmdbFetch<{ results: import("@/types").TMDBMovie[] }>(`/movie/${id}/recommendations`);
}

export async function discoverMovies(params: Record<string, string>) {
  return tmdbFetch<{ results: import("@/types").TMDBMovie[] }>("/discover/movie", params);
}

export async function getPopularMovies() {
  return tmdbFetch<{ results: import("@/types").TMDBMovie[] }>("/movie/popular");
}

export function posterUrl(path: string | null, size: "w185" | "w342" | "w500" | "original" = "w500") {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function extractDirector(movie: import("@/types").TMDBMovieDetail): string | undefined {
  return movie.credits?.crew.find((c) => c.job === "Director")?.name;
}

export function tmdbMovieToMovie(movie: import("@/types").TMDBMovieDetail): import("@/types").Movie {
  return {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path,
    year: movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : 0,
    genres: movie.genres?.map((g) => g.name) ?? [],
    overview: movie.overview,
    director: extractDirector(movie),
  };
}
