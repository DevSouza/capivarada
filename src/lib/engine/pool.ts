import type { PositionEval } from "../types";
import { EngineWorker, type SearchRequest } from "./worker";

export class AnalysisCancelled extends Error {
  constructor() {
    super("Análise cancelada.");
  }
}

const MAX_WORKERS = 12;
/** Celular e tablet: menos memória e mais calor. */
const MAX_WORKERS_MOBILE = 4;

/**
 * Quantas posições analisar ao mesmo tempo. Só muda a velocidade: cada busca tem
 * limite próprio de nós e começa com o hash limpo, então o resultado é o mesmo.
 */
export function poolSize(threads: number, mobile: boolean): number {
  // Deixa uma thread para a página continuar respondendo.
  return Math.max(1, Math.min(mobile ? MAX_WORKERS_MOBILE : MAX_WORKERS, threads - 1));
}

export function defaultPoolSize(): number {
  // Só toque, sem mouse: notebook com tela de toque continua contando como computador.
  const mobile = window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches;
  return poolSize(navigator.hardwareConcurrency || 2, mobile);
}

/** Metade: deixa o computador livre para o resto da página. */
export function backgroundPoolSize(): number {
  return Math.max(1, Math.floor(defaultPoolSize() / 2));
}

export class EnginePool {
  private constructor(private readonly workers: EngineWorker[]) {}

  static async create(size: number, signal: AbortSignal): Promise<EnginePool> {
    if (signal.aborted) throw new AnalysisCancelled();
    const pool = new EnginePool(Array.from({ length: size }, () => new EngineWorker()));
    signal.addEventListener("abort", () => pool.terminate(new AnalysisCancelled()), { once: true });
    try {
      await Promise.all(pool.workers.map((worker) => worker.init()));
    } catch (error) {
      pool.terminate();
      throw error;
    }
    return pool;
  }

  /** Resolve as buscas na ordem pedida, distribuindo entre os workers livres. */
  async searchAll(requests: SearchRequest[], onDone?: (finished: number) => void): Promise<PositionEval[]> {
    const results = new Array<PositionEval>(requests.length);
    let next = 0;
    let finished = 0;
    await Promise.all(
      this.workers.map(async (worker) => {
        while (next < requests.length) {
          const index = next++;
          results[index] = await worker.search(requests[index]);
          onDone?.(++finished);
        }
      }),
    );
    return results;
  }

  terminate(reason?: Error): void {
    for (const worker of this.workers) worker.terminate(reason);
  }
}
