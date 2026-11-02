const INITIAL_ELO = 1000;
const K_FACTOR = 32;

// Map whole stars (1–5) to a seeded ELO. 3★ = 1000 (average), spread ±250.
export function starsToElo(stars: number): number {
  const map: Record<number, number> = { 1: 500, 2: 750, 3: 1000, 4: 1250, 5: 1500 };
  return map[stars] ?? INITIAL_ELO;
}

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function newRatings(
  winnerRating: number,
  loserRating: number
): { winner: number; loser: number } {
  const expectedWinner = expectedScore(winnerRating, loserRating);
  const expectedLoser = expectedScore(loserRating, winnerRating);
  return {
    winner: Math.round(winnerRating + K_FACTOR * (1 - expectedWinner)),
    loser: Math.round(loserRating + K_FACTOR * (0 - expectedLoser)),
  };
}

export { INITIAL_ELO };
