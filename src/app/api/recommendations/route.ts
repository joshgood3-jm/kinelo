import { createClient } from "@/lib/supabase/server";
import { getPopularMovies } from "@/lib/tmdb";
import { NextResponse } from "next/server";
import type { TMDBMovieDetail } from "@/types";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY!;
const SEED_COUNT = 15;    // top N ranked movies used as seeds
const TOP_CREATORS = 25;  // top N weighted creators to pull filmographies for
const MIN_VOTES = 500;
const MIN_RATING = 6.2;
const MAX_PER_CREATOR = 5; // cap recs per creator
const CANDIDATE_POOL = 100; // candidates fetched for full details

const DIRECTOR_JOBS = new Set(["Director"]);
const WRITER_JOBS = new Set(["Screenplay", "Story", "Writer", "Adaptation", "Screenplay/Story"]);

const ROLE_WEIGHT = { director: 3.0, writer: 2.0, cast: 0.7 } as const;

type CreatorRole = keyof typeof ROLE_WEIGHT;

interface Creator {
  name: string;
  role: CreatorRole;
  weight: number;
  sourceMovies: string[];
}

interface FilmographyMovie {
  id: number;
  title: string;
  vote_average: number;
  vote_count: number;
  release_date: string;
  job?: string;   // present in crew results
  video?: boolean; // true for music videos / shorts — exclude these
}

