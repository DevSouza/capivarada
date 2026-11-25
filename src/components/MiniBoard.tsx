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
export function gridPosition(square: string, flipped: boolean): { x: number; y: number } {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  return flipped ? { x: 7 - file, y: rank } : { x: file, y: 7 - rank };
}

/** As 64 casas em SVG: um gradiente deixa emendas em tamanhos fracionados. */
const BOARD = (() => {
  const dark = Array.from({ length: 64 }, (_, i) => [i % 8, Math.floor(i / 8)])
    .filter(([x, y]) => (x + y) % 2 === 1)
    .map(([x, y]) => `M${x} ${y}h1v1h-1z`)
    .join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8' shape-rendering='crispEdges'><path fill='#e3dccd' d='M0 0h8v8H0z'/><path fill='#7b8da6' d='${dark}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 0 0 / 100% 100%`;
})();

const placed = ({ x, y }: { x: number; y: number }) => ({ left: `${x * 12.5}%`, top: `${y * 12.5}%` });

/** Posição estática, leve o bastante para repetir em uma lista. */
export function MiniBoard({ fen, flipped, label = "Posição final", move }: Props) {
  const pieces = new Chess(fen).board().flat().filter((piece) => piece !== null);
  return (
    <div
      role="img"
      aria-label={label}
      className="relative aspect-square w-full overflow-hidden rounded"
      style={{ background: BOARD }}
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
