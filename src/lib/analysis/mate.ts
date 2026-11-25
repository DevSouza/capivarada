import type { Color, Score } from "../types";

// Regras e cortes do Lichess (lila, AGPL-3.0 ou posterior):
// https://github.com/lichess-org/lila/blob/master/modules/tree/src/main/Advice.scala

/** Em centipeões: com tanta vantagem (ou desvantagem), o mate muda pouco. */
const DECIDED = 700;
const OVERWHELMING = 999;

export type MateJudgement = "inaccuracy" | "mistake" | "blunder";

function judge(cp: number): MateJudgement {
  if (cp > OVERWHELMING) return "inaccuracy";
  if (cp > DECIDED) return "mistake";
  return "blunder";
}

/**
 * Nota de quem perdeu um mate forçado ou permitiu um; null se não foi o caso. Adiar
 * o próprio mate não conta.
 */
export function judgeMate(before: Score, after: Score, color: Color): MateJudgement | null {
  const cpFor = (score: Score) => (score.kind === "mate" ? 0 : color === "w" ? score.cp : -score.cp);
  const mates = (score: Score) => score.kind === "mate" && score.winner === color;
  const isMated = (score: Score) => score.kind === "mate" && score.winner !== color;

  if (mates(before) && !mates(after)) return judge(cpFor(after));
  if (before.kind === "cp" && isMated(after)) return judge(-cpFor(before));
  return null;
}
