"use client";

import { useEffect, useRef } from "react";
import { formatScore, numberedMove, sanToPt, splitSan } from "@/lib/notation";
import type { GameReview, ReviewedPly } from "@/lib/types";
import { Badge, CLASS_META, classTextColor } from "./Badge";
import { PieceIcon } from "./PieceIcon";
import { useMovePreview, type MovePreview } from "./useMovePreview";

interface Props {
  review: GameReview;
  index: number;
  flipped: boolean;
  onSelect: (index: number) => void;
}

export function MoveList({ review, index, flipped, onSelect }: Props) {
  const { bind, hide, popover } = useMovePreview(flipped);
  const listRef = useRef<HTMLOListElement>(null);

  // Rola só a lista, nunca a página.
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>("[aria-current]");
    if (!list || !active) return;
    const listBox = list.getBoundingClientRect();
    const box = active.getBoundingClientRect();
    if (box.top < listBox.top) list.scrollTop -= listBox.top - box.top;
    else if (box.bottom > listBox.bottom) list.scrollTop += box.bottom - listBox.bottom;
  }, [index]);

  const rows: { number: number; plies: (number | null)[] }[] = [];
  review.plies.forEach((ply, i) => {
    if (ply.color === "w") rows.push({ number: ply.moveNumber, plies: [i, null] });
    else if (rows.length === 0) rows.push({ number: ply.moveNumber, plies: [null, i] });
    else rows[rows.length - 1].plies[1] = i;
  });

  return (
    <div data-preview-panel className="rounded-lg bg-panel p-2 text-base">
      {/* Cinco linhas de 2rem visíveis; o resto rola. */}
      <ol ref={listRef} aria-label="Lances" className="max-h-40 overflow-y-auto">
        {rows.map((row) => (
          <li key={row.number} className="grid h-8 grid-cols-[2.5rem_1fr_1fr] items-center gap-1 rounded even:bg-raised/60">
            <span className="pr-2 text-right text-muted tabular-nums">{row.number}.</span>
            {row.plies.map((i, column) =>
              i === null ? (
                <span key={column} className="px-2 text-muted">
                  {column === 0 ? "…" : ""}
                </span>
              ) : (
                <button
                  key={column}
                  type="button"
                  aria-current={index === i + 1 ? "step" : undefined}
                  onClick={() => {
                    hide();
                    onSelect(i + 1);
                  }}
                  // O lance atual já está no tabuleiro principal.
                  {...bind(index === i + 1 ? null : toPreview(review, i))}
                  className="flex h-8 items-center gap-2 rounded px-2 text-left hover:bg-raised aria-[current]:bg-line aria-[current]:font-semibold"
                >
                  <Badge kind={review.plies[i].classification} size={20} />
                  <Move ply={review.plies[i]} />
                  <span className="ml-auto text-[0.8125rem] font-normal text-muted tabular-nums">
                    {formatScore(review.evals[i + 1].score)}
                  </span>
                </button>
              ),
            )}
          </li>
        ))}
      </ol>
      {popover}
    </div>
  );
}

function toPreview(review: GameReview, i: number): MovePreview {
  const ply = review.plies[i];
  return {
    fenAfter: ply.fenAfter,
    from: ply.from,
    to: ply.to,
    color: CLASS_META[ply.classification].color,
    label: numberedMove(ply.moveNumber, ply.color, ply.san),
    detail: CLASS_META[ply.classification].label,
  };
}

/** Lance na cor da classificação, com o ícone da peça no lugar da letra; peão não tem ícone. */
function Move({ ply }: { ply: ReviewedPly }) {
  const { piece, rest } = splitSan(ply.san);
  return (
    <>
      <span className="sr-only">{sanToPt(ply.san)}</span>
      <span aria-hidden className="flex items-center gap-1.5" style={{ color: classTextColor(ply.classification) }}>
        {piece && (
          <span className="w-5 shrink-0">
            <PieceIcon piece={piece} color={ply.color} />
          </span>
        )}
        {rest}
      </span>
    </>
  );
}
