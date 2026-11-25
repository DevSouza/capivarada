export type Color = "w" | "b";

/** Avaliação sempre na visão das brancas. `mate` é a distância; 0 = já é mate. */
export type Score =
  | { kind: "cp"; cp: number }
  | { kind: "mate"; mate: number; winner: Color };

export interface EngineLine {
  move: string;
  pv: string[];
  score: Score;
}

export interface PositionEval {
  score: Score;
  /** Ordenadas da melhor para a pior; vazia em posições terminais. */
  lines: EngineLine[];
  depth: number;
}

export interface Ply {
  color: Color;
  moveNumber: number;
  san: string;
  uci: string;
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  captured: string | null;
  /** Segundos restantes de quem jogou, se o PGN tiver %clk. */
  clock: number | null;
}

export interface ParsedGame {
  /** Texto original da partida, com comentários. */
  pgn: string;
  headers: Record<string, string>;
  startFen: string;
  plies: Ply[];
  warnings: string[];
}

/** Ordem do resumo. Em português, `great` é "Excelente". */
export const CLASSIFICATIONS = [
  "brilliant",
  "great",
  "book",
  "best",
  "good",
  "inaccuracy",
  "mistake",
  "miss",
  "blunder",
] as const;

/** `forced` (único lance legal) não entra no resumo: não houve escolha a avaliar. */
export type Classification = (typeof CLASSIFICATIONS)[number] | "forced";

export interface ReviewedPly extends Ply {
  classification: Classification;
  /** Pontos esperados perdidos por quem jogou, de 0 a 1. */
  loss: number;
  accuracy: number;
}

export interface GameReview {
  game: ParsedGame;
  plies: ReviewedPly[];
  /** plies.length + 1 posições. */
  evals: PositionEval[];
  accuracy: Record<Color, number | null>;
  counts: Record<Color, Record<Classification, number>>;
  opening: string | null;
}
