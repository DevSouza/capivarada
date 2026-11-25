import { Chess } from "chess.js";
import type { ParsedGame } from "./types";

export class PgnError extends Error {}

function normalize(text: string): string {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2010-\u2015]/g, "-")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

/**
 * Apaga comentários {…} fora de aspas, preservando o tamanho do texto. Com
 * `keepClocks`, cada sequência de comentários fica reduzida ao seu %clk (o
 * chess.js não aceita dois comentários seguidos).
 */
function blankComments(text: string, keepClocks: boolean): string {
  return text.replace(/"(?:\\.|[^"\\\n])*"|(?:\{[^}]*\}\s*)+/g, (match) => {
    if (!match.startsWith("{")) return match;
    const blank = match.replace(/[^\n]/g, " ");
    const clock = keepClocks ? match.match(/\[%clk\s+([\d:.]+)\]/) : null;
    if (!clock) return blank;
    const kept = `{[%clk ${clock[1]}]}`;
    return kept + blank.slice(kept.length);
  });
}

/** "[%clk 0:09:58.3]" -> 598.3 */
function parseClock(comment: string | undefined): number | null {
  const time = comment?.match(/\[%clk ([\d:.]+)\]/)?.[1];
  if (!time) return null;
  const seconds = time.split(":").reduce((total, part) => total * 60 + Number(part), 0);
  return Number.isFinite(seconds) ? seconds : null;
}

function load(pgn: string): Chess {
  const chess = new Chess();
  chess.loadPgn(pgn);
  return chess;
}

/** Separa as partidas de um texto; vazio se não houver nenhuma. */
export function splitGames(text: string): string[] {
  const normalized = normalize(text);
  const lines = normalized.split("\n");
  // Sem os comentários, que podem conter linhas parecidas com cabeçalhos.
  const masked = blankComments(normalized, false)
    .split("\n")
    .map((line) => line.trim());
  const starts = [0];
  let hasMoves = false;
  masked.forEach((line, i) => {
    const isHeader = /^\[\w+\s+"/.test(line);
    // Um cabeçalho depois dos lances inicia outra partida.
    if (isHeader && hasMoves) starts.push(i);
    if (isHeader) hasMoves = false;
    else if (line !== "") hasMoves = true;
  });
  return starts.map((start, i) => lines.slice(start, starts[i + 1]).join("\n").trim()).filter(Boolean);
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const invalidMove = message.match(/Invalid move in PGN: (.+)/);
  if (invalidMove) return `Lance inválido ou impossível: “${invalidMove[1]}”.`;
  if (/Invalid FEN/i.test(message)) return "A posição inicial (tag FEN) é inválida.";
  const start = (error as { location?: { start?: { line: number; column: number } } })?.location?.start;
  if (start) return `Não entendi o PGN na linha ${start.line}, coluna ${start.column}.`;
  return "Não consegui ler esse PGN.";
}

export function parsePgn(text: string): ParsedGame {
  const [pgn, ...others] = splitGames(text);
  if (!pgn) throw new PgnError("Cole o PGN de uma partida.");

  let chess: Chess;
  try {
    chess = load(blankComments(pgn, true).trim());
  } catch {
    // O relógio é um extra: se ele atrapalhar a leitura, fica de fora.
    try {
      chess = load(blankComments(pgn, false).trim());
    } catch (error) {
      throw new PgnError(describeError(error));
    }
  }
  const comments = new Map(chess.getComments().map(({ fen, comment }) => [fen, comment]));

  const history = chess.history({ verbose: true });
  if (history.length === 0) throw new PgnError("Esse PGN não tem nenhum lance.");

  return {
    pgn,
    headers: chess.getHeaders(),
    startFen: history[0].before,
    plies: history.map((move) => ({
      color: move.color,
      moveNumber: Number(move.before.split(" ")[5]),
      san: move.san,
      uci: move.lan,
      from: move.from,
      to: move.to,
      fenBefore: move.before,
      fenAfter: move.after,
      captured: move.captured ?? null,
      clock: parseClock(comments.get(move.after)),
    })),
    warnings: others.length > 0 ?["O texto tem mais de uma partida; analisei só a primeira."] : [],
  };
}
