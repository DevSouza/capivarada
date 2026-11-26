"use client";

import {
  dateLabel,
  endingLabel,
  openingName,
  ownerColor,
  ratingDiff,
  resultOf,
  scoreOf,
  timeControlLabel,
} from "@/lib/gameInfo";
import type { Job } from "@/lib/backgroundJobs";
import type { Preset } from "@/lib/review";
import { formatAccuracy } from "@/lib/notation";
import { playerName, playerRating, type GameResult } from "@/lib/players";
import { isCurrent, type SavedGame } from "@/lib/savedGame";
import type { Color } from "@/lib/types";
import { Avatar } from "./Avatar";
import { GameDepth } from "./GameDepth";
import { MiniBoard } from "./MiniBoard";

interface Props {
  game: SavedGame;
  owner: string | null;
  selected: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onToggleSelected: () => void;
  defaultPreset: Preset;
  /** Análise em segundo plano desta partida. */
  job: Job | undefined;
  onAnalyze: (preset: Preset) => void;
  onCancelAnalysis: () => void;
}

export function GameRow(props: Props) {
  const { game, owner, selected, onOpen, onToggleFavorite, onToggleSelected } = props;
  const { headers, finalFen } = game;
  const result = resultOf(headers, finalFen);
  const mine = ownerColor(headers, owner);
  const time = timeControlLabel(headers);
  const analysis = isCurrent(game.analysis) ? game.analysis : null;
  const title = `${playerName(headers, "w")} × ${playerName(headers, "b")}`;
  const details = [
    openingName(headers, game.analysis?.opening),
    `${game.moves} ${game.moves === 1 ? "lance" : "lances"}`,
    endingLabel(headers, finalFen),
    analysis && `Precisão ${formatAccuracy(analysis.accuracy.w)} / ${formatAccuracy(analysis.accuracy.b)}`,
  ].filter(Boolean);

  return (
    <li
      className={`grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 p-4 max-sm:gap-x-3 [contain-intrinsic-size:auto_11rem] [content-visibility:auto] sm:grid-cols-[9rem_4.5rem_minmax(0,1fr)] ${selected ? "bg-raised" : "bg-panel"}`}
    >
      <button type="button" onClick={onOpen} aria-label={`Revisar ${title}`} tabIndex={-1} className="self-start">
        <MiniBoard fen={finalFen} flipped={mine === "b"} />
      </button>

      <div className="flex flex-col items-center justify-center gap-1 text-center max-sm:hidden">
        {time && (
          <>
            <Stopwatch />
            <span className="text-sm font-semibold">{time}</span>
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-center gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex min-w-0 flex-1 basis-56 items-center gap-3 max-sm:basis-full">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Player game={game} color="w" result={result} />
              <Player game={game} color="b" result={result} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex flex-col gap-1 text-center text-sm font-semibold tabular-nums">
                <span className="leading-6">{scoreOf(result, "w")}</span>
                <span className="leading-6">{scoreOf(result, "b")}</span>
              </div>
              <Outcome result={result} mine={mine} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={onOpen}
              className="rounded-md bg-line px-4 py-2 text-sm font-semibold hover:brightness-125"
            >
              Revisar
            </button>
            <span className="w-32 text-sm text-soft max-sm:w-auto">{dateLabel(headers)}</span>
            <button
              type="button"
              aria-pressed={game.favorite}
              aria-label={`Favoritar ${title}`}
              title={game.favorite ? "Tirar das favoritas" : "Favoritar"}
              onClick={onToggleFavorite}
              className={`p-1 ${game.favorite ? "text-[#ea7f86]" : "text-muted hover:text-text"}`}
            >
              <Heart filled={game.favorite} />
            </button>
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelected}
              aria-label={`Selecionar ${title}`}
              className="size-5 cursor-pointer accent-accent"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line pt-3 text-xs text-soft">
          {time && <span className="sm:hidden">{time}</span>}
          {details.map((detail) => (
            <span key={detail}>{detail}</span>
          ))}
          <GameDepth
            game={game}
            defaultPreset={props.defaultPreset}
            job={props.job}
            onStart={props.onAnalyze}
            onCancel={props.onCancelAnalysis}
          />
        </div>
      </div>
    </li>
  );
}

function Player({ game, color, result }: { game: SavedGame; color: Color; result: GameResult | null }) {
  const { headers } = game;
  const name = playerName(headers, color);
  const rating = playerRating(headers, color);
  const diff = ratingDiff(headers, color);
  const won = result?.kind === "win" && result.winner === color;
  return (
    <div className="flex h-6 min-w-0 items-center gap-2 text-sm">
      <Avatar headers={headers} color={color} size={24} />
      <span
        aria-hidden
        className={`size-3 shrink-0 rounded-[3px] border-2 max-sm:hidden ${color === "w" ? "bg-white" : "bg-[#4a5467]"} ${won ? "border-[#86c04f]" : color === "w" ? "border-white" : "border-[#4a5467]"}`}
      />
      <span className="truncate font-semibold" title={name}>
        {name}
      </span>
      {rating && <span className="shrink-0 text-soft">({rating})</span>}
      {diff !== null && (
        <span className={`shrink-0 text-sm tabular-nums ${diff >= 0 ? "text-[#9cc97a]" : "text-[#ff9c9c]"}`}>
          {diff >= 0 ? `+${diff}` : `−${-diff}`}
        </span>
      )}
    </div>
  );
}

/** Vitória, derrota ou empate de quem é dono da lista. */
function Outcome({ result, mine }: { result: GameResult | null; mine: Color | null }) {
  if (!result || !mine) return <span className="size-4" />;
  const [label, symbol, color] =
    result.kind === "draw"
      ? ["Empate", "=", "#8a95a8"]
      : result.winner === mine
        ? ["Vitória", "+", "#86c04f"]
        : ["Derrota", "−", "#dc4646"];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="flex size-4 items-center justify-center rounded-[3px] text-sm leading-none font-bold text-[#10141d]"
      style={{ backgroundColor: color }}
    >
      {symbol}
    </span>
  );
}

function Stopwatch() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#86c04f" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="14" r="7.5" />
      <path d="M12 10v4M9.5 2.5h5M12 2.5v4M18 7l1.5-1.5" strokeLinecap="round" />
    </svg>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20.5 4 12.6a5 5 0 0 1 7-7.1l1 1 1-1a5 5 0 0 1 7 7.1z" />
    </svg>
  );
}
