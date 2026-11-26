import type { PositionEval } from "../types";
import type { SearchRequest } from "./worker";

export interface QueuedSearch {
  key: string;
  request: SearchRequest;
}

export interface Engine {
  init(): Promise<void>;
  search(request: SearchRequest): Promise<PositionEval>;
  terminate(): void;
}

interface Events {
  onResult: (key: string, result: PositionEval) => void;
  onError: (error: Error) => void;
}

/** Buscas sob demanda. Os motores só são criados quando há o que buscar. */
export class SearchQueue {
  private queue: QueuedSearch[] = [];
  private readonly running = new Map<string, { engine: Engine | null }>();
  private readonly engines = new Set<Engine>();
  private readonly idle: Engine[] = [];
  private closed = false;

  constructor(
    private readonly size: number,
    private readonly createEngine: () => Engine,
    private readonly events: Events,
  ) {}

  /**
   * Troca o que falta buscar. O que já está rodando continua e também é entregue; com
   * `abandon`, é interrompido se não estiver mais na lista.
   */
  replace(searches: QueuedSearch[], { abandon = false } = {}): void {
    if (abandon) {
      const wanted = new Set(searches.map(({ key }) => key));
      for (const [key, { engine }] of this.running) {
        if (wanted.has(key)) continue;
        this.running.delete(key);
        this.discard(engine);
      }
    }
    this.queue = searches.filter(({ key }) => !this.running.has(key));
    while (!this.closed && this.running.size < this.size) {
      const next = this.queue.shift();
      if (!next) return;
      void this.run(next);
    }
  }

  private async run({ key, request }: QueuedSearch): Promise<void> {
    const entry = { engine: this.idle.pop() ?? null };
    this.running.set(key, entry);
    const isCurrent = () => !this.closed && this.running.get(key) === entry;
    try {
      let engine = entry.engine;
      if (!engine) {
        engine = entry.engine = this.createEngine();
        this.engines.add(engine);
        await engine.init();
      }
      const result = await engine.search(request);
      if (!isCurrent()) return;
      this.running.delete(key);
      this.idle.push(engine);
      this.replace(this.queue);
      this.events.onResult(key, result);
    } catch (error) {
      // Interrompida de propósito: não é falha.
      if (!isCurrent()) return;
      this.running.delete(key);
      // Um motor que falhou não volta; o próximo pedido cria outro.
      this.discard(entry.engine);
      this.queue = [];
      this.events.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private discard(engine: Engine | null): void {
    if (!engine) return;
    this.engines.delete(engine);
    engine.terminate();
  }

  terminate(): void {
    this.closed = true;
    this.queue = [];
    for (const engine of this.engines) engine.terminate();
  }
}
