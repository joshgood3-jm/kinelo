import { NextRequest, NextResponse } from "next/server";

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

// Wikidata SPARQL helper — all results cached 24h by Next.js fetch
// Award QIDs — verified via Wikidata SPARQL 2026-10-30:
// Q102427=Best Picture, Q103916=Best Actor, Q103618=Best Actress
// Q103360=Best Director, Q41417=Best Original Screenplay, Q107258=Best Adapted Screenplay
async function wikidataSparql(sparql: string): Promise<{ tmdbId: number; year: number }[]> {
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
  const res = await fetch(url, {
    headers: { Accept: "application/sparql-results+json", "User-Agent": "Kinelo/1.0 (https://kinelo.vercel.app)" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`Wikidata ${res.status}`);
  const data = await res.json();
  const seen = new Set<number>();
  return (data.results?.bindings ?? [])
    .map((r: Record<string, { value: string }>) => ({
      tmdbId: parseInt(r.tmdbId?.value ?? ""),
      year: r.pubDate?.value ? new Date(r.pubDate.value).getFullYear() : 0,
    }))
    .filter(({ tmdbId }: { tmdbId: number }) => {
      if (!tmdbId || isNaN(tmdbId) || seen.has(tmdbId)) return false;
      seen.add(tmdbId);
      return true;
    });
}

// Best Picture: the film itself receives the award directly
function bestPictureQuery() {
  return `SELECT ?film (SAMPLE(?tmdbId) AS ?tmdbId) (MIN(?pubDate) AS ?pubDate) WHERE {
  ?film wdt:P166 wd:Q102427. ?film wdt:P4947 ?tmdbId. ?film wdt:P577 ?pubDate.
} GROUP BY ?film ORDER BY DESC(?pubDate)`;
}

// Actor/Actress/Director: a person receives the award for a specific film (P1686 qualifier).
// The wdt:P166 truthy anchor narrows the candidate set first via the indexed triple store,
// preventing Blazegraph StackOverflow from scanning all P166 statements globally.
function personAwardQuery(awardId: string) {
  return `SELECT ?film (SAMPLE(?tmdbId) AS ?tmdbId) (MIN(?pubDate) AS ?pubDate) WHERE {
  ?person wdt:P166 wd:${awardId}.
  ?person p:P166 ?stmt. ?stmt ps:P166 wd:${awardId}. ?stmt pq:P1686 ?film.
  ?film wdt:P4947 ?tmdbId. ?film wdt:P577 ?pubDate.
} GROUP BY ?film ORDER BY DESC(?pubDate)`;
}

// Screenplay: combines Best Original Screenplay (Q41417) and Best Adapted Screenplay (Q107258)
function screenplayQuery() {
  return `SELECT ?film (SAMPLE(?tmdbId) AS ?tmdbId) (MIN(?pubDate) AS ?pubDate) WHERE {
  { ?person wdt:P166 wd:Q41417. ?person p:P166 ?stmt. ?stmt ps:P166 wd:Q41417. ?stmt pq:P1686 ?film. }
  UNION
  { ?person wdt:P166 wd:Q107258. ?person p:P166 ?stmt. ?stmt ps:P166 wd:Q107258. ?stmt pq:P1686 ?film. }
  ?film wdt:P4947 ?tmdbId. ?film wdt:P577 ?pubDate.
} GROUP BY ?film ORDER BY DESC(?pubDate)`;
}

function oscarQueryForCategory(cat: string): string | null {
  if (cat === "actor")      return personAwardQuery("Q103916");
  if (cat === "actress")    return personAwardQuery("Q103618");
  if (cat === "director")   return personAwardQuery("Q103360");
  if (cat === "screenplay") return screenplayQuery();
  return null;
}

// Fallback title+year lists — used when Wikidata returns empty/errors (modern era, 1979–2025)
const _ACTOR_BACKUP = [
  { title: "The Brutalist", year: 2024 },         // Adrien Brody
  { title: "Oppenheimer", year: 2023 },            // Cillian Murphy
  { title: "The Whale", year: 2022 },              // Brendan Fraser
  { title: "King Richard", year: 2021 },           // Will Smith
  { title: "The Father", year: 2020 },             // Anthony Hopkins
  { title: "Joker", year: 2019 },                  // Joaquin Phoenix
  { title: "Bohemian Rhapsody", year: 2018 },      // Rami Malek
  { title: "Darkest Hour", year: 2017 },           // Gary Oldman
  { title: "Manchester by the Sea", year: 2016 },  // Casey Affleck
  { title: "The Revenant", year: 2015 },           // Leonardo DiCaprio
  { title: "The Theory of Everything", year: 2014 }, // Eddie Redmayne
  { title: "Dallas Buyers Club", year: 2013 },     // Matthew McConaughey
  { title: "Lincoln", year: 2012 },                // Daniel Day-Lewis
  { title: "The Artist", year: 2011 },             // Jean Dujardin
  { title: "The King's Speech", year: 2010 },      // Colin Firth
  { title: "Crazy Heart", year: 2009 },            // Jeff Bridges
  { title: "Milk", year: 2008 },                   // Sean Penn
  { title: "There Will Be Blood", year: 2007 },    // Daniel Day-Lewis
  { title: "The Last King of Scotland", year: 2006 }, // Forest Whitaker
  { title: "Capote", year: 2005 },                 // Philip Seymour Hoffman
  { title: "Ray", year: 2004 },                    // Jamie Foxx
  { title: "Mystic River", year: 2003 },           // Sean Penn
  { title: "The Pianist", year: 2002 },            // Adrien Brody
  { title: "Training Day", year: 2001 },           // Denzel Washington
  { title: "Gladiator", year: 2000 },              // Russell Crowe
  { title: "American Beauty", year: 1999 },        // Kevin Spacey
  { title: "Life Is Beautiful", year: 1997 },      // Roberto Benigni
  { title: "As Good as It Gets", year: 1997 },     // Jack Nicholson
  { title: "Shine", year: 1996 },                  // Geoffrey Rush
  { title: "Leaving Las Vegas", year: 1995 },      // Nicolas Cage
  { title: "Forrest Gump", year: 1994 },           // Tom Hanks
  { title: "Philadelphia", year: 1993 },           // Tom Hanks
  { title: "Scent of a Woman", year: 1992 },       // Al Pacino
  { title: "The Silence of the Lambs", year: 1991 }, // Anthony Hopkins
  { title: "Reversal of Fortune", year: 1990 },    // Jeremy Irons
  { title: "My Left Foot", year: 1989 },           // Daniel Day-Lewis
  { title: "Rain Man", year: 1988 },               // Dustin Hoffman
  { title: "Wall Street", year: 1987 },            // Michael Douglas
  { title: "The Color of Money", year: 1986 },     // Paul Newman
  { title: "Kiss of the Spider Woman", year: 1985 }, // William Hurt
  { title: "Amadeus", year: 1984 },                // F. Murray Abraham
  { title: "Tender Mercies", year: 1983 },         // Robert Duvall
  { title: "Gandhi", year: 1982 },                 // Ben Kingsley
  { title: "On Golden Pond", year: 1981 },         // Henry Fonda
  { title: "Raging Bull", year: 1980 },            // Robert De Niro
  { title: "Kramer vs. Kramer", year: 1979 },      // Dustin Hoffman
];

const _ACTRESS_BACKUP = [
  { title: "The Substance", year: 2024 },          // Demi Moore
  { title: "Poor Things", year: 2023 },            // Emma Stone
  { title: "Tár", year: 2022 },                    // Cate Blanchett
  { title: "The Eyes of Tammy Faye", year: 2021 }, // Jessica Chastain
  { title: "Nomadland", year: 2020 },              // Frances McDormand
  { title: "Judy", year: 2019 },                   // Renée Zellweger
  { title: "The Favourite", year: 2018 },          // Olivia Colman
  { title: "Three Billboards Outside Ebbing, Missouri", year: 2017 }, // Frances McDormand
  { title: "La La Land", year: 2016 },             // Emma Stone
  { title: "Room", year: 2015 },                   // Brie Larson
  { title: "Still Alice", year: 2014 },            // Julianne Moore
  { title: "Blue Jasmine", year: 2013 },           // Cate Blanchett
  { title: "Silver Linings Playbook", year: 2012 }, // Jennifer Lawrence
  { title: "The Iron Lady", year: 2011 },          // Meryl Streep
  { title: "Black Swan", year: 2010 },             // Natalie Portman
  { title: "The Blind Side", year: 2009 },         // Sandra Bullock
  { title: "The Reader", year: 2008 },             // Kate Winslet
  { title: "La Vie en Rose", year: 2007 },         // Marion Cotillard
  { title: "The Queen", year: 2006 },              // Helen Mirren
  { title: "Walk the Line", year: 2005 },          // Reese Witherspoon
  { title: "Million Dollar Baby", year: 2004 },    // Hilary Swank
  { title: "Monster", year: 2003 },               // Charlize Theron
  { title: "The Hours", year: 2002 },              // Nicole Kidman
  { title: "Monster's Ball", year: 2001 },         // Halle Berry
  { title: "Erin Brockovich", year: 2000 },        // Julia Roberts
  { title: "Boys Don't Cry", year: 1999 },         // Hilary Swank
  { title: "Shakespeare in Love", year: 1998 },    // Gwyneth Paltrow
  { title: "As Good as It Gets", year: 1997 },     // Helen Hunt
  { title: "Fargo", year: 1996 },                  // Frances McDormand
  { title: "Dead Man Walking", year: 1995 },       // Susan Sarandon
  { title: "Blue Sky", year: 1994 },               // Jessica Lange
  { title: "The Piano", year: 1993 },              // Holly Hunter
  { title: "Howards End", year: 1992 },            // Emma Thompson
  { title: "The Silence of the Lambs", year: 1991 }, // Jodie Foster
  { title: "Misery", year: 1990 },                 // Kathy Bates
  { title: "Driving Miss Daisy", year: 1989 },     // Jessica Tandy
  { title: "The Accused", year: 1988 },            // Jodie Foster
  { title: "Moonstruck", year: 1987 },             // Cher
  { title: "Children of a Lesser God", year: 1986 }, // Marlee Matlin
  { title: "The Trip to Bountiful", year: 1985 },  // Geraldine Page
  { title: "Places in the Heart", year: 1984 },    // Sally Field
  { title: "Terms of Endearment", year: 1983 },    // Shirley MacLaine
  { title: "Sophie's Choice", year: 1982 },        // Meryl Streep
  { title: "On Golden Pond", year: 1981 },         // Katharine Hepburn
  { title: "Coal Miner's Daughter", year: 1980 },  // Sissy Spacek
  { title: "Norma Rae", year: 1979 },              // Sally Field
];

const _DIRECTOR_BACKUP = [
  { title: "Anora", year: 2024 },                  // Sean Baker
  { title: "Oppenheimer", year: 2023 },            // Christopher Nolan
  { title: "Everything Everywhere All at Once", year: 2022 }, // Daniels
  { title: "The Power of the Dog", year: 2021 },   // Jane Campion
  { title: "Nomadland", year: 2020 },              // Chloé Zhao
  { title: "Parasite", year: 2019 },               // Bong Joon-ho
  { title: "Roma", year: 2018 },                   // Alfonso Cuarón
  { title: "The Shape of Water", year: 2017 },     // Guillermo del Toro
  { title: "La La Land", year: 2016 },             // Damien Chazelle
  { title: "The Revenant", year: 2015 },           // Alejandro G. Iñárritu
  { title: "Birdman", year: 2014 },                // Alejandro G. Iñárritu
  { title: "Gravity", year: 2013 },                // Alfonso Cuarón
  { title: "Life of Pi", year: 2012 },             // Ang Lee
  { title: "The Artist", year: 2011 },             // Michel Hazanavicius
  { title: "The King's Speech", year: 2010 },      // Tom Hooper
  { title: "The Hurt Locker", year: 2008 },        // Kathryn Bigelow
  { title: "Slumdog Millionaire", year: 2008 },    // Danny Boyle
  { title: "No Country for Old Men", year: 2007 }, // Coen Brothers
  { title: "The Departed", year: 2006 },           // Martin Scorsese
  { title: "Brokeback Mountain", year: 2005 },     // Ang Lee
  { title: "Million Dollar Baby", year: 2004 },    // Clint Eastwood
  { title: "The Lord of the Rings: The Return of the King", year: 2003 }, // Peter Jackson
  { title: "The Pianist", year: 2002 },            // Roman Polanski
  { title: "A Beautiful Mind", year: 2001 },       // Ron Howard
  { title: "Traffic", year: 2000 },                // Steven Soderbergh
  { title: "American Beauty", year: 1999 },        // Sam Mendes
  { title: "Saving Private Ryan", year: 1998 },    // Steven Spielberg
  { title: "Titanic", year: 1997 },                // James Cameron
  { title: "The English Patient", year: 1996 },    // Anthony Minghella
  { title: "Braveheart", year: 1995 },             // Mel Gibson
  { title: "Forrest Gump", year: 1994 },           // Robert Zemeckis
  { title: "Schindler's List", year: 1993 },       // Steven Spielberg
  { title: "Unforgiven", year: 1992 },             // Clint Eastwood
  { title: "The Silence of the Lambs", year: 1991 }, // Jonathan Demme
  { title: "Dances with Wolves", year: 1990 },     // Kevin Costner
  { title: "Born on the Fourth of July", year: 1989 }, // Oliver Stone
  { title: "Rain Man", year: 1988 },               // Barry Levinson
  { title: "The Last Emperor", year: 1987 },       // Bernardo Bertolucci
  { title: "Platoon", year: 1986 },                // Oliver Stone
  { title: "Out of Africa", year: 1985 },          // Sydney Pollack
  { title: "Amadeus", year: 1984 },                // Miloš Forman
  { title: "Terms of Endearment", year: 1983 },    // James L. Brooks
  { title: "Gandhi", year: 1982 },                 // Richard Attenborough
  { title: "Reds", year: 1981 },                   // Warren Beatty
  { title: "Ordinary People", year: 1980 },        // Robert Redford
  { title: "Kramer vs. Kramer", year: 1979 },      // Robert Benton
];

// Combined Original + Adapted Screenplay winners (deduplicated)
const _SCREENPLAY_BACKUP = [
  // Original
  { title: "Anora", year: 2024 },
  { title: "Anatomy of a Fall", year: 2023 },
  { title: "Everything Everywhere All at Once", year: 2022 },
  { title: "Belfast", year: 2021 },
  { title: "Promising Young Woman", year: 2020 },
  { title: "Parasite", year: 2019 },
  { title: "Green Book", year: 2018 },
  { title: "Get Out", year: 2017 },
  { title: "Manchester by the Sea", year: 2016 },
  { title: "Spotlight", year: 2015 },
  { title: "Birdman", year: 2014 },
  { title: "Her", year: 2013 },
  { title: "Django Unchained", year: 2012 },
  { title: "Midnight in Paris", year: 2011 },
  { title: "The King's Speech", year: 2010 },
  { title: "Milk", year: 2008 },
  { title: "Juno", year: 2007 },
  { title: "Little Miss Sunshine", year: 2006 },
  { title: "Eternal Sunshine of the Spotless Mind", year: 2004 },
  { title: "Lost in Translation", year: 2003 },
  { title: "Talk to Her", year: 2002 },
  { title: "Gosford Park", year: 2001 },
  { title: "American Beauty", year: 1999 },
  { title: "Shakespeare in Love", year: 1998 },
  { title: "Good Will Hunting", year: 1997 },
  { title: "Fargo", year: 1996 },
  { title: "The Usual Suspects", year: 1995 },
  { title: "Pulp Fiction", year: 1994 },
  { title: "The Piano", year: 1993 },
  { title: "The Crying Game", year: 1992 },
  { title: "Ghost", year: 1990 },
  { title: "Dead Poets Society", year: 1989 },
  { title: "Moonstruck", year: 1987 },
  { title: "Hannah and Her Sisters", year: 1986 },
  { title: "Witness", year: 1985 },
  { title: "Tender Mercies", year: 1983 },
  { title: "Chariots of Fire", year: 1981 },
  // Adapted
  { title: "Conclave", year: 2024 },
  { title: "Oppenheimer", year: 2023 },
  { title: "Women Talking", year: 2022 },
  { title: "CODA", year: 2021 },
  { title: "The Father", year: 2020 },
  { title: "Jojo Rabbit", year: 2019 },
  { title: "BlacKkKlansman", year: 2018 },
  { title: "Call Me by Your Name", year: 2017 },
  { title: "Moonlight", year: 2016 },
  { title: "The Big Short", year: 2015 },
  { title: "The Imitation Game", year: 2014 },
  { title: "12 Years a Slave", year: 2013 },
  { title: "Argo", year: 2012 },
  { title: "The Descendants", year: 2011 },
  { title: "The Social Network", year: 2010 },
  { title: "Slumdog Millionaire", year: 2008 },
  { title: "No Country for Old Men", year: 2007 },
  { title: "The Departed", year: 2006 },
  { title: "Brokeback Mountain", year: 2005 },
  { title: "Sideways", year: 2004 },
  { title: "The Lord of the Rings: The Return of the King", year: 2003 },
  { title: "The Pianist", year: 2002 },
  { title: "A Beautiful Mind", year: 2001 },
  { title: "Traffic", year: 2000 },
  { title: "Gods and Monsters", year: 1998 },
  { title: "L.A. Confidential", year: 1997 },
  { title: "Sense and Sensibility", year: 1995 },
  { title: "Schindler's List", year: 1993 },
  { title: "The Silence of the Lambs", year: 1991 },
  { title: "Dances with Wolves", year: 1990 },
  { title: "Driving Miss Daisy", year: 1989 },
  { title: "Dangerous Liaisons", year: 1988 },
  { title: "The Last Emperor", year: 1987 },
  { title: "Out of Africa", year: 1985 },
  { title: "Amadeus", year: 1984 },
  { title: "On Golden Pond", year: 1981 },
  { title: "Ordinary People", year: 1980 },
  { title: "Kramer vs. Kramer", year: 1979 },
];

function oscarBackupForCategory(cat: string) {
  if (cat === "actor")      return _ACTOR_BACKUP;
  if (cat === "actress")    return _ACTRESS_BACKUP;
  if (cat === "director")   return _DIRECTOR_BACKUP;
  if (cat === "screenplay") return _SCREENPLAY_BACKUP;
  return [];
}

async function searchByTitleYear(list: { title: string; year: number }[]) {
  const seen = new Set<number>();
  const results = await Promise.all(
    list.map(async ({ title, year }) => {
      try {
        const data = await tmdb("/search/movie", { query: title, year: String(year), include_adult: "false" });
        const hit = data.results?.[0];
        if (!hit || seen.has(hit.id)) return null;
        seen.add(hit.id);
        return { id: hit.id, title: hit.title, poster_path: hit.poster_path, release_date: hit.release_date };
      } catch { return null; }
    })
  );
  return results.filter(Boolean);
}

// Kept as fallback for Best Picture (Wikidata) — title+year list
const _OSCAR_BACKUP = [
  { title: "One Battle After Another", year: 2025 },
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

export async function GET(req: NextRequest) {
  const oscar = req.nextUrl.searchParams.get("oscar");

  // On-demand Oscar category (actor/actress/director/screenplay) — fetched lazily by the UI
  if (oscar) {
    const sparql = oscarQueryForCategory(oscar);
    if (!sparql) return NextResponse.json({ results: [] });

    try {
      const winners = await wikidataSparql(sparql);
      if (winners.length > 0) {
        const movies = await Promise.all(winners.map(({ tmdbId }) => tmdb(`/movie/${tmdbId}`).catch(() => null)));
        return NextResponse.json({ results: movies.filter(Boolean) });
      }
    } catch { /* fall through to backup */ }

    // Fallback: title+year TMDB search
    const backup = oscarBackupForCategory(oscar);
    const movies = await searchByTitleYear(backup);
    return NextResponse.json({ results: movies });
  }

  // Default: IMDb + RS + Best Picture
  const uniqueImdb = [...new Set(IMDB_IDS)];
  const uniqueRs = [...new Set(ROLLING_STONE_IDS)];

  const oscarPromise = wikidataSparql(bestPictureQuery())
    .then((winners) =>
      Promise.all(winners.map(({ tmdbId }) => tmdb(`/movie/${tmdbId}`).catch(() => null)))
    )
    .catch(async () =>
      Promise.all(
        _OSCAR_BACKUP.map(async ({ title, year }) => {
          try {
            const data = await tmdb("/search/movie", { query: title, year: String(year), include_adult: "false" });
            const hit = data.results?.[0];
            return hit ? { id: hit.id, title: hit.title, poster_path: hit.poster_path, release_date: hit.release_date } : null;
          } catch { return null; }
        })
      )
    );

  const [imdbMovies, rsMovies, oscarMovies] = await Promise.all([
    Promise.all(uniqueImdb.map((id) => tmdb(`/movie/${id}`).catch(() => null))),
    Promise.all(uniqueRs.map((id) => tmdb(`/movie/${id}`).catch(() => null))),
    oscarPromise,
  ]);

  return NextResponse.json({
    imdb: imdbMovies.filter(Boolean).slice(0, 100),
    rollingStone: rsMovies.filter(Boolean).slice(0, 100),
    oscars: oscarMovies.filter(Boolean),
  });
}
