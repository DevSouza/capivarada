import { Chess } from "chess.js";
import { numberedMove } from "@/lib/notation";
import type { Classification, Score } from "@/lib/types";

// Mate de Légal, com o resultado real da análise Profunda deste app.
const SANS = ["e4", "e5", "Nf3", "d6", "Bc4", "Bg4", "Nc3", "g6", "Nxe5", "Bxd1", "Bxf7+", "Ke7", "Nd5#"];

const KINDS: Classification[] = [
  "book", "book", "book", "book", "book", "good", "good", "mistake", "brilliant", "blunder", "great", "forced", "great",
];

const mate = (n: number): Score => ({ kind: "mate", mate: n, winner: "w" });
const cp = (value: number): Score => ({ kind: "cp", cp: value });

/** Uma a mais que os lances: começa na posição inicial. */
export const SCORES: Score[] = [
  ...[37, 30, 30, 22, 58, 35, 88, 48, 222, 222].map(cp), mate(2), mate(1), mate(1), mate(0),
];

export interface ShowcaseMove {
  label: string;
  kind: Classification;
  from: string;
  to: string;
  fen: string;
}

export const START_FEN = new Chess().fen();

function buildMoves(): ShowcaseMove[] {
  const chess = new Chess();
  return SANS.map((san, i) => {
    const moveNumber = chess.moveNumber();
    const move = chess.move(san);
    return {
      label: numberedMove(moveNumber, move.color, move.san),
      kind: KINDS[i],
      from: move.from,
      to: move.to,
      fen: move.after,
    };
  });
}

export const MOVES = buildMoves();

/** Posição logo depois da capivara (5… Bxd1). */
export const BLUNDER_STEP = KINDS.indexOf("blunder") + 1;

/** As 3 melhores linhas que as pretas tinham no lugar de 5… Bxd1. */
export const BEST_LINES = [
  { score: "+2,2", moves: "dxe5 Dxg4 Cc6 d3 h5 Df3" },
  { score: "+2,5", moves: "Be6 Bxe6 dxe5 Bd5 c6 Bb3" },
  { score: "+4,6", moves: "d5 Bb5+ Bd7 Df3 Df6 Cxd7" },
];
