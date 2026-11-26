"use client";

import type { ReactNode } from "react";
import { fenAt } from "@/lib/line";
import { clockAt, type GameResult } from "@/lib/players";
import type { Color, ParsedGame } from "@/lib/types";
import { Board } from "./Board";
import { EvalBar } from "./EvalBar";
import { PlayerStrip } from "./PlayerStrip";
import type { KnownReview } from "./useLineReview";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

interface Props {
  /** Com os lances mostrados, da partida ou da variante. */
  game: ParsedGame;
  known: KnownReview;
  index: number;
  /** Posição da partida que vale para os relógios. */
  clockIndex: number;
  clockGame: ParsedGame;
  flipped: boolean;
  /** Resultado a marcar nos reis. */
  result: GameResult | null;
  onMove: (fen: string, uci: string) => void;
  onDragStart: () => void;
  /** Botões de ação ao lado do tabuleiro. */
  actions: ReactNode;
}

/** Tabuleiro com barra de avaliação, coordenadas externas e os dois jogadores. */
export function BoardFrame(props: Props) {
  const { game, known, index, flipped, actions } = props;
  const ply = index > 0 ? game.plies[index - 1] : null;
  const fen = fenAt(game, index);
  // Enquanto a posição não é analisada, vale a última avaliação conhecida.
  const { score } = known.evals[Math.min(index, known.evals.length - 1)];
  const [top, bottom]: Color[] = flipped ? ["w", "b"] : ["b", "w"];
  const ordered = (labels: string[]) => (flipped ? [...labels].reverse() : labels);

  const strip = (color: Color) => (
    <PlayerStrip
      game={game}
      index={index}
      color={color}
      fen={fen}
      clock={clockAt(props.clockGame, props.clockIndex, color)}
    />
  );

  return (
    <div className="grid grid-cols-[1.75rem_1.5rem_minmax(0,1fr)_3rem] max-sm:grid-cols-[1.25rem_1rem_minmax(0,1fr)]">
      <div className="col-start-3 mb-2">{strip(top)}</div>

      <EvalBar score={score} flipped={flipped} />
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
        classification={known.plies[index - 1]?.classification ?? null}
        bestMove={known.evals[index - 1]?.lines[0]?.move}
        flipped={flipped}
        result={props.result}
        onMove={(uci) => props.onMove(fen, uci)}
        onDragStart={props.onDragStart}
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
      <div className="col-start-3 mt-1">{strip(bottom)}</div>
    </div>
  );
}
