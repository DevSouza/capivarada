"use client";

import { Chess } from "chess.js";
import { materialBalance } from "@/lib/analysis/sacrifice";
import { capturedBy, clockAt, formatClock, playerName, playerRating } from "@/lib/players";
import type { Color, GameReview } from "@/lib/types";
import { Avatar } from "./Avatar";
import { PieceIcon } from "./PieceIcon";

interface Props {
  review: GameReview;
  index: number;
  color: Color;
  fen: string;
}

export function PlayerStrip({ review, index, color, fen }: Props) {
  const { headers, plies } = review.game;
  const name = playerName(headers, color);
  const rating = playerRating(headers, color);
  const advantage = materialBalance(new Chess(fen), color);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar headers={headers} color={color} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5 text-sm leading-5">
          <span className="truncate font-semibold" title={name}>
            {name}
          </span>
          {rating && <span className="shrink-0 text-soft">({rating})</span>}
        </div>
        <Captured pieces={capturedBy(plies, index, color)} color={color === "w" ? "b" : "w"} advantage={advantage} />
      </div>
      <Clock
        seconds={clockAt(review.game, index, color)}
        color={color}
        active={fen.split(" ")[1] === color}
      />
    </div>
  );
}

function Captured({ pieces, color, advantage }: { pieces: string[]; color: Color; advantage: number }) {
  return (
    <div className="flex h-5 items-center text-xs text-soft">
      {pieces.map((piece, i) => (
        <span
          key={i}
          // Peças iguais ficam sobrepostas; tipos diferentes, separados.
          className={`w-4 shrink-0 ${i === 0 ? "" : pieces[i - 1] === piece ? "-ml-2" : "ml-0.5"}`}
        >
          <PieceIcon piece={piece} color={color} />
        </span>
      ))}
      {advantage > 0 && <span className="ml-1 tabular-nums">+{advantage}</span>}
    </div>
  );
}

function Clock({ seconds, color, active }: { seconds: number | null; color: Color; active: boolean }) {
  if (seconds === null) return null;
  return (
    <div
      className={`flex h-10 w-32 shrink-0 items-center justify-between rounded px-3 max-sm:w-24 max-sm:px-2 ${color === "w" ? "bg-[#f1ede4] text-[#1b2230]" : "bg-raised text-text"} ${active ? "" : "opacity-60"}`}
    >
      {active ? (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-label="Na vez" role="img" className="shrink-0">
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 4.5V8l2.2 1.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <span />
      )}
      <span className="text-xl font-semibold tabular-nums max-sm:text-base">{formatClock(seconds)}</span>
    </div>
  );
}
