import { Chess } from "chess.js";
import type { CSSProperties } from "react";
import { defaultPieces } from "react-chessboard";

interface Props {
  fen: string;
  flipped: boolean;
  label?: string;
  /** Lance que levou à posição: destaca as casas e anima a peça. */
  move?: { from: string; to: string; color: string };
}

/** Coluna e linha da casa na tela, de 0 a 7. */
function gridPosition(square: string, flipped: boolean): { x: number; y: number } {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  return flipped ? { x: 7 - file, y: rank } : { x: file, y: 7 - rank };
}

const placed = ({ x, y }: { x: number; y: number }) => ({ left: `${x * 12.5}%`, top: `${y * 12.5}%` });

/** Posição estática, leve o bastante para repetir em uma lista. */
export function MiniBoard({ fen, flipped, label = "Posição final", move }: Props) {
  const pieces = new Chess(fen).board().flat().filter((piece) => piece !== null);
  return (
    <div
      role="img"
      aria-label={label}
      className="relative aspect-square w-full overflow-hidden rounded"
      style={{ background: "repeating-conic-gradient(#7b8da6 0 25%, #e3dccd 0 50%) 0 0 / 25% 25%" }}
    >
      {move &&
        [move.from, move.to].map((square) => (
          <span
            key={square}
            aria-hidden
            className="absolute size-[12.5%]"
            style={{ ...placed(gridPosition(square, flipped)), backgroundColor: `${move.color}99` }}
          />
        ))}
      {pieces.map(({ square, type, color }) => {
        const to = gridPosition(square, flipped);
        const moved = move?.to === square;
        const from = moved ? gridPosition(move.from, flipped) : to;
        return (
          <span
            key={square}
            aria-hidden
            className={`absolute size-[12.5%] ${moved ? "piece-move z-10" : ""}`}
            style={{ ...placed(to), "--from-x": from.x - to.x, "--from-y": from.y - to.y } as CSSProperties}
          >
            {defaultPieces[`${color}${type.toUpperCase()}`]()}
          </span>
        );
      })}
    </div>
  );
}
