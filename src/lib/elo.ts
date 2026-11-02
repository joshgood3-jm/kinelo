const INITIAL_ELO = 1000;
const K_FACTOR = 32;

// Map half-star rating (0.5–5) to a percentile of the user's current list.
// 1★ = 10th, 3★ = 50th, 5★ = 90th — linear between those anchors.
export function starsToPercentile(stars: number): number {
  return Math.max(0.02, Math.min(0.98, (stars * 2 - 1) / 10));
}

// Interpolate an ELO from a list of ELO scores at the given percentile.
export function percentileElo(percentile: number, elos: number[]): number {
  if (elos.length === 0) return INITIAL_ELO;
  const sorted = [...elos].sort((a, b) => a - b);
  const idx = percentile * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(Math.ceil(idx), sorted.length - 1);
  if (lo === hi) return sorted[lo];
  return Math.round(sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]));
}

// Star rating → ELO anchored to the user's actual list distribution.
// Falls back to INITIAL_ELO for new users with no movies yet.
export function starsToListElo(stars: number, currentElos: number[]): number {
  return percentileElo(starsToPercentile(stars), currentElos);
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
