import { playerName } from "./players";
import type { Preset } from "./review";
import type { Classification, GameReview, ParsedGame } from "./types";

/**
 * Aumente quando uma mudança na análise (limiares, fórmulas, motor) deixar as
 * análises salvas desatualizadas: elas passam a ser refeitas ao abrir.
 */
export const ANALYSIS_VERSION = 9;

/** Formato de SavedGame; registros antigos são refeitos a partir do PGN. */
export const GAME_SCHEMA = 2;

export interface AnalysisSummary {
  version: number;
  preset: Preset;
  accuracy: GameReview["accuracy"];
  opening: string | null;
  /** Profundidade típica do motor; ausente em análises salvas antes de existir. */
  depth?: number | null;
}

/** O que a lista mostra; a análise completa fica à parte, por ser bem maior. */
export interface SavedGame {
  schema: number;
  id: string;
  /** PGN como foi colado, com comentários e relógio. */
  pgn: string;
  addedAt: number;
  headers: Record<string, string>;
  finalFen: string;
  moves: number;
  favorite: boolean;
  analysis: AnalysisSummary | null;
}

/** GameReview sem a partida, que é relida do PGN. */
export interface SavedAnalysis {
  id: string;
  version: number;
  plies: { classification: Classification; loss: number; accuracy: number }[];
  evals: GameReview["evals"];
  accuracy: GameReview["accuracy"];
  counts: GameReview["counts"];
  opening: string | null;
}

/** A mesma partida colada de novo (com ou sem relógio, por exemplo) tem o mesmo id. */
export function gameId(game: ParsedGame): string {
  const { headers } = game;
  return JSON.stringify([
    headers.White ?? "",
    headers.Black ?? "",
    headers.UTCDate ?? headers.Date ?? "",
    headers.UTCTime ?? "",
    headers.Round ?? "",
    game.startFen,
    game.plies.map((ply) => ply.uci).join(" "),
  ]);
}

export function toSavedGame(game: ParsedGame, addedAt: number): SavedGame {
  return {
    schema: GAME_SCHEMA,
    id: gameId(game),
    pgn: game.pgn,
    addedAt,
    headers: game.headers,
    finalFen: game.plies[game.plies.length - 1].fenAfter,
    moves: Math.ceil(game.plies.length / 2),
    favorite: false,
    analysis: null,
  };
}

export function isCurrent(analysis: AnalysisSummary | null): analysis is AnalysisSummary {
  return analysis?.version === ANALYSIS_VERSION;
}

/** Mediana das posições: um mate encontrado chega a profundidades enormes. */
export function typicalDepth(evals: GameReview["evals"]): number | null {
  const depths = evals
    .filter(({ lines }) => lines.length > 0)
    .map(({ depth }) => depth)
    .sort((a, b) => a - b);
  return depths.length > 0 ? depths[Math.floor(depths.length / 2)] : null;
}

export function toSavedAnalysis(review: GameReview): SavedAnalysis {
  return {
    id: gameId(review.game),
    version: ANALYSIS_VERSION,
    plies: review.plies.map(({ classification, loss, accuracy }) => ({ classification, loss, accuracy })),
    evals: review.evals,
    accuracy: review.accuracy,
    counts: review.counts,
    opening: review.opening,
  };
}

/** null quando a análise salva não serve mais para esta partida. */
export function restoreReview(game: ParsedGame, saved: SavedAnalysis): GameReview | null {
  if (saved.version !== ANALYSIS_VERSION || saved.plies.length !== game.plies.length) return null;
  return {
    game,
    plies: game.plies.map((ply, i) => ({ ...ply, ...saved.plies[i] })),
    evals: saved.evals,
    accuracy: saved.accuracy,
    counts: saved.counts,
    opening: saved.opening,
  };
}

export function pgnFileName(headers: Record<string, string>): string {
  const slug = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 40) || "jogador";
  const date = (headers.Date ?? headers.UTCDate ?? "").match(/^\d{4}\.\d{2}\.\d{2}$/);
  const suffix = date ? `-${date[0].replaceAll(".", "-")}` : "";
  return `${slug(playerName(headers, "w"))}-vs-${slug(playerName(headers, "b"))}${suffix}.pgn`;
}
