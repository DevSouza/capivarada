import { classifyGame, type OpeningBook } from "./analysis/analyze";
import type { ParsedGame, PositionEval, ReviewedPly } from "./types";

/** As posições antes e depois de um lance, analisadas com a mesma profundidade extra. */
export interface Deepened {
  before: PositionEval;
  after: PositionEval;
}

/** O que já se sabe dos lances mostrados: pode ter menos lances que eles. */
export interface KnownReview {
  plies: ReviewedPly[];
  /** A avaliação de cada posição, vista do lance que levou a ela. */
  evals: PositionEval[];
  /** A posição anterior a cada lance, com a profundidade com que ele foi classificado. */
  before: PositionEval[];
}

/** Cada clique multiplica a busca por este tanto. */
const STEP = 4;
/** Mais que isso leva minutos. */
const MAX_NODES = 50_000_000;

export const nodesAt = (baseNodes: number, level: number) => baseNodes * STEP ** level;
export const canDeepen = (baseNodes: number, level: number) => nodesAt(baseNodes, level + 1) <= MAX_NODES;

/**
 * Reclassifica só os lances aprofundados: os vizinhos seguem com a análise original,
 * para uma posição compartilhada não misturar profundidades na conta deles.
 */
export function applyDeepened(
  game: ParsedGame,
  base: Pick<KnownReview, "plies" | "evals">,
  deepened: ReadonlyMap<number, Deepened>,
  book: OpeningBook,
): KnownReview {
  const plies = [...base.plies];
  const evals = [...base.evals];
  const before = base.evals.slice(0, plies.length);
  for (const [i, deep] of deepened) {
    if (i >= plies.length) continue;
    const prefix = { ...game, plies: game.plies.slice(0, i + 1) };
    plies[i] = classifyGame(prefix, [...base.evals.slice(0, i), deep.before, deep.after], book).plies[i];
    evals[i + 1] = deep.after;
    before[i] = deep.before;
  }
  return { plies, evals, before };
}
