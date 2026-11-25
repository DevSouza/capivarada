"use client";

import { useEffect, useState } from "react";
import { pgnFileName } from "@/lib/savedGame";
import type { GameReview } from "@/lib/types";
import { BoardFrame } from "./BoardFrame";
import { Controls, NAV_KEYS, step } from "./Controls";
import { EvalGraph } from "./EvalGraph";
import { ExportPgn } from "./ExportPgn";
import { FlipButton } from "./FlipButton";
import { MoveDetail } from "./MoveDetail";
import { MoveList } from "./MoveList";
import { Summary } from "./Summary";

const AUTOPLAY_MS = 2000;

interface Props {
  review: GameReview;
  notice: string | null;
  onBack: () => void;
}

export function Review({ review, notice, onBack }: Props) {
  const last = review.plies.length;
  /** 0 = posição inicial; n = depois do n-ésimo lance. */
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [autoplay, setAutoplay] = useState(false);
  const playing = autoplay && index < last;

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setIndex(index + 1), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [playing, index]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = NAV_KEYS.find((item) => item === event.key);
      if (!key) return;
      event.preventDefault();
      setAutoplay(false);
      setIndex((current) => step(current, key, last));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [last]);

  /** Escolher um lance à mão pausa a reprodução. */
  function goTo(next: number) {
    setAutoplay(false);
    setIndex(next);
  }

  function togglePlay() {
    setAutoplay(!playing);
    // Já avança ao começar; no fim da partida, recomeça do primeiro lance.
    if (!playing) setIndex(index === last ? 1 : index + 1);
  }

  const flip = () => setFlipped((value) => !value);

  const controls = (
    <Controls
      index={index}
      last={last}
      playing={playing}
      onNavigate={(key) => goTo(step(index, key, last))}
      onTogglePlay={togglePlay}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Em telas estreitas a coluna do título fica abaixo do tabuleiro; as ações continuam no topo. */}
      <div className="flex items-center justify-end gap-2 lg:hidden">
        <div className="flex gap-2 sm:hidden">
          <ExportPgn iconOnly pgn={review.game.pgn} fileName={pgnFileName(review.game.headers)} />
          <FlipButton onClick={flip} />
        </div>
        <BackButton onClick={onBack} />
      </div>

      {[...review.game.warnings, ...(notice ? [notice] : [])].map((warning) => (
        <p key={warning} role="status" className="rounded-lg bg-panel px-4 py-2 text-sm text-soft">
          {warning}
        </p>
      ))}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="mx-auto flex w-full max-w-[min(100%,calc(100vh-5.25rem))] min-w-0 flex-col gap-3 max-lg:max-w-xl">
          <BoardFrame review={review} index={index} flipped={flipped} onFlip={flip} />
          {index > 0 && <div className="lg:hidden">{controls}</div>}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <header className="flex min-h-12 items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold">Revisão da partida</h1>
              {review.opening && <p className="text-sm text-soft">{review.opening}</p>}
            </div>
            <div className="shrink-0 max-lg:hidden">
              <BackButton onClick={onBack} />
            </div>
          </header>
          {/* Altura do resumo: os controles não mudam de lugar ao iniciar a partida. */}
          <div className="flex flex-col gap-4 lg:min-h-[33.5625rem]">
            {/* O resumo só aparece antes do primeiro lance. */}
            {index === 0 ? (
              <Summary review={review} onSelect={goTo} />
            ) : (
              <>
                <MoveDetail review={review} index={index} flipped={flipped} />
                <MoveList review={review} index={index} flipped={flipped} onSelect={goTo} />
                <EvalGraph review={review} index={index} onSelect={goTo} />
              </>
            )}
          </div>
          {index === 0 ? (
            <button
              type="button"
              onClick={() => goTo(1)}
              className="h-10 rounded-lg bg-accent font-semibold text-[#2a1a02] hover:brightness-110"
            >
              Iniciar Revisão
            </button>
          ) : (
            // Em telas estreitas os controles ficam junto do tabuleiro.
            <div className="max-lg:hidden">{controls}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-raised px-4 py-2 text-sm font-medium hover:brightness-125"
    >
      Suas partidas
    </button>
  );
}
