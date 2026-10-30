import { NextResponse } from "next/server";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";

async function tmdb(path: string, params: Record<string, string> = {}) {
  const q = new URLSearchParams({ api_key: TMDB_KEY!, ...params });
  const res = await fetch(`${BASE}${path}?${q}`, { next: { revalidate: 86400 } });
  return res.json();
}

// IMDb Top 100 — TMDB IDs (based on IMDb Top 250 rankings)
const IMDB_IDS = [
  278,    // The Shawshank Redemption
  238,    // The Godfather
  155,    // The Dark Knight
  240,    // The Godfather Part II
  389,    // 12 Angry Men
  424,    // Schindler's List
  122,    // The Return of the King
  680,    // Pulp Fiction
  120,    // The Fellowship of the Ring
  1725,   // The Good, the Bad and the Ugly
  550,    // Fight Club
  13,     // Forrest Gump
  27205,  // Inception
  121,    // The Two Towers
  274,    // The Silence of the Lambs
  769,    // GoodFellas
  603,    // The Matrix
  11,     // Star Wars: A New Hope
  157336, // Interstellar
  1366,   // One Flew Over the Cuckoo's Nest
  637,    // Life Is Beautiful
  598,    // City of God
  129,    // Spirited Away
  539,    // Psycho
  1092,   // The Pianist
  105,    // Back to the Future
  244786, // Whiplash
  1124,   // The Prestige
  98,     // Gladiator
  14,     // American Beauty
  1422,   // The Departed
  489,    // Good Will Hunting
  28,     // Apocalypse Now
  629,    // The Usual Suspects
  348,    // Alien
  862,    // Toy Story
  11216,  // Cinema Paradiso
  77,     // Memento
  935,    // Dr. Strangelove
  426,    // Vertigo
  10681,  // WALL-E
  62,     // 2001: A Space Odyssey
  289,    // Casablanca
  670,    // Oldboy
  85,     // Raiders of the Lost Ark
  387,    // Das Boot
  3476,   // The Lives of Others
  68718,  // Django Unchained
  1574,   // Rear Window
  197,    // Braveheart
  453,    // A Beautiful Mind
  354912, // Coco
  641,    // Requiem for a Dream
  475557, // Joker
  6977,   // No Country for Old Men
  949,    // Heat
  694,    // The Shining
  600,    // Full Metal Jacket
  1580,   // To Kill a Mockingbird
  809,    // Lawrence of Arabia
  1947,   // Chinatown
  872,    // Singin' in the Rain
  279,    // Amadeus
  496243, // Parasite
  37165,  // The Truman Show
  807,    // Se7en
  872585, // Oppenheimer
  185,    // A Clockwork Orange
  1891,   // The Empire Strikes Back
  120467, // The Grand Budapest Hotel
  1018,   // Mulholland Drive
  1950,   // Pan's Labyrinth
  38,     // Eternal Sunshine of the Spotless Mind
  10193,  // Toy Story 3
  627,    // Trainspotting
  78,     // Blade Runner
  157354, // The Hunt
  313369, // La La Land
  76203,  // 12 Years a Slave
  106646, // The Wolf of Wall Street
  150540, // Inside Out
  275,    // Fargo
  263115, // Logan
  346,    // Seven Samurai
  213,    // Once Upon a Time in the West
  80,     // Before Sunset
  11798,  // Before Sunrise
  194,    // Amélie
  153,    // Lost in Translation
  73,     // American History X
  1247,   // It's a Wonderful Life
  857,    // Saving Private Ryan
  497,    // The Green Mile
  280,    // Terminator 2
  14160,  // Up
  9693,   // Children of Men
  7345,   // There Will Be Blood
  419430, // Get Out
  376867, // Moonlight
  76341,  // Mad Max: Fury Road
  152601, // Her
  37799,  // The Social Network
  16869,  // Inglourious Basterds
];

