"use client";

import { Chess } from "chess.js";
import type { ReactNode } from "react";
import { Chessboard, type Arrow } from "react-chessboard";
import type { GameResult } from "@/lib/players";
import type { Color, ReviewedPly } from "@/lib/types";
import { Badge, CLASS_META } from "./Badge";
import { ResultBadge } from "./ResultBadge";
import { useBoardNotes } from "./useBoardNotes";

interface Props {
  fen: string;
  ply: ReviewedPly | null;
  /** Melhor lance do motor na posição anterior ao lance mostrado. */
  bestMove?: string;
  flipped: boolean;
  /** Só na última posição: marca os reis com o resultado. */
  result: GameResult | null;
}

/** Selo no canto superior direito da casa, sem sair do tabuleiro nas bordas. */
function SquareMark({ square, flipped, children }: { square: string; flipped: boolean; children: ReactNode }) {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  const right = (flipped ? file : 7 - file) * 12.5;
  const top = (flipped ? rank : 7 - rank) * 12.5;
  return (
    <div
      className="pointer-events-none absolute z-20 w-[5.5%] translate-x-1/2 -translate-y-1/2"
      style={{ right: `${Math.max(2.5, right)}%`, top: `${Math.max(2.5, top)}%` }}
    >
      {children}
    </div>
  );
}

/** Duas setas iguais se sobreporiam com a mesma chave. */
const isSameArrow = (a: Arrow, b: Arrow) => a.startSquare === b.startSquare && a.endSquare === b.endSquare;

export function Board({ fen, ply, bestMove, flipped, result }: Props) {
  const notes = useBoardNotes(fen);
  const highlight = ply && { backgroundColor: `${CLASS_META[ply.classification].color}99` };
  const showArrow = ply && bestMove && bestMove !== ply.uci && ply.classification !== "book";

  const engineArrows: Arrow[] = showArrow
    ? [{ startSquare: bestMove.slice(0, 2), endSquare: bestMove.slice(2, 4), color: CLASS_META.best.color }]
    : [];

  const kings = result
    ? (["w", "b"] as Color[]).map((color) => ({
        color,
        square: new Chess(fen).findPiece({ type: "k", color })[0],
      }))
    : [];

  return (
    <div className="relative aspect-square min-w-0">
      <Chessboard
        options={{
          id: "review",
          position: fen,
          boardOrientation: flipped ? "black" : "white",
          allowDragging: false,
          allowDrawingArrows: false,
          animationDurationInMs: 150,
          // As coordenadas ficam fora do tabuleiro (BoardFrame).
          showNotation: false,
          lightSquareStyle: { backgroundColor: "#e3dccd" },
          darkSquareStyle: { backgroundColor: "#7b8da6" },
          boardStyle: { borderRadius: "4px", overflow: "hidden" },
          squareStyles: {
            ...(ply && highlight && { [ply.from]: highlight, [ply.to]: highlight }),
            ...notes.squareStyles,
          },
          arrows: [...engineArrows, ...notes.arrows.filter((arrow) => !engineArrows.some((own) => isSameArrow(own, arrow)))],
          ...notes.handlers,
        }}
      />
      {ply && !kings.some(({ square }) => square === ply.to) && (
        <SquareMark square={ply.to} flipped={flipped}>
          <Badge kind={ply.classification} size="100%" />
        </SquareMark>
      )}
      {result &&
        kings.map(({ color, square }) => (
          <SquareMark key={color} square={square} flipped={flipped}>
            <ResultBadge result={result} color={color} />
          </SquareMark>
        ))}
    </div>
  );
}
