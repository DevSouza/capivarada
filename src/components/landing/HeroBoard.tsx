"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatScore } from "@/lib/notation";
import { Badge, CLASS_META, classTextColor } from "../Badge";
import { Capybara } from "../Capybara";
import { EvalBar } from "../EvalBar";
import { gridPosition, MiniBoard } from "../MiniBoard";
import { BLUNDER_STEP, MOVES, SCORES, START_FEN } from "./showcase";

const REDUCED = "(prefers-reduced-motion: reduce)";

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCED);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

/** Os momentos que importam ficam mais tempo na tela. */
function holdMs(step: number): number {
  if (step === MOVES.length) return 4500;
  if (step === BLUNDER_STEP) return 3400;
  if (step === BLUNDER_STEP - 1) return 2400;
  return step === 0 ? 700 : 850;
}

/** Uma partida real sendo revisada: o próprio produto como abertura da página. */
export function HeroBoard() {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [played, setPlayed] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Sem animação, mostra parado o momento da capivara.
  const step = reduced ? BLUNDER_STEP : played;
  const running = !reduced && !paused && visible;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (rootRef.current) observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setPlayed(played === MOVES.length ? 0 : played + 1), holdMs(played));
    return () => clearTimeout(timer);
  }, [running, played]);

  const move = step > 0 ? MOVES[step - 1] : null;
  const badgeAt = move && gridPosition(move.to, false);
  const caught = step >= BLUNDER_STEP;

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-[30rem]">
      {/* A capivara espreita atrás da borda do tabuleiro e aparece no erro. */}
      <div className="relative ml-9 h-24 overflow-hidden sm:h-30" aria-hidden>
        <div
          className={`absolute bottom-0 left-[5%] w-36 text-[#c98f4e] transition-transform sm:w-44 ${caught ? "translate-y-[18%] duration-500 ease-[cubic-bezier(.3,1.6,.5,1)]" : "translate-y-[105%] duration-300 ease-in"}`}
        >
          <Capybara className="block w-full" />
        </div>
        <div
          className={`absolute bottom-9 left-[calc(5%+9.25rem)] origin-bottom-left rounded-2xl rounded-bl-sm bg-[#dc4646] px-3 py-1 font-display text-lg font-bold text-white transition-all sm:bottom-12 sm:left-[calc(5%+11.5rem)] ${step === BLUNDER_STEP ? "scale-100 opacity-100 delay-300 duration-300" : "scale-50 opacity-0 duration-150"}`}
        >
          Capivarada!
        </div>
      </div>

      <div
        className={`grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 ${step === BLUNDER_STEP ? "board-shake" : ""}`}
        role="img"
        aria-label="Demonstração: o Mate de Légal sendo revisado, com a capivara das pretas em 5… Bxd1"
      >
        <EvalBar score={SCORES[step]} flipped={false} />
        <div className="relative rounded shadow-2xl shadow-black/50">
          <MiniBoard
            key={step}
            fen={move ? move.fen : START_FEN}
            flipped={false}
            label=""
            move={move ? { from: move.from, to: move.to, color: CLASS_META[move.kind].color } : undefined}
          />
          {move && badgeAt && (
            <span
              key={`badge-${step}`}
              className="badge-pop absolute z-20 w-[8%]"
              style={{ left: `${badgeAt.x * 12.5 + 8.5}%`, top: `${Math.max(0, badgeAt.y * 12.5 - 4)}%` }}
            >
              <Badge kind={move.kind} size="100%" />
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 ml-9 flex h-10 items-center gap-3">
        <p className="flex min-w-0 flex-1 items-center gap-2.5">
          {move ? (
            <>
              <Badge kind={move.kind} size={24} />
              <span className="font-semibold whitespace-nowrap">{move.label}</span>
              <span className="truncate" style={{ color: classTextColor(move.kind) }}>
                {CLASS_META[move.kind].label}
              </span>
            </>
          ) : (
            <span className="text-soft">Mate de Légal</span>
          )}
        </p>
        <span className="text-sm text-soft tabular-nums">{formatScore(SCORES[step])}</span>
        {!reduced && (
          <button
            type="button"
            aria-label={paused ? "Continuar demonstração" : "Pausar demonstração"}
            title={paused ? "Continuar" : "Pausar"}
            onClick={() => setPaused(!paused)}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-panel text-soft hover:bg-raised hover:text-text"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d={paused ? "M7 4.5v15l12-7.5z" : "M6 5h4v14H6zM14 5h4v14h-4z"} />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
