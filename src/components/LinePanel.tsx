"use client";

import { useEffect, useRef } from "react";
import type { KnownReview } from "@/lib/deepen";
import { formatScore, numberedMove } from "@/lib/notation";
import type { Line } from "@/lib/line";
import type { GameReview } from "@/lib/types";
import { Badge } from "./Badge";
import { MoveSan } from "./MoveSan";

interface Props {
  review: GameReview;
  line: Line;
  known: KnownReview;
  index: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

/** Os lances experimentados, com a classificação de cada um. */
export function LinePanel({ review, line, known, index, onSelect, onClose }: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const origin = line.base > 0 ? review.plies[line.base - 1] : null;

  // Rola só a lista, nunca a página. As avaliações que chegam também mudam as quebras de linha.
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>("[aria-current]");
    if (list && active) list.scrollTop = active.offsetTop - list.offsetTop - list.clientHeight / 2 + active.clientHeight / 2;
  }, [index, line, known]);

  return (
    <section aria-label="Variante" className="rounded-lg bg-panel px-3 py-2.5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-sm">
          <span className="font-medium">Variante</span>{" "}
          <span className="text-soft">
            {origin ? `depois de ${numberedMove(origin.moveNumber, origin.color, origin.san)}` : "da posição inicial"}
          </span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg bg-raised px-3 py-1.5 text-sm font-medium hover:brightness-125"
        >
          Voltar à partida
        </button>
      </div>
      <ol ref={listRef} aria-label="Lances da variante" className="flex max-h-18 flex-wrap gap-1 overflow-y-auto">
        {line.plies.map((ply, i) => {
          const position = line.base + i + 1;
          const classification = known.plies[position - 1]?.classification ?? null;
          const score = known.evals[position]?.score;
          return (
            <li key={position}>
              <button
                type="button"
                aria-current={index === position ? "step" : undefined}
                onClick={() => onSelect(position)}
                className="flex h-8 items-center gap-1.5 rounded px-2 hover:bg-raised aria-[current]:bg-line aria-[current]:font-semibold"
              >
                {(ply.color === "w" || i === 0) && (
                  <span className="text-sm font-normal text-muted tabular-nums">
                    {ply.moveNumber}
                    {ply.color === "w" ? "." : "…"}
                  </span>
                )}
                {classification ? (
                  <Badge kind={classification} size={18} />
                ) : (
                  <span role="img" aria-label="Analisando" className="size-4.5 animate-pulse rounded-full bg-muted" />
                )}
                <MoveSan ply={ply} classification={classification} />
                {score && (
                  <span className="text-[0.8125rem] font-normal text-muted tabular-nums">{formatScore(score)}</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