async function tmdbGet<T>(path: string): Promise<T | null> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `https://api.themoviedb.org/3${path}${sep}api_key=${TMDB_KEY}`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: userMovies } = await supabase
    .from("user_movies")
    .select("movie_id, elo_score, movies(id, title)")
    .eq("user_id", user.id)
    .order("elo_score", { ascending: false });

  if (!userMovies || userMovies.length === 0) {
    const popular = await getPopularMovies();
    return NextResponse.json({
      recs: popular.results.slice(0, 20).map((m) => ({ movie: m, score: 0, reasons: ["Popular right now"] })),
      rankedIds: [],
    });
  }

  const rankedIds = new Set(userMovies.map((um) => um.movie_id));
  const seeds = userMovies.slice(0, SEED_COUNT);

  // ELO-based weight: top movie = 1.0, lowest seed = ~0.15
  const maxElo = seeds[0].elo_score;
  const minElo = seeds[seeds.length - 1].elo_score;
  const eloRange = maxElo - minElo || 1;
  const eloWeight = (elo: number) => 0.15 + 0.85 * ((elo - minElo) / eloRange);

  // 1. Fetch credits for all seed movies in parallel
  const creditsResults = await Promise.allSettled(
    seeds.map((um) =>
      tmdbGet<{
        cast: Array<{ id: number; name: string; order: number }>;
        crew: Array<{ id: number; name: string; job: string }>;
      }>(`/movie/${um.movie_id}/credits`)
    )
  );

  // 2. Build weighted creator map
  const creatorMap = new Map<number, Creator>();

  const addCreator = (personId: number, name: string, role: CreatorRole, weight: number, sourceTitle: string) => {
    const existing = creatorMap.get(personId);
    if (existing) {
      existing.weight += weight;
      if (!existing.sourceMovies.includes(sourceTitle)) existing.sourceMovies.push(sourceTitle);
    } else {
      creatorMap.set(personId, { name, role, weight, sourceMovies: [sourceTitle] });
    }
  };

  creditsResults.forEach((result, i) => {
    if (result.status !== "fulfilled" || !result.value) return;
    const { cast, crew } = result.value;
    const um = seeds[i];
    const title = (um.movies as unknown as { title: string } | null)?.title ?? "";
    const w = eloWeight(um.elo_score);

    // Director (highest signal)
    const director = crew.find((c) => c.job === "Director");
    if (director) addCreator(director.id, director.name, "director", w * ROLE_WEIGHT.director, title);

    // Writers (screenplay > story)
    crew
      .filter((c) => ["Screenplay", "Story", "Writer", "Adaptation"].includes(c.job))
      .slice(0, 2)
      .forEach((writer) => addCreator(writer.id, writer.name, "writer", w * ROLE_WEIGHT.writer, title));

    // Top 3 billed cast
    cast
      .filter((a) => a.order < 3)
      .forEach((actor) => addCreator(actor.id, actor.name, "cast", w * ROLE_WEIGHT.cast, title));
  });

  // 3. Take top creators by cumulative weight
  const topCreators = Array.from(creatorMap.entries())
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, TOP_CREATORS);

  // 4. Fetch each creator's filmography in parallel
  const filmographies = await Promise.allSettled(
    topCreators.map(([personId]) =>
      tmdbGet<{ crew: FilmographyMovie[]; cast: FilmographyMovie[] }>(`/person/${personId}/movie_credits`)
    )
  );

  // 5. Score candidate movies
  const candidateScores = new Map<number, { score: number; reasons: string[] }>();

  filmographies.forEach((result, i) => {
    if (result.status !== "fulfilled" || !result.value) return;
    const [, creator] = topCreators[i];

    // Only pull films where this person actually did the credited role
    // (prevents EP credits from showing as "Directed by X")
    let films: FilmographyMovie[];
    if (creator.role === "cast") {
      films = result.value.cast;
    } else if (creator.role === "director") {
      films = result.value.crew.filter((f) => DIRECTOR_JOBS.has(f.job ?? ""));
    } else {
      films = result.value.crew.filter((f) => WRITER_JOBS.has(f.job ?? ""));
    }

    // Sort best films first so the per-creator cap picks quality over arbitrary TMDB order
    films = films
      .slice()
      .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0) || (b.vote_count ?? 0) - (a.vote_count ?? 0));

    const reason = creator.role === "director"
      ? `Directed by ${creator.name}`
      : creator.role === "writer"
      ? `Written by ${creator.name}`
      : `Starring ${creator.name}`;

    let creatorContributions = 0;
    for (const film of films) {
      if (rankedIds.has(film.id)) continue;
      if (film.video) continue; // skip music videos and shorts
      if ((film.vote_count ?? 0) < MIN_VOTES) continue;
      if ((film.vote_average ?? 0) < MIN_RATING) continue;
      if (!film.release_date) continue;
      if (creatorContributions >= MAX_PER_CREATOR) break;

      const existing = candidateScores.get(film.id);
      if (existing) {
        existing.score += creator.weight;
        if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
      } else {
        candidateScores.set(film.id, { score: creator.weight, reasons: [reason] });
        creatorContributions++;
      }
    }
  });

  // 6. Sort and fetch full TMDB details for top candidates
  const sortedCandidates = Array.from(candidateScores.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, CANDIDATE_POOL);

  const details = await Promise.allSettled(
    sortedCandidates.map(([movieId]) =>
      tmdbGet<TMDBMovieDetail>(`/movie/${movieId}`)
    )
  );

  const recs: { movie: TMDBMovieDetail; score: number; reasons: string[] }[] = [];
  details.forEach((result, i) => {
    if (result.status !== "fulfilled" || !result.value) return;
    const movie = result.value;
    if (!movie.id || (movie as { success?: boolean }).success === false) return;
    if (movie.runtime && movie.runtime < 45) return; // skip shorts and music videos
    const [, candidate] = sortedCandidates[i];
    recs.push({ movie, score: candidate.score, reasons: candidate.reasons.slice(0, 2) });
  });

  // Diversity pass: prevent any single creator from dominating the top of the list.
  // Interleave so no primary reason label appears more than twice consecutively.
  const MAX_CONSECUTIVE = 2;
  const diversified: typeof recs = [];
  const reasonCount: Record<string, number> = {};
  const remaining = [...recs];

  while (remaining.length > 0) {
    const idx = remaining.findIndex((r) => {
      const label = r.reasons[0] ?? "";
      return (reasonCount[label] ?? 0) < MAX_CONSECUTIVE;
    });
    if (idx === -1) {
      // All labels at cap — reset counts and drain
      Object.keys(reasonCount).forEach((k) => { reasonCount[k] = 0; });
      continue;
    }
    const [rec] = remaining.splice(idx, 1);
    const label = rec.reasons[0] ?? "";
    reasonCount[label] = (reasonCount[label] ?? 0) + 1;
    diversified.push(rec);
  }

  return NextResponse.json({ recs: diversified, rankedIds: Array.from(rankedIds) });
}
