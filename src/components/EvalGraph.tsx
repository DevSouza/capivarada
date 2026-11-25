"use client";

import { useState, type PointerEvent } from "react";
import { expectedPoints } from "@/lib/analysis/winprob";
import { formatScore, sanToPt } from "@/lib/notation";
import type { Classification, GameReview } from "@/lib/types";
import { CLASS_META } from "./Badge";

/** Só os momentos decisivos ganham ponto; o resto fica na lista de lances. */
const MARKED: Classification[] = ["brilliant", "great", "mistake", "miss", "blunder"];

interface Props {
  review: GameReview;
  index: number;
  onSelect: (index: number) => void;
}

export function EvalGraph({ review, index, onSelect }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const last = review.evals.length - 1;
  const x = (i: number) => (i / last) * 100;
  const y = (i: number) => 100 - expectedPoints(review.evals[i].score, "w") * 100;
  const points = review.evals.map((_, i) => `${x(i)},${y(i)}`).join(" ");

  const indexAt = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    return Math.max(0, Math.min(last, Math.round(ratio * last)));
  };

  const shown = hover ?? index;
  const ply = shown > 0 ? review.plies[shown - 1] : null;

  return (
    <section className="rounded-lg bg-panel p-3">
      <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
        <h2 className="font-medium">Chance de vitória das brancas</h2>
        <p className="truncate text-soft">
          <span className="font-semibold text-text tabular-nums">{formatScore(review.evals[shown].score)}</span>{" "}
          {ply ? `${ply.moveNumber}${ply.color === "w" ? "." : "…"} ${sanToPt(ply.san)}` : "Posição inicial"}
        </p>
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Lance selecionado no gráfico"
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={index}
        aria-valuetext={`${formatScore(review.evals[index].score)}, lance ${index} de ${last}`}
        className="relative h-16 cursor-pointer touch-pan-y"
        onPointerMove={(event) => setHover(indexAt(event))}
        onPointerLeave={() => setHover(null)}
        onPointerDown={(event) => onSelect(indexAt(event))}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <polygon points={`0,100 ${points} 100,100`} fill="#f1ede4" fillOpacity="0.12" />
          <line x1="0" x2="100" y1="50" y2="50" stroke="#313b4d" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line
            x1={x(shown)}
            x2={x(shown)}
            y1="0"
            y2="100"
            stroke="#8a95a8"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={points}
            fill="none"
            stroke="#f1ede4"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {review.plies.map(
          (item, i) =>
            MARKED.includes(item.classification) && (
              <Dot key={i} left={x(i + 1)} top={y(i + 1)} color={CLASS_META[item.classification].color} />
            ),
        )}
        <Dot left={x(shown)} top={y(shown)} color="#f0b35a" />
      </div>
    </section>
  );
}

function Dot({ left, top, color }: { left: number; top: number; color: string }) {
  return (
    <span
      className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-panel"
      style={{ left: `${left}%`, top: `${top}%`, backgroundColor: color }}
    />
  );
}