// Rolling Stone 100 Greatest Films — TMDB IDs
const ROLLING_STONE_IDS = [
  238,    // The Godfather
  15,     // Citizen Kane
  62,     // 2001: A Space Odyssey
  539,    // Psycho
  1947,   // Chinatown
  28,     // Apocalypse Now
  935,    // Dr. Strangelove
  289,    // Casablanca
  426,    // Vertigo
  1367,   // Raging Bull
  103,    // Taxi Driver
  430,    // Bicycle Thieves
  843,    // 8½
  5765,   // Sunset Boulevard
  424,    // Schindler's List
  769,    // GoodFellas
  694,    // The Shining
  7085,   // Network
  703,    // Annie Hall
  630,    // The Wizard of Oz
  872,    // Singin' in the Rain
  240,    // The Godfather Part II
  77,     // Memento
  389,    // 12 Angry Men
  278,    // The Shawshank Redemption
  637,    // Life Is Beautiful
  129,    // Spirited Away
  13,     // Forrest Gump
  3172,   // Some Like It Hot
  809,    // Lawrence of Arabia
  78,     // Blade Runner
  1574,   // Rear Window
  7229,   // The Rules of the Game
  13576,  // Tokyo Story
  346,    // Seven Samurai
  213,    // Once Upon a Time in the West
  185,    // A Clockwork Orange
  1813,   // Do the Right Thing
  601,    // E.T. the Extra-Terrestrial
  85,     // Raiders of the Lost Ark
  1018,   // Mulholland Drive
  603,    // The Matrix
  38,     // Eternal Sunshine of the Spotless Mind
  274,    // The Silence of the Lambs
  348,    // Alien
  11,     // Star Wars: A New Hope
  279,    // Amadeus
  9659,   // Platoon
  600,    // Full Metal Jacket
  1950,   // Pan's Labyrinth
  9693,   // Children of Men
  7345,   // There Will Be Blood
  6977,   // No Country for Old Men
  27205,  // Inception
  496243, // Parasite
  419430, // Get Out
  376867, // Moonlight
  76341,  // Mad Max: Fury Road
  209112, // Boyhood
  76203,  // 12 Years a Slave
  152601, // Her
  37799,  // The Social Network
  16869,  // Inglourious Basterds
  1422,   // The Departed
  10681,  // WALL-E
  862,    // Toy Story
  14160,  // Up
  275,    // Fargo
  11798,  // Before Sunrise
  153,    // Lost in Translation
  194,    // Amélie
  10539,  // In the Mood for Love
  1365,   // Crouching Tiger, Hidden Dragon
  8204,   // Talk to Her
  12477,  // 4 Months, 3 Weeks and 2 Days
  26510,  // The White Ribbon
  72630,  // A Separation
  510251, // Roma
  494799, // The Favourite
  155,    // The Dark Knight
  680,    // Pulp Fiction
  550,    // Fight Club
  120,    // The Fellowship of the Ring
  1725,   // The Good, the Bad and the Ugly
  197,    // Braveheart
  857,    // Saving Private Ryan
  629,    // The Usual Suspects
  807,    // Se7en
  489,    // Good Will Hunting
  627,    // Trainspotting
  73,     // American History X
  1124,   // The Prestige
  872585, // Oppenheimer
  313369, // La La Land
  120467, // The Grand Budapest Hotel
  244786, // Whiplash
  106646, // The Wolf of Wall Street
  475557, // Joker
  14,     // American Beauty
  37165,  // The Truman Show
  598,    // City of God
  670,    // Oldboy
];

export async function GET() {
  // For RT: fetch 5 pages of TMDB top_rated = 100 movies
  const rtPages = await Promise.all(
    [1, 2, 3, 4, 5].map((page) =>
      tmdb("/movie/top_rated", { language: "en-US", page: String(page) })
    )
  );
  const rtMovies = rtPages.flatMap((p) => p.results ?? []).slice(0, 100);

  // For IMDb + RS: fetch each by ID in parallel
  const uniqueImdb = [...new Set(IMDB_IDS)];
  const uniqueRs = [...new Set(ROLLING_STONE_IDS)];

  const [imdbMovies, rsMovies] = await Promise.all([
    Promise.all(uniqueImdb.map((id) => tmdb(`/movie/${id}`).catch(() => null))),
    Promise.all(uniqueRs.map((id) => tmdb(`/movie/${id}`).catch(() => null))),
  ]);

  return NextResponse.json({
    imdb: imdbMovies.filter(Boolean).slice(0, 100),
    rottenTomatoes: rtMovies.slice(0, 100),
    rollingStone: rsMovies.filter(Boolean).slice(0, 100),
  });
}
