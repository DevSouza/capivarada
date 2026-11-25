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
function bestPieceCapture(fen: string): { gain: number; capture: string } | null {
  const chess = new Chess(fen);
  let best: { gain: number; capture: string } | null = null;
  for (const move of chess.moves({ verbose: true })) {
    if (!move.captured || move.captured === "p") continue;
    const gain = captureValue(chess, move);
    if (gain > 0 && (!best || gain > best.gain)) best = { gain, capture: move.lan };
  }
  return best;
}

function netAfter(move: Move): { net: number; capture: string | null } {
  const threat = bestPieceCapture(move.after);
  return { net: moveGain(move) - (threat?.gain ?? 0), capture: threat?.capture ?? null };
}

/**
 * Se o lance entrega material que outro lance legal não entregaria, devolve a
 * captura com que o adversário aceita o sacrifício.
 */
export function findSacrifice(fenBefore: string, uci: string): string | null {
  const moves = new Chess(fenBefore).moves({ verbose: true });
  const played = moves.find((move) => move.lan === uci);
  if (!played) return null;
  const { net, capture } = netAfter(played);
  if (net > BRILLIANT.maxNetMaterial || !capture) return null;
  // Se todo lance perde material, a peça já estava perdida: não é escolha.
  const avoidable = moves.some((move) => move.lan !== uci && netAfter(move).net > BRILLIANT.maxNetMaterial);
  return avoidable ? capture : null;
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

/**
 * Confirma o sacrifício na linha em que o adversário aceita: o material não
 * pode voltar já na resposta (nem nas trocas em seguida na mesma casa).
 */
export function sacrificeStands(fenBefore: string, uci: string, acceptedLine: string[]): boolean {
  const chess = new Chess(fenBefore);
  const color = chess.turn();
  const before = materialBalance(chess, color);
  let exchangeSquare: string | null = null;
  try {
    chess.move(uci);
    for (let i = 0; i < acceptedLine.length; i++) {
      // i = 0: aceitação; i = 1: resposta; depois só recapturas na casa da resposta.
      if (i >= 2 && acceptedLine[i].slice(2, 4) !== exchangeSquare) break;
      const played = chess.move(acceptedLine[i]);
      if (i >= 1) {
        if (!played.captured) break;
        exchangeSquare = played.to;
      }
    }
  } catch {
    // Linha truncada: avalia o que deu para jogar.
  }
  if (chess.isCheckmate() && chess.turn() !== color) return true;
  return materialBalance(chess, color) - before <= BRILLIANT.maxNetMaterial;
}

/** Recaptura na mesma casa, ou captura de peça solta. */
export function isRoutineCapture(fenBefore: string, uci: string, recaptureSquare: string | null): boolean {
  const chess = new Chess(fenBefore);
  const move = chess.moves({ verbose: true }).find((m) => m.lan === uci);
  if (!move?.captured) return false;
  return move.to === recaptureSquare || captureValue(chess, move) >= PIECE_VALUE[move.captured];
}
