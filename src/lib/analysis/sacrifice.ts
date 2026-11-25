import { Chess, type Move } from "chess.js";
import type { Color } from "../types";
import { BRILLIANT } from "./thresholds";

export const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
/** O rei captura por último. */
const ATTACKER_ORDER: Record<string, number> = { ...PIECE_VALUE, k: 100 };

/** Material ganho de imediato pelo lance (captura + promoção). */
function moveGain(move: Move): number {
  const captured = move.captured ? PIECE_VALUE[move.captured] : 0;
  return captured + (move.promotion ? PIECE_VALUE[move.promotion] - PIECE_VALUE.p : 0);
}

function capturesOn(chess: Chess, square: string): Move[] {
  return chess
    .moves({ verbose: true })
    .filter((move) => move.to === square && move.captured)
    .sort((a, b) => ATTACKER_ORDER[a.piece] - ATTACKER_ORDER[b.piece] || moveGain(b) - moveGain(a));
}

/** Saldo de executar `capture` supondo trocas ótimas na mesma casa (SEE com lances legais). */
function captureValue(chess: Chess, capture: Move): number {
  chess.move({ from: capture.from, to: capture.to, promotion: capture.promotion });
  const [reply] = capturesOn(chess, capture.to);
  const replyValue = reply ? Math.max(0, captureValue(chess, reply)) : 0;
  chess.undo();
  return moveGain(capture) - replyValue;
}

/** Maior ganho de material de quem está na vez capturando uma peça (não peão). */
function bestPieceCapture(fen: string): number {
  const chess = new Chess(fen);
  let best = 0;
  for (const move of chess.moves({ verbose: true })) {
    if (!move.captured || move.captured === "p") continue;
    best = Math.max(best, captureValue(chess, move));
  }
  return best;
}

/** Saldo do lance: o que ele ganha menos o que o adversário pode ganhar em seguida. */
const netAfter = (move: Move) => moveGain(move) - bestPieceCapture(move.after);

/** Se o lance deixa o adversário ganhar material que outro lance legal não deixaria. */
export function isSacrifice(fenBefore: string, uci: string): boolean {
  const moves = new Chess(fenBefore).moves({ verbose: true });
  const played = moves.find((move) => move.lan === uci);
  if (!played || netAfter(played) > BRILLIANT.maxNetMaterial) return false;
  // Se todo lance perde material, a peça já estava perdida: não é escolha.
  return moves.some((move) => move.lan !== uci && netAfter(move) > BRILLIANT.maxNetMaterial);
}

export function materialBalance(chess: Chess, color: Color): number {
  let balance = 0;
  for (const row of chess.board()) {
    for (const piece of row) {
      if (piece) balance += (piece.color === color ? 1 : -1) * PIECE_VALUE[piece.type];
    }
  }
  return balance;
}

/** Recaptura na mesma casa, ou captura de peça solta. */
export function isRoutineCapture(fenBefore: string, uci: string, recaptureSquare: string | null): boolean {
  const chess = new Chess(fenBefore);
  const move = chess.moves({ verbose: true }).find((m) => m.lan === uci);
  if (!move?.captured) return false;
  return move.to === recaptureSquare || captureValue(chess, move) >= PIECE_VALUE[move.captured];
}
