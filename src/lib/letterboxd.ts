// Map Letterboxd star rating (0.5–5) to a seeded ELO score.
// Aligned with starsToElo in elo.ts: 3★ = 1000, spread ±250 per whole star.
export function ratingToElo(rating: number): number {
  const map: Record<number, number> = {
    0.5: 375,
    1:   500,
    1.5: 625,
    2:   750,
    2.5: 875,
    3:   1000,
    3.5: 1125,
    4:   1250,
    4.5: 1375,
    5:   1500,
  };
  return map[Math.round(rating * 2) / 2] ?? 1000;
}

export function starsDisplay(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return "★".repeat(full) + (half ? "½" : "");
}

export interface LetterboxdFilm {
  title: string;
  year: number | null;
  rating: number | null; // 0.5–5
  tmdbId: number | null;
  isRewatch: boolean;
  letterboxdUri?: string;
}

// Parse Letterboxd diary RSS feed XML
export function parseDiaryRss(xml: string): LetterboxdFilm[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.map((item) => {
    const title = item.match(/<letterboxd:filmTitle><!\[CDATA\[([^\]]+)\]\]><\/letterboxd:filmTitle>|<letterboxd:filmTitle>([^<]+)<\/letterboxd:filmTitle>/)?.[1]
      ?? item.match(/<letterboxd:filmTitle>([^<]+)<\/letterboxd:filmTitle>/)?.[1]
      ?? "";
    const yearStr = item.match(/<letterboxd:filmYear>(\d+)<\/letterboxd:filmYear>/)?.[1];
    const ratingStr = item.match(/<letterboxd:memberRating>([\d.]+)<\/letterboxd:memberRating>/)?.[1];
    const tmdbStr = item.match(/<tmdb:movieId>(\d+)<\/tmdb:movieId>/)?.[1];
    const uri = item.match(/<letterboxd:filmUri>([^<]+)<\/letterboxd:filmUri>/)?.[1];
    const rewatchStr = item.match(/<letterboxd:rewatch>([^<]+)<\/letterboxd:rewatch>/)?.[1];

    const fallbackTitle = item.match(/<title><!\[CDATA\[([^,\]]+)/)?.[1]?.trim()
      ?? item.match(/<title>([^,<]+)/)?.[1]?.trim()
      ?? "";

    return {
      title: title || fallbackTitle,
      year: yearStr ? parseInt(yearStr) : null,
      rating: ratingStr ? parseFloat(ratingStr) : null,
      tmdbId: tmdbStr ? parseInt(tmdbStr) : null,
      isRewatch: rewatchStr === "Yes",
      letterboxdUri: uri,
    };
  }).filter((f) => f.title);
}

// Parse Letterboxd ratings.csv export
// CSV header: Date,Name,Year,Letterboxd URI,Rating
export function parseRatingsCsv(csv: string): LetterboxdFilm[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase();
  const isRatingsFormat = header.includes("rating");

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    if (isRatingsFormat) {
      return {
        title: cols[1]?.trim() ?? "",
        year: cols[2] ? parseInt(cols[2]) : null,
        rating: cols[4] ? parseFloat(cols[4]) : null,
        tmdbId: null,
        isRewatch: false,
        letterboxdUri: cols[3]?.trim(),
      };
    }
    return {
      title: cols[1]?.trim() ?? "",
      year: cols[2] ? parseInt(cols[2]) : null,
      rating: null,
      tmdbId: null,
      isRewatch: false,
      letterboxdUri: cols[3]?.trim(),
    };
  }).filter((f) => f.title);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(current); current = ""; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}
