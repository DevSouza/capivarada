"use client";

import { defaultPieces } from "react-chessboard";
import type { Color } from "@/lib/types";

/** Peça pequena para textos e listas; ocupa a largura do elemento pai. */
export function PieceIcon({ piece, color }: { piece: string; color: Color }) {
  return defaultPieces[`${color}${piece.toUpperCase()}`]({
    // As pretas somem no fundo escuro sem contorno claro.
    svgStyle: color === "b" ? { filter: "drop-shadow(0 0 0.5px #fff) drop-shadow(0 0 0.5px #fff)" } : {},
  });
}
