import { Chess } from "chess.js";
import type { Color, Score } from "./types";

const PIECES_PT: Record<string, string> = { N: "C", R: "T", Q: "D", K: "R", B: "B" };

/** SAN inglesa -> portuguesa (Nf3 -> Cf3, e8=Q -> e8=D). */
export function sanToPt(san: string): string {
  return san.replace(/[NRQKB]/g, (letter) => PIECES_PT[letter]);
}

/** Separa a peça do resto do lance: Nf3 -> N + f3, O-O -> K + O-O; peão fica sem peça. */
export function splitSan(san: string): { piece: string | null; rest: string } {
  if (san.startsWith("O-O")) return { piece: "K", rest: san };
  return "NBRQK".includes(san[0]) ? { piece: san[0], rest: sanToPt(san.slice(1)) } : { piece: null, rest: sanToPt(san) };
}

/** "5. Cxe4" para as brancas, "5… Cxe4" para as pretas. */
export function numberedMove(moveNumber: number, color: Color, san: string): string {
  return `${moveNumber}${color === "w" ? "." : "…"} ${sanToPt(san)}`;
}

export interface LineMove {
  /** SAN em português. */
  san: string;
  /** A mesma, com a peça separada. */
  parts: ReturnType<typeof splitSan>;
  color: Color;
}

/** Quantos lances de uma linha do motor são mostrados e montados como variante. */
export const LINE_MOVES = 8;

/** Joga uma linha UCI a partir de uma posição; para no primeiro lance ilegal. */
export function playLine(fen: string, uciMoves: string[], max = LINE_MOVES): LineMove[] {
  const chess = new Chess(fen);
  const out: LineMove[] = [];
  for (const uci of uciMoves.slice(0, max)) {
    try {
      const move = chess.move(uci);
      out.push({
        san: sanToPt(move.san),
        parts: splitSan(move.san),
        color: move.color,
      });
    } catch {
      break;
    }
  }
  return out;
}

export function formatScore(score: Score): string {
  if (score.kind === "mate") {
    if (score.mate === 0) return score.winner === "w" ? "1–0" : "0–1";
    return `${score.winner === "w" ? "+" : "−"}M${score.mate}`;
  }
  const pawns = Math.abs(score.cp) / 100;
  const text = pawns.toFixed(pawns >= 10 ? 0 : 1);
  if (Number(text) === 0) return "0,0";
  return `${score.cp > 0 ? "+" : "−"}${text.replace(".", ",")}`;
}

export function formatAccuracy(value: number | null): string {
  return value === null ? "–" : value.toFixed(1).replace(".", ",");
}
