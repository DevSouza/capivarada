import { Chess } from "chess.js";
import { terminalEval, type SearchJob } from "./analysis/analyze";
import { toPly } from "./pgn";
import type { GameResult } from "./players";
import type { Color, ParsedGame, Ply } from "./types";

/** Lances experimentados no lugar dos da partida. */
export interface Line {
  /** Quantos lances da partida vêm antes da variante. */
  base: number;
  plies: Ply[];
}

export interface Cursor {
  /** 0 = posição inicial; n = depois do n-ésimo lance, da partida ou da variante. */
  index: number;
  line: Line | null;
}

/** A partida até a variante, seguida dela. */
export function withLine(game: ParsedGame, line: Line | null): ParsedGame {
  return line ? { ...game, plies: [...game.plies.slice(0, line.base), ...line.plies] } : game;
}

export function fenAt(game: ParsedGame, index: number): string {
  return index === 0 ? game.startFen : game.plies[index - 1].fenAfter;
}

function makePly(fen: string, uci: string): Ply | null {
  try {
    return toPly(new Chess(fen).move(uci), null);
  } catch {
    return null;
  }
}

/**
 * Joga um lance na posição mostrada. Repetir o lance seguinte só avança; qualquer
 * outro abre uma variante ou substitui o resto dela. Um lance feito sobre outra
 * posição (`fen`) ou ilegal é ignorado.
 */
export function playMove(game: ParsedGame, cursor: Cursor, fen: string, uci: string): Cursor {
  const { index, line } = cursor;
  const active = withLine(game, line);
  if (fenAt(active, index) !== fen) return cursor;
  if (active.plies[index]?.uci === uci) return { index: index + 1, line };

  const base = Math.min(line?.base ?? index, index);
  // Na posição de onde a variante sai, o lance da partida volta para ela.
  if (base === index && game.plies[index]?.uci === uci) return { index: index + 1, line: null };

  const ply = makePly(fen, uci);
  if (!ply) return cursor;
  return { index: index + 1, line: { base, plies: [...(line?.plies.slice(0, index - base) ?? []), ply] } };
}

/**
 * Monta uma sequência (em UCI) a partir da posição `start` e mostra o primeiro lance
 * dela. Os lances que coincidem com os da partida continuam sendo os da partida.
 */
export function mountLine(game: ParsedGame, { index, line }: Cursor, start: number, ucis: string[]): Cursor {
  const plies = withLine(game, line).plies.slice(0, start);
  let fen = fenAt({ ...game, plies }, start);
  for (const uci of ucis) {
    const ply = makePly(fen, uci);
    if (!ply) break;
    plies.push(ply);
    fen = ply.fenAfter;
  }
  if (plies.length === start) return { index, line };
  const base = plies.findIndex((ply, i) => ply.uci !== game.plies[i]?.uci);
  return { index: start + 1, line: base < 0 ? null : { base, plies: plies.slice(base) } };
}

/** Fecha a variante e volta à posição da partida de onde ela saiu. */
export function closeLine({ index, line }: Cursor): Cursor {
  return { index: line ? Math.min(index, line.base) : index, line: null };
}

export interface LineSearch {
  /** Identifica a posição pelos lances que levaram a ela. */
  key: string;
  fen: string;
  job: SearchJob;
}

/** As posições da variante, na ordem. A de onde ela parte já foi analisada com a partida. */
export function lineSearches(game: ParsedGame, line: Line, multiPv: number): LineSearch[] {
  const ucis = withLine(game, line).plies.map((ply) => ply.uci);
  return line.plies.map(({ fenAfter }, i) => {
    const moves = ucis.slice(0, line.base + i + 1);
    const turn = fenAfter.split(" ")[1] as Color;
    return { key: moves.join(" "), fen: fenAfter, job: { startFen: game.startFen, moves, turn, multiPv } };
  });
}

/** Resultado quando a variante chegou a uma posição encerrada. */
export function lineResult(fen: string): GameResult | null {
  const end = terminalEval(fen);
  if (!end) return null;
  return end.score.kind === "mate" ? { kind: "win", winner: end.score.winner, checkmate: true } : { kind: "draw" };
}
