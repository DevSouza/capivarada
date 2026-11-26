import { Chess, type Square } from "chess.js";

/**
 * Se a peça em `from` alcança `to` pelo movimento dela, com as outras peças no
 * caminho. Vale para os dois lados, seja de quem for a vez. Cravadas e xeques não
 * contam, menos para o rei, que não entra em casa atacada.
 */
export function canReach(fen: string, from: string, to: string): boolean {
  const [board, turn, castling, enPassant, ...rest] = fen.split(" ");
  const piece = new Chess(fen, { skipValidation: true }).get(from as Square);
  if (!piece) return false;

  // Sem reis não há xeque a respeitar; cavalos no lugar deles mantêm as casas ocupadas.
  const placement = piece.type === "k" ? board : board.replace(/k/g, "n").replace(/K/g, "N");
  const passing = piece.color === turn ? enPassant : "-";
  const chess = new Chess([placement, piece.color, castling, passing, ...rest].join(" "), { skipValidation: true });
  return chess.moves({ square: from as Square, verbose: true }).some((move) => move.to === to);
}
