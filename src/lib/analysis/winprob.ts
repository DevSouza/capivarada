import type { Color, Score } from "../types";

const K = 0.00368208;
const CP_LIMIT = 1000;

function fromCp(cp: number): number {
  const clamped = Math.max(-CP_LIMIT, Math.min(CP_LIMIT, cp));
  return 1 / (1 + Math.exp(-K * clamped));
}

/** Pontos esperados (0..1) para `color`; mate vale 1 ou 0. */
export function expectedPoints(score: Score, color: Color): number {
  if (score.kind === "mate") return score.winner === color ? 1 : 0;
  const white = fromCp(score.cp);
  return color === "w" ? white : 1 - white;
}

/** Win% (0..100) das brancas para a precisão; mate conta como ±1000 cp, como no Lichess. */
export function winPercent(score: Score): number {
  if (score.kind === "mate") return 100 * fromCp(score.winner === "w" ? CP_LIMIT : -CP_LIMIT);
  return 100 * fromCp(score.cp);
}
