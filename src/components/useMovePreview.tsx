"use client";

import { useEffect, useRef, useState, type FocusEvent, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MiniBoard } from "./MiniBoard";
import { placeNear } from "./placeNear";

export interface MovePreview {
  fenAfter: string;
  from: string;
  to: string;
  /** Cor do destaque das casas. */
  color: string;
  label: string;
  detail?: string;
}

const DELAY_MS = 150;
const SIZE = { width: 256, height: 292 };

/** Mostra o lance em um tabuleiro pequeno ao passar o mouse ou focar pelo teclado. */
export function useMovePreview(flipped: boolean): {
  /** Eventos do elemento de cada lance; null quando não há o que mostrar. */
  bind: (preview: MovePreview | null) => object;
  hide: () => void;
  popover: ReactNode;
} {
  const [shown, setShown] = useState<{ preview: MovePreview; left: number; top: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function hide() {
    clearTimeout(timer.current);
    setShown(null);
  }

  function show(target: HTMLElement, preview: MovePreview) {
    clearTimeout(timer.current);
    // Já aberto, acompanha o mouse na hora; a espera só evita piscar de passagem.
    timer.current = setTimeout(() => setShown({ preview, ...placeNear(target, SIZE) }), shown ? 0 : DELAY_MS);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const open = shown !== null;
  useEffect(() => {
    if (!open) return;
    const close = () => setShown(null);
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return {
    hide,
    bind: (preview) => ({
      onPointerEnter: (event: PointerEvent<HTMLElement>) => {
        // No toque não há "passar por cima": o toque já escolhe o lance.
        if (preview && event.pointerType !== "touch") show(event.currentTarget, preview);
      },
      onPointerLeave: hide,
      onFocus: (event: FocusEvent<HTMLElement>) => {
        if (preview && event.currentTarget.matches(":focus-visible")) show(event.currentTarget, preview);
      },
      onBlur: hide,
    }),
    // Fora do painel, para não ser anunciado como parte do lance atual.
    popover:
      shown &&
      createPortal(
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 rounded-lg border border-line bg-raised p-2 shadow-2xl"
          style={{ left: shown.left, top: shown.top, width: SIZE.width }}
        >
          <MiniBoard
            key={`${shown.preview.fenAfter}${shown.preview.from}`}
            fen={shown.preview.fenAfter}
            flipped={flipped}
            label={`Posição depois de ${shown.preview.label}`}
            move={shown.preview}
          />
          <p className="mt-2 flex h-6 items-center justify-between gap-2 px-1 text-sm">
            <span className="font-semibold">{shown.preview.label}</span>
            <span className="text-soft tabular-nums">{shown.preview.detail}</span>
          </p>
        </div>,
        document.body,
      ),
  };
}
