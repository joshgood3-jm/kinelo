const INITIAL_ELO = 1000;
const K_FACTOR = 32;

// Map half-star rating (0.5–5) to a seeded ELO. 3★ = 1000, ±250 per whole star.
// Aligned with ratingToElo in letterboxd.ts so imports and manual ratings share the same scale.
export function starsToElo(stars: number): number {
  return Math.round(1000 + (stars - 3) * 250);
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
