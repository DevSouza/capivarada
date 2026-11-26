import { sanToPt, splitSan } from "@/lib/notation";
import type { Classification, Ply } from "@/lib/types";
import { classTextColor } from "./Badge";
import { PieceIcon } from "./PieceIcon";

interface Props {
  ply: Ply;
  /** null enquanto o lance não foi analisado. */
  classification: Classification | null;
}

/** Lance na cor da classificação, com o ícone da peça no lugar da letra; peão não tem ícone. */
export function MoveSan({ ply, classification }: Props) {
  const { piece, rest } = splitSan(ply.san);
  return (
    <>
      <span className="sr-only">{sanToPt(ply.san)}</span>
      <span
        aria-hidden
        className="flex items-center gap-1.5"
        style={classification ? { color: classTextColor(classification) } : undefined}
      >
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
