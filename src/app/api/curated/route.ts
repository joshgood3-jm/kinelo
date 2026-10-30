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

// Oscar Best Picture winners (title, release year)
const OSCAR_WINNERS = [
  { title: "Anora", year: 2024 },
  { title: "Oppenheimer", year: 2023 },
  { title: "Everything Everywhere All at Once", year: 2022 },
  { title: "CODA", year: 2021 },
  { title: "Nomadland", year: 2020 },
  { title: "Parasite", year: 2019 },
  { title: "Green Book", year: 2018 },
  { title: "The Shape of Water", year: 2017 },
  { title: "Moonlight", year: 2016 },
  { title: "Spotlight", year: 2015 },
  { title: "Birdman", year: 2014 },
  { title: "12 Years a Slave", year: 2013 },
  { title: "Argo", year: 2012 },
  { title: "The Artist", year: 2011 },
  { title: "The King's Speech", year: 2010 },
  { title: "The Hurt Locker", year: 2008 },
  { title: "Slumdog Millionaire", year: 2008 },
  { title: "No Country for Old Men", year: 2007 },
  { title: "The Departed", year: 2006 },
  { title: "Crash", year: 2004 },
  { title: "Million Dollar Baby", year: 2004 },
  { title: "The Lord of the Rings: The Return of the King", year: 2003 },
  { title: "Chicago", year: 2002 },
  { title: "A Beautiful Mind", year: 2001 },
  { title: "Gladiator", year: 2000 },
  { title: "American Beauty", year: 1999 },
  { title: "Shakespeare in Love", year: 1998 },
  { title: "Titanic", year: 1997 },
  { title: "The English Patient", year: 1996 },
  { title: "Braveheart", year: 1995 },
  { title: "Forrest Gump", year: 1994 },
  { title: "Schindler's List", year: 1993 },
  { title: "Unforgiven", year: 1992 },
  { title: "The Silence of the Lambs", year: 1991 },
  { title: "Dances with Wolves", year: 1990 },
  { title: "Driving Miss Daisy", year: 1989 },
  { title: "Rain Man", year: 1988 },
  { title: "The Last Emperor", year: 1987 },
  { title: "Platoon", year: 1986 },
  { title: "Out of Africa", year: 1985 },
  { title: "Amadeus", year: 1984 },
  { title: "Terms of Endearment", year: 1983 },
  { title: "Gandhi", year: 1982 },
  { title: "Chariots of Fire", year: 1981 },
  { title: "Ordinary People", year: 1980 },
  { title: "Kramer vs. Kramer", year: 1979 },
  { title: "The Deer Hunter", year: 1978 },
  { title: "Annie Hall", year: 1977 },
  { title: "Rocky", year: 1976 },
  { title: "One Flew Over the Cuckoo's Nest", year: 1975 },
  { title: "The Godfather Part II", year: 1974 },
  { title: "The Sting", year: 1973 },
  { title: "The Godfather", year: 1972 },
  { title: "The French Connection", year: 1971 },
  { title: "Patton", year: 1970 },
  { title: "Midnight Cowboy", year: 1969 },
  { title: "Oliver!", year: 1968 },
  { title: "In the Heat of the Night", year: 1967 },
  { title: "A Man for All Seasons", year: 1966 },
  { title: "The Sound of Music", year: 1965 },
  { title: "My Fair Lady", year: 1964 },
  { title: "Tom Jones", year: 1963 },
  { title: "Lawrence of Arabia", year: 1962 },
  { title: "West Side Story", year: 1961 },
  { title: "The Apartment", year: 1960 },
  { title: "Ben-Hur", year: 1959 },
  { title: "Gigi", year: 1958 },
  { title: "The Bridge on the River Kwai", year: 1957 },
  { title: "Around the World in Eighty Days", year: 1956 },
  { title: "Marty", year: 1955 },
  { title: "On the Waterfront", year: 1954 },
  { title: "From Here to Eternity", year: 1953 },
  { title: "The Greatest Show on Earth", year: 1952 },
  { title: "An American in Paris", year: 1951 },
  { title: "All About Eve", year: 1950 },
  { title: "All the King's Men", year: 1949 },
  { title: "Hamlet", year: 1948 },
  { title: "Gentleman's Agreement", year: 1947 },
  { title: "The Best Years of Our Lives", year: 1946 },
  { title: "Going My Way", year: 1944 },
  { title: "Casablanca", year: 1942 },
  { title: "Mrs. Miniver", year: 1942 },
  { title: "How Green Was My Valley", year: 1941 },
  { title: "Rebecca", year: 1940 },
  { title: "Gone with the Wind", year: 1939 },
  { title: "You Can't Take It with You", year: 1938 },
  { title: "The Life of Emile Zola", year: 1937 },
  { title: "The Great Ziegfeld", year: 1936 },
  { title: "Mutiny on the Bounty", year: 1935 },
  { title: "It Happened One Night", year: 1934 },
  { title: "Cavalcade", year: 1933 },
  { title: "Grand Hotel", year: 1932 },
  { title: "Cimarron", year: 1931 },
  { title: "All Quiet on the Western Front", year: 1930 },
  { title: "The Broadway Melody", year: 1929 },
  { title: "Wings", year: 1927 },
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

  // Oscar winners: search by title+year for accuracy
  const oscarMovies = await Promise.all(
    OSCAR_WINNERS.map(async ({ title, year }) => {
      try {
        const data = await tmdb("/search/movie", { query: title, year: String(year), include_adult: "false" });
        const hit = data.results?.[0];
        return hit ? { id: hit.id, title: hit.title, poster_path: hit.poster_path, release_date: hit.release_date } : null;
      } catch {
        return null;
      }
    })
  );

  return NextResponse.json({
    imdb: imdbMovies.filter(Boolean).slice(0, 100),
    rottenTomatoes: rtMovies.slice(0, 100),
    rollingStone: rsMovies.filter(Boolean).slice(0, 100),
    oscars: oscarMovies.filter(Boolean),
  });
}
