"use client";

import { useEffect, useState } from "react";
import type { ChessboardOptions } from "react-chessboard";
import { canReach } from "@/lib/reach";

const RIGHT_BUTTON = 2;
const MARK_STYLE = { backgroundColor: "#dc4646cc" };
const ARROW_COLOR = "#f0b35a";

interface Arrow {
  from: string;
  to: string;
}

interface Notes {
  fen: string;
  marked: string[];
  arrows: Arrow[];
  /** Botão direito pressionado: casa de origem e casa sob o ponteiro. */
  drag: Arrow | null;
}

const empty = (fen: string): Notes => ({ fen, marked: [], arrows: [], drag: null });
const isSame = (a: Arrow, b: Arrow) => a.from === b.from && a.to === b.to;

/**
 * Anotações do botão direito: um clique marca uma casa vazia, arrastar desenha uma
 * seta (que, saindo de uma peça, segue o movimento dela). Repetir apaga; o clique
 * esquerdo ou mudar de posição limpa tudo.
 */
export function useBoardNotes(fen: string) {
  const [notes, setNotes] = useState(() => empty(fen));
  if (notes.fen !== fen) setNotes(empty(fen));
  const { marked, arrows, drag } = notes;

  // Soltar fora do tabuleiro cancela a seta.
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const cancel = () => setNotes((current) => ({ ...current, drag: null }));
    window.addEventListener("mouseup", cancel);
    return () => window.removeEventListener("mouseup", cancel);
  }, [dragging]);

  const isAllowed = ({ from, to }: Arrow, fromPiece: boolean) => from !== to && (!fromPiece || canReach(fen, from, to));

  const handlers = {
    onSquareMouseDown: ({ square }, event) => {
      if (event.button === RIGHT_BUTTON) setNotes({ ...notes, drag: { from: square, to: square } });
      else if (event.button === 0) setNotes(empty(fen));
    },
    onMouseOverSquare: ({ square }) => {
      if (drag && drag.to !== square) setNotes({ ...notes, drag: { ...drag, to: square } });
    },
    onSquareMouseUp: ({ square, piece }, event) => {
      if (event.button !== RIGHT_BUTTON || !drag) return;
      const drawn = { from: drag.from, to: square };
      const next = { ...notes, drag: null };
      if (square === drag.from) {
        if (!piece) {
          next.marked = marked.includes(square) ? marked.filter((item) => item !== square) : [...marked, square];
        }
      } else if (isAllowed(drawn, hasPiece(fen, drag.from))) {
        next.arrows = arrows.some((arrow) => isSame(arrow, drawn))
          ? arrows.filter((arrow) => !isSame(arrow, drawn))
          : [...arrows, drawn];
      }
      setNotes(next);
    },
  } satisfies Partial<ChessboardOptions>;

  const preview =
    drag && !arrows.some((arrow) => isSame(arrow, drag)) && isAllowed(drag, hasPiece(fen, drag.from)) ? [drag] : [];

  return {
    handlers,
    squareStyles: Object.fromEntries(marked.map((square) => [square, MARK_STYLE])),
    arrows: [...arrows, ...preview].map(({ from, to }) => ({ startSquare: from, endSquare: to, color: ARROW_COLOR })),
  };
}

function hasPiece(fen: string, square: string): boolean {
  const row = fen.split(" ")[0].split("/")[8 - Number(square[1])];
  const cells = row.replace(/\d/g, (count) => ".".repeat(Number(count)));
  return cells[square.charCodeAt(0) - 97] !== ".";
}
