"use client";

import { useEffect, useRef } from "react";
import { playerName } from "@/lib/players";
import type { Color } from "@/lib/types";
import { PieceIcon } from "./PieceIcon";

const SIDES: { color: Color; label: string }[] = [
  { color: "w", label: "Brancas" },
  { color: "b", label: "Pretas" },
];

interface Props {
  headers: Record<string, string>;
  /** null: nenhum dos dois. */
  onChoose: (color: Color | null) => void;
}

/** Pergunta qual dos jogadores é o usuário. */
export function OwnerDialog({ headers, onChoose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="owner-title"
      onCancel={(event) => {
        event.preventDefault();
        onChoose(null);
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-line bg-panel p-6 text-text backdrop:bg-black/60"
    >
      <h2 id="owner-title" className="text-xl font-semibold">
        Quem é você nesta partida?
      </h2>
      <p className="mt-1 text-sm text-soft">
        Seu nome fica salvo neste navegador, e as próximas partidas abrem com o tabuleiro do seu lado.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {SIDES.map(({ color, label }) => (
          <button
            key={color}
            type="button"
            onClick={() => onChoose(color)}
            className="flex min-w-0 flex-col items-center gap-1 rounded-lg bg-raised p-4 hover:brightness-125"
          >
            <span aria-hidden className="w-12">
              <PieceIcon piece="k" color={color} />
            </span>
            <span className="text-sm text-soft">{label}</span>
            <span className="max-w-full font-semibold wrap-anywhere">{playerName(headers, color)}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChoose(null)}
        className="mt-2 w-full rounded-lg border border-line px-4 py-2.5 text-sm hover:bg-raised"
      >
        Nenhum
      </button>
    </dialog>
  );
}
