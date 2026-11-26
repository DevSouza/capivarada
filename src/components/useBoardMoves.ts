"use client";

import { Chess, type Move } from "chess.js";
import { useMemo, useState, type CSSProperties } from "react";
import type { ChessboardOptions } from "react-chessboard";

const SELECTED_STYLE: CSSProperties = { backgroundColor: "#f0b35a99" };
const TARGET_STYLE: CSSProperties = { background: "radial-gradient(circle, #10141d66 22%, transparent 24%)" };
const CAPTURE_STYLE: CSSProperties = { background: "radial-gradient(circle, transparent 58%, #10141d66 60%)" };

export interface Promotion {
  from: string;
  to: string;
}

/**
 * Jogar no tabuleiro: arrastar a peça, ou clicar nela e na casa de destino. A promoção
 * fica pendente até a escolha da peça; mudar de posição desfaz a seleção.
 */
export function useBoardMoves(fen: string, onMove: (uci: string) => void, onDragStart: () => void) {
  const [state, setState] = useState<{ fen: string; selected: string | null; promotion: Promotion | null }>({
    fen,
    selected: null,
    promotion: null,
  });
  const { selected, promotion } = state.fen === fen ? state : { selected: null, promotion: null };

  const legal = useMemo(() => {
    const bySquare = new Map<string, Move[]>();
    for (const move of new Chess(fen).moves({ verbose: true })) {
      bySquare.set(move.from, [...(bySquare.get(move.from) ?? []), move]);
    }
    return bySquare;
  }, [fen]);

  const select = (square: string | null) => setState({ fen, selected: square, promotion: null });

  /** Se o lance foi jogado; o de promoção ainda não. */
  function tryMove(from: string, to: string): boolean {
    const move = legal.get(from)?.find((item) => item.to === to);
    if (move?.promotion) {
      setState({ fen, selected: null, promotion: { from, to } });
      return false;
    }
    select(null);
    if (move) onMove(move.lan);
    return move !== undefined;
  }

  const handlers = {
    allowDragging: true,
    allowAutoScroll: false,
    canDragPiece: ({ square }) => square !== null && legal.has(square),
    onPieceDrag: ({ square }) => {
      onDragStart();
      select(square);
    },
    // Soltar na própria casa é um clique: a peça continua escolhida.
    onPieceDrop: ({ sourceSquare, targetSquare }) =>
      targetSquare !== sourceSquare && targetSquare !== null && tryMove(sourceSquare, targetSquare),
    onSquareClick: ({ square }) => {
      if (selected && selected !== square && legal.get(selected)?.some((move) => move.to === square)) {
        tryMove(selected, square);
      } else {
        select(legal.has(square) ? square : null);
      }
    },
  } satisfies Partial<ChessboardOptions>;

  const squareStyles: Record<string, CSSProperties> = {};
  if (selected) {
    squareStyles[selected] = SELECTED_STYLE;
    for (const move of legal.get(selected) ?? []) {
      squareStyles[move.to] = move.captured ? CAPTURE_STYLE : TARGET_STYLE;
    }
  }

  return {
    handlers,
    squareStyles,
    promotion,
    /** null desiste da promoção. */
    promote: (piece: string | null) => {
      select(null);
      if (piece && promotion) onMove(promotion.from + promotion.to + piece);
    },
  };
}
