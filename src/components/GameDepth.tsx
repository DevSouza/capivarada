import type { Job } from "@/lib/backgroundJobs";
import { nextPreset, PRESETS, type Preset } from "@/lib/review";
import { isCurrent, type SavedGame } from "@/lib/savedGame";

interface Props {
  game: SavedGame;
  /** Profundidade de quem ainda não foi analisada. */
  defaultPreset: Preset;
  job: Job | undefined;
  onStart: (preset: Preset) => void;
  onCancel: () => void;
}

const BUTTON = "shrink-0 rounded bg-raised px-2.5 py-1 font-medium text-text hover:bg-line";

/** Profundidade da análise salva e o botão que a refaz mais fundo, em segundo plano. */
export function GameDepth({ game, defaultPreset, job, onStart, onCancel }: Props) {
  const analysis = isCurrent(game.analysis) ? game.analysis : null;
  const target = analysis ? nextPreset(analysis.preset) : (game.analysis?.preset ?? defaultPreset);
  const verb = analysis ? "Aprofundar" : "Analisar";

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {analysis && (
        <span>
          Análise {PRESETS[analysis.preset].label}
          {analysis.depth != null && ` · profundidade ${analysis.depth}`}
        </span>
      )}
      {job && job.state !== "failed" ? (
        <>
          <span role="status" className="flex items-center gap-2 text-accent tabular-nums">
            {job.state === "waiting" ? (
              "Na fila…"
            ) : (
              <>
                <progress
                  value={job.done}
                  max={job.total || 1}
                  aria-label="Posições analisadas"
                  className="h-1.5 w-20 appearance-none overflow-hidden rounded-full bg-raised [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-raised [&::-webkit-progress-value]:bg-accent"
                />
                {analysis ? "Aprofundando" : "Analisando"} {job.done}/{job.total || "…"}
              </>
            )}
          </span>
          <button type="button" onClick={onCancel} className={BUTTON}>
            Cancelar
          </button>
        </>
      ) : (
        <>
          {job && <span className="text-[#ff9c9c]">{job.message}</span>}
          {target && (
            <button
              type="button"
              title={`${verb} em segundo plano, na profundidade ${PRESETS[target].label}`}
              onClick={() => onStart(target)}
              className={BUTTON}
            >
              {job ? "Tentar de novo" : verb}
            </button>
          )}
        </>
      )}
    </span>
  );
}
