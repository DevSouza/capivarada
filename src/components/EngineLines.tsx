"use client";

import { formatScore, playLine } from "@/lib/notation";
import type { EngineLine } from "@/lib/types";
import { CLASS_META } from "./Badge";
import { useMovePreview } from "./useMovePreview";

interface Props {
  /** Posição de onde as linhas partem. */
  fen: string;
  lines: EngineLine[];
  /** Lance jogado na partida, destacado se for uma das linhas. */
  played: string;
  flipped: boolean;
}

export function EngineLines({ fen, lines, played, flipped }: Props) {
  const { bind, popover } = useMovePreview(flipped);
  return (
    <>
      <ol aria-label="Melhores linhas do motor" className="mt-2 text-sm">
        {lines.map((line) => {
          const isPlayed = line.move === played;
          const score = formatScore(line.score);
          return (
            <li
              key={line.move}
              className={`flex h-6 items-center gap-2 ${isPlayed ? "font-medium text-text" : "text-muted"}`}
            >
              <span className="w-9 shrink-0 text-xs font-semibold text-soft tabular-nums">{score}</span>
              <span className="-ml-0.5 truncate">
                {playLine(fen, line.pv).map((move, i) => (
                  <span
                    key={i}
                    className="inline-block cursor-default rounded px-0.5 hover:bg-line hover:text-text"
                    {...bind({ ...move, color: CLASS_META.best.color, detail: i === 0 ? score : undefined })}
                  >
                    {move.san}
                    {/* Espaço de verdade para copiar e para leitores de tela. */}{" "}
                  </span>
                ))}
              </span>
              {isPlayed && <span className="sr-only">(lance jogado)</span>}
            </li>
          );
        })}
      </ol>
      {popover}
    </>
  );
}
