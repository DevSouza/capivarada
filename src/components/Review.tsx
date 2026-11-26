"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { closeLine, fenAt, lineResult, mountLine, playMove, withLine, type Cursor } from "@/lib/line";
import { LINE_MOVES } from "@/lib/notation";
import { gameResult } from "@/lib/players";
import type { Preset } from "@/lib/review";
import { pgnFileName } from "@/lib/savedGame";
import { loadMuted, playSounds, preloadSounds, saveMuted, soundsOf } from "@/lib/sound";
import type { EngineLine, GameReview } from "@/lib/types";
import { BoardFrame } from "./BoardFrame";
import { Controls, NAV_KEYS, step } from "./Controls";
import { EvalGraph } from "./EvalGraph";
import { ExportPgn } from "./ExportPgn";
import { FlipButton } from "./FlipButton";
import { LinePanel } from "./LinePanel";
import { MoveDetail, PendingDetail, StartDetail } from "./MoveDetail";
import { MoveList } from "./MoveList";
import { SoundButton } from "./SoundButton";
import { Summary } from "./Summary";
import { useReviewAnalysis } from "./useReviewAnalysis";

const AUTOPLAY_MS = 1000;

interface Props {
  review: GameReview;
  /** Profundidade da análise da partida, usada também nas variantes. */
  preset: Preset;
  notice: string | null;
  /** Abre com as pretas embaixo. */
  startFlipped: boolean;
  onBack: () => void;
}

export function Review({ review, preset, notice, startFlipped, onBack }: Props) {
  const [cursor, setCursor] = useState<Cursor>({ index: 0, line: null });
  const { index, line } = cursor;
  /** A partida com os lances mostrados: os dela ou os da variante. */
  const game = useMemo(() => withLine(review.game, line), [review, line]);
  const last = game.plies.length;
  const { known, gameReview, error, retry, deepening } = useReviewAnalysis(review, preset, line, index);
  const [flipped, setFlipped] = useState(startFlipped);

  const [autoplay, setAutoplay] = useState(false);
  const playing = autoplay && index < last;

  const [muted, setMuted] = useState(loadMuted);
  const soundedIndex = useRef(0);
  useEffect(() => {
    if (!muted) preloadSounds();
  }, [muted]);
  useEffect(() => {
    const from = soundedIndex.current;
    if (from === index) return;
    soundedIndex.current = index;
    if (muted || index === 0) return;
    // Para trás, a peça só volta: não há captura nem xeque.
    void playSounds(index > from ? soundsOf(game.plies[index - 1].san) : ["move"]);
  }, [index, muted, game]);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => moveTo(index + 1), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [playing, index]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Quem arrasta uma peça pelo teclado já usou a tecla.
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const key = NAV_KEYS.find((item) => item === event.key);
      if (!key) return;
      event.preventDefault();
      setAutoplay(false);
      setCursor((current) => ({ ...current, index: step(current.index, key, last) }));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [last]);

  /** Anda pelos lances mostrados, sem sair da variante. */
  function moveTo(next: number) {
    setCursor((current) => ({ ...current, index: next }));
  }

  /** Escolher um lance à mão pausa a reprodução. */
  function goTo(next: number) {
    setAutoplay(false);
    moveTo(next);
  }

  /** Escolher um lance da partida fecha a variante. */
  function goToGame(next: number) {
    setAutoplay(false);
    setCursor({ index: next, line: null });
  }

  function play(fen: string, uci: string) {
    setAutoplay(false);
    setCursor((current) => playMove(review.game, current, fen, uci));
  }

  function mount(start: number, { pv }: EngineLine) {
    setAutoplay(false);
    setCursor((current) => mountLine(review.game, current, start, pv.slice(0, LINE_MOVES)));
  }

  function leaveLine() {
    setAutoplay(false);
    setCursor(closeLine);
  }

  function togglePlay() {
    setAutoplay(!playing);
    // Já avança ao começar; no fim da partida, recomeça do primeiro lance.
    if (!playing) moveTo(index === last ? 1 : index + 1);
  }

  function toggleMuted() {
    saveMuted(!muted);
    setMuted(!muted);
    // Confirma na hora que o som voltou.
    if (muted) void playSounds(["move"]);
  }

  /** O resumo é da partida: some ao abrir uma variante. */
  const atSummary = index === 0 && !line;
  const result = index !== last ? null : line ? lineResult(fenAt(game, index)) : gameResult(review);

  const actions = (
    <>
      <ExportPgn iconOnly pgn={review.game.pgn} fileName={pgnFileName(review.game.headers)} />
      <FlipButton onClick={() => setFlipped((value) => !value)} />
      <SoundButton muted={muted} onClick={toggleMuted} />
    </>
  );

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
        <div className="flex gap-2 sm:hidden">{actions}</div>
        <BackButton onClick={onBack} />
      </div>

      {[...review.game.warnings, ...(notice ? [notice] : [])].map((warning) => (
        <p key={warning} role="status" className="rounded-lg bg-panel px-4 py-2 text-sm text-soft">
          {warning}
        </p>
      ))}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="mx-auto flex w-full max-w-[min(100%,calc(100vh-5.25rem))] min-w-0 flex-col gap-3 max-lg:max-w-xl">
          <BoardFrame
            game={game}
            known={known}
            index={index}
            clockGame={review.game}
            clockIndex={line ? Math.min(index, line.base) : index}
            flipped={flipped}
            result={result}
            onMove={play}
            onDragStart={() => setAutoplay(false)}
            actions={actions}
          />
          {!atSummary && <div className="lg:hidden">{controls}</div>}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <header className="flex min-h-12 items-center justify-between gap-3">
            <h1 className="min-w-0 text-xl font-semibold">Revisão da partida</h1>
            <div className="shrink-0 max-lg:hidden">
              <BackButton onClick={onBack} />
            </div>
          </header>
          {/* Altura do resumo, com a abertura em duas linhas: os controles não mudam de lugar ao iniciar a partida. */}
          <div className="flex flex-col gap-3 lg:min-h-[35rem]">
            {/* O resumo só aparece antes do primeiro lance. */}
            {atSummary ? (
              <Summary review={gameReview} onSelect={goToGame} />
            ) : (
              <>
                {index === 0 ? (
                  <StartDetail review={review} onMount={(engineLine) => mount(0, engineLine)} />
                ) : known.plies[index - 1] ? (
                  <MoveDetail
                    review={known}
                    index={index}
                    onMount={(engineLine) => mount(index - 1, engineLine)}
                    deepening={deepening}
                  />
                ) : (
                  <PendingDetail ply={game.plies[index - 1]} error={error} onRetry={retry} />
                )}
                {line && (
                  <LinePanel
                    review={review}
                    line={line}
                    known={known}
                    index={index}
                    onSelect={goTo}
                    onClose={leaveLine}
                  />
                )}
                <MoveList
                  review={gameReview}
                  index={line && index > line.base ? null : index}
                  flipped={flipped}
                  onSelect={goToGame}
                />
                {!line && <EvalGraph review={gameReview} index={index} onSelect={goTo} />}
              </>
            )}
          </div>
          {atSummary ? (
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
