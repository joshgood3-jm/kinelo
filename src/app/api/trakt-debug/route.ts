import { NextResponse } from "next/server";

export async function GET() {
  const TRAKT_KEY = process.env.TRAKT_API_KEY;

  if (!TRAKT_KEY) {
    return NextResponse.json({ error: "TRAKT_API_KEY not set" });
  }

  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "trakt-api-version": "2",
    "trakt-api-key": TRAKT_KEY,
  };

  // Test 1: search for The Social Network by TMDB ID
  const searchRes = await fetch("https://api.trakt.tv/search/tmdb/37799?type=movie", { headers });
  const searchStatus = searchRes.status;
  const searchContentType = searchRes.headers.get("content-type");
  const searchText = await searchRes.text();

  let searchJson = null;
  try { searchJson = JSON.parse(searchText); } catch { /* not json */ }

  // Test 2: related movies
  let relatedStatus = null;
  let relatedText = null;
  let relatedJson = null;
  if (searchJson?.[0]?.movie?.ids?.slug) {
    const slug = searchJson[0].movie.ids.slug;
    const relRes = await fetch(`https://api.trakt.tv/movies/${slug}/related?limit=5`, { headers });
    relatedStatus = relRes.status;
    relatedText = await relRes.text();
    try { relatedJson = JSON.parse(relatedText); } catch { /* not json */ }
  }

  return NextResponse.json({
    keyPresent: !!TRAKT_KEY,
    keyPrefix: TRAKT_KEY.slice(0, 6),
    search: { status: searchStatus, contentType: searchContentType, isJson: !!searchJson, preview: searchText.slice(0, 200) },
    related: { status: relatedStatus, isJson: !!relatedJson, preview: relatedText?.slice(0, 200) },
  });
}
