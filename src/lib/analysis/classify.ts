import type { Classification } from "../types";
import type { MateJudgement } from "./mate";
import { BRILLIANT, GREAT, LOSS, MISS } from "./thresholds";

export interface ClassifyInput {
  isBook: boolean;
  legalMoves: number;
  /** Jogou o lance nº 1 do motor (ou um empatado com ele). */
  isBest: boolean;
  expectedBefore: number;
  /** Sempre da busca posterior ao lance, que enxerga mais longe. */
  expectedAfter: number;
  /** Pontos esperados da segunda melhor opção, se existir. */
  expectedSecond: number | null;
  loss: number;
  opponentLoss: number;
  /** Perdeu um mate forçado ou permitiu um. */
  mateJudgement: MateJudgement | null;
  isRoutineCapture: boolean;
  isSacrifice: boolean;
}

/** Condições de Brilhante, fora o sacrifício em si (que é caro de verificar). */
export function canBeBrilliant(input: ClassifyInput): boolean {
  const alternative = input.isBest ? input.expectedSecond : input.expectedBefore;
  return (
    !input.isBook &&
    input.legalMoves > 1 &&
    input.loss <= BRILLIANT.maxLoss &&
    input.expectedAfter >= BRILLIANT.minExpectedAfter &&
    alternative !== null &&
    alternative < BRILLIANT.maxAlternative
  );
}

/** Condições de Excelente (great), fora a exclusão de capturas rotineiras. */
export function canBeGreat(input: ClassifyInput): boolean {
  return (
    !input.isBook &&
    input.legalMoves > 1 &&
    input.isBest &&
    input.expectedSecond !== null &&
    input.expectedSecond < GREAT.maxAlternative &&
    input.expectedBefore - input.expectedSecond >= GREAT.minGap &&
    input.expectedAfter >= GREAT.minExpectedAfter
  );
}

export function classifyByLoss(loss: number): Classification {
  if (loss < LOSS.good) return "good";
  if (loss < LOSS.inaccuracy) return "inaccuracy";
  if (loss < LOSS.mistake) return "mistake";
  return "blunder";
}

export function classify(input: ClassifyInput): Classification {
  if (input.isBook) return "book";
  if (input.legalMoves === 1) return "forced";
  if (input.isSacrifice && canBeBrilliant(input)) return "brilliant";
  const punishes = input.opponentLoss >= GREAT.minPunishedLoss;
  if ((!input.isRoutineCapture || punishes) && canBeGreat(input)) return "great";
  if (input.isBest) return "best";
  if (input.mateJudgement) return input.mateJudgement;
  if (
    input.opponentLoss >= MISS.minOpponentLoss &&
    input.expectedBefore >= MISS.minExpectedBefore &&
    input.loss >= MISS.minLoss
  ) {
    return "miss";
  }
  return classifyByLoss(input.loss);
}
