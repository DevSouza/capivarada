"use client";

import type { ReactNode } from "react";
import { gameResult } from "@/lib/players";
import type { Color, GameReview } from "@/lib/types";
import { Board } from "./Board";
import { EvalBar } from "./EvalBar";
import { PlayerStrip } from "./PlayerStrip";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

interface Props {
  review: GameReview;
  index: number;
  flipped: boolean;
  /** Botões de ação ao lado do tabuleiro. */
  actions: ReactNode;
}

/** Tabuleiro com barra de avaliação, coordenadas externas e os dois jogadores. */
export function BoardFrame({ review, index, flipped, actions }: Props) {
  const ply = index > 0 ? review.plies[index - 1] : null;
  const fen = ply ? ply.fenAfter : review.game.startFen;
  const [top, bottom]: Color[] = flipped ? ["w", "b"] : ["b", "w"];
  const ordered = (labels: string[]) => (flipped ? [...labels].reverse() : labels);

  return (
    <div className="grid grid-cols-[1.75rem_1.5rem_minmax(0,1fr)_3rem] max-sm:grid-cols-[1.25rem_1rem_minmax(0,1fr)]">
      <div className="col-start-3 mb-2">
        <PlayerStrip review={review} index={index} color={top} fen={fen} />
      </div>

      <EvalBar score={review.evals[index].score} flipped={flipped} />
      <div aria-hidden className="grid grid-rows-8 text-xs font-medium text-muted">
        {ordered(RANKS).map((rank) => (
          <span key={rank} className="flex items-center justify-center">
            {rank}
          </span>
        ))}
      </div>
      <Board
        fen={fen}
        ply={ply}
        bestMove={ply ? review.evals[index - 1].lines[0]?.move : undefined}
        flipped={flipped}
        result={index === review.plies.length ? gameResult(review) : null}
      />
      {/* No celular, ficam no topo da página para não encolher o tabuleiro. */}
      <div className="flex flex-col gap-2 pl-2 max-sm:hidden">{actions}</div>

      <div aria-hidden className="col-start-3 grid h-6 grid-cols-8 text-xs font-medium text-muted">
        {ordered(FILES).map((file) => (
          <span key={file} className="flex items-center justify-center">
            {file}
          </span>
        ))}
      </div>
      <div className="col-start-3 mt-1">
        <PlayerStrip review={review} index={index} color={bottom} fen={fen} />
      </div>
    </div>
  );
}
