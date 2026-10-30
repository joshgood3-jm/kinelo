import { searchMovies } from "@/lib/tmdb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ results: [] });
  try {
    const data = await searchMovies(q);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
