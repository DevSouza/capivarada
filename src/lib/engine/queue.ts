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
  private readonly running = new Set<string>();
  private readonly engines = new Set<Engine>();
  private readonly idle: Engine[] = [];
  private closed = false;

  constructor(
    private readonly size: number,
    private readonly createEngine: () => Engine,
    private readonly events: Events,
  ) {}

  /** Troca o que falta buscar; o que já está rodando continua e também é entregue. */
  replace(searches: QueuedSearch[]): void {
    this.queue = searches.filter(({ key }) => !this.running.has(key));
    while (!this.closed && this.running.size < this.size) {
      const next = this.queue.shift();
      if (!next) return;
      void this.run(next);
    }
  }

  private async run({ key, request }: QueuedSearch): Promise<void> {
    this.running.add(key);
    let engine = this.idle.pop();
    try {
      if (!engine) {
        engine = this.createEngine();
        this.engines.add(engine);
        await engine.init();
      }
      const result = await engine.search(request);
      this.running.delete(key);
      if (this.closed) return;
      this.idle.push(engine);
      this.replace(this.queue);
      this.events.onResult(key, result);
    } catch (error) {
      this.running.delete(key);
      // Um motor que falhou não volta; o próximo pedido cria outro.
      if (engine) {
        this.engines.delete(engine);
        engine.terminate();
      }
      if (this.closed) return;
      this.queue = [];
      this.events.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  terminate(): void {
    this.closed = true;
    this.queue = [];
    for (const engine of this.engines) engine.terminate();
  }
}
