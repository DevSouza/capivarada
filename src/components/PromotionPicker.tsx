"use client";

import { useEffect } from "react";
import type { Color } from "@/lib/types";
import { gridPosition } from "./MiniBoard";
import { PieceIcon } from "./PieceIcon";

const PIECES = [
  { piece: "q", label: "Dama" },
  { piece: "n", label: "Cavalo" },
  { piece: "r", label: "Torre" },
  { piece: "b", label: "Bispo" },
];

interface Props {
  square: string;
  flipped: boolean;
  /** null: desistiu. */
  onChoose: (piece: string | null) => void;
}

/** Escolha da peça sobre a coluna da promoção, a partir da casa dela. */
export function PromotionPicker({ square, flipped, onChoose }: Props) {
  const { x, y } = gridPosition(square, flipped);
  const color: Color = square[1] === "8" ? "w" : "b";
  const atTop = y === 0;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onChoose(null);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onChoose]);

  return (
    <div className="absolute inset-0 z-30 rounded bg-ink/50" onClick={() => onChoose(null)}>
      <div
        role="group"
        aria-label="Promover a"
        className={`absolute flex w-[12.5%] ${atTop ? "top-0 flex-col" : "bottom-0 flex-col-reverse"}`}
        style={{ left: `${x * 12.5}%` }}
      >
        {PIECES.map(({ piece, label }, i) => (
          <button
            key={piece}
            type="button"
            aria-label={label}
            title={label}
            autoFocus={i === 0}
            onClick={(event) => {
              event.stopPropagation();
              onChoose(piece);
            }}
            className="aspect-square w-full bg-[#f1ede4] p-[4%] hover:bg-accent"
          >
            <PieceIcon piece={piece} color={color} />
          </button>
        ))}
      </div>
    </div>
  );
}
