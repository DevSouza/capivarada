import { AnalysisCancelled } from "./engine/pool";
import type { Preset } from "./review";
import type { SavedGame } from "./savedGame";

export type Job =
  | { state: "waiting" }
  | { state: "running"; done: number; total: number }
  | { state: "failed"; message: string };

/** Por id da partida. */
export type Jobs = ReadonlyMap<string, Job>;

export interface JobRequest {
  game: SavedGame;
  preset: Preset;
}

type Run = (
  request: JobRequest,
  signal: AbortSignal,
  onProgress: (done: number, total: number) => void,
) => Promise<void>;

interface Events {
  onChange: (jobs: Jobs) => void;
  /** A análise ficou pronta e foi salva. */
  onFinished: () => void;
}

/** Análises em segundo plano, uma partida de cada vez. */
export class BackgroundJobs {
  private jobs = new Map<string, Job>();
  private waiting: JobRequest[] = [];
  private active: { id: string; abort: AbortController } | null = null;
  private closed = false;

  constructor(
    private readonly run: Run,
    private readonly events: Events,
  ) {}

  add(request: JobRequest): void {
    const { id } = request.game;
    const current = this.jobs.get(id);
    if (current && current.state !== "failed") return;
    this.waiting.push(request);
    this.set(id, { state: "waiting" });
    void this.next();
  }

  cancel(ids: string[]): void {
    this.waiting = this.waiting.filter(({ game }) => !ids.includes(game.id));
    for (const id of ids) {
      if (this.active?.id === id) this.active.abort.abort();
      if (this.jobs.has(id)) this.set(id, null);
    }
  }

  close(): void {
    this.closed = true;
    this.waiting = [];
    this.active?.abort.abort();
  }

  private set(id: string, job: Job | null): void {
    if (this.closed) return;
    this.jobs = new Map(this.jobs);
    if (job) this.jobs.set(id, job);
    else this.jobs.delete(id);
    this.events.onChange(this.jobs);
  }

  private async next(): Promise<void> {
    if (this.active) return;
    const request = this.waiting.shift();
    if (!request) return;
    const { id } = request.game;
    const abort = new AbortController();
    this.active = { id, abort };
    // Cancelada, a partida pode já ter voltado para a fila: o estado dela não é mais deste trabalho.
    const update = (job: Job | null) => {
      if (!abort.signal.aborted) this.set(id, job);
    };
    update({ state: "running", done: 0, total: 0 });
    try {
      await this.run(request, abort.signal, (done, total) => update({ state: "running", done, total }));
      update(null);
      if (!abort.signal.aborted && !this.closed) this.events.onFinished();
    } catch (error) {
      if (!(error instanceof AnalysisCancelled)) {
        update({ state: "failed", message: error instanceof Error ? error.message : "Algo deu errado." });
      }
    }
    this.active = null;
    void this.next();
  }
}
