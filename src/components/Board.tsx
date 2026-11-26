"use client";

import { Chess } from "chess.js";
import type { ReactNode } from "react";
import { Chessboard, type Arrow } from "react-chessboard";
import type { GameResult } from "@/lib/players";
import type { Classification, Color, Ply } from "@/lib/types";
import { Badge, CLASS_META } from "./Badge";
import { PromotionPicker } from "./PromotionPicker";
import { ResultBadge } from "./ResultBadge";
import { useBoardMoves } from "./useBoardMoves";
import { useBoardNotes } from "./useBoardNotes";

interface Props {
  fen: string;
  ply: Ply | null;
  /** null enquanto o lance não foi analisado. */
  classification: Classification | null;
  /** Melhor lance do motor na posição anterior ao lance mostrado. */
  bestMove?: string;
  flipped: boolean;
  /** Só na última posição: marca os reis com o resultado. */
  result: GameResult | null;
  onMove: (uci: string) => void;
  onDragStart: () => void;
}

/** Casas de um lance ainda sem classificação. */
const PENDING_COLOR = "#8a95a8";

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

export function Board({ fen, ply, classification, bestMove, flipped, result, onMove, onDragStart }: Props) {
  const moves = useBoardMoves(fen, onMove, onDragStart);
  const notes = useBoardNotes(fen);
  const highlight = ply && { backgroundColor: `${classification ? CLASS_META[classification].color : PENDING_COLOR}99` };
  const showArrow = ply && classification && bestMove && bestMove !== ply.uci && classification !== "book";

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
            ...moves.squareStyles,
          },
          arrows: [...engineArrows, ...notes.arrows.filter((arrow) => !engineArrows.some((own) => isSameArrow(own, arrow)))],
          ...notes.handlers,
          ...moves.handlers,
        }}
      />
      {ply && classification && !kings.some(({ square }) => square === ply.to) && (
        <SquareMark square={ply.to} flipped={flipped}>
          <Badge kind={classification} size="100%" />
        </SquareMark>
      )}
      {result &&
        kings.map(({ color, square }) => (
          <SquareMark key={color} square={square} flipped={flipped}>
            <ResultBadge result={result} color={color} />
          </SquareMark>
        ))}
      {moves.promotion && (
        <PromotionPicker square={moves.promotion.to} flipped={flipped} onChoose={moves.promote} />
      )}
    </div>
  );
}
