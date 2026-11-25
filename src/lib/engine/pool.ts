import type { PositionEval } from "../types";
import { EngineWorker, type SearchRequest } from "./worker";

export class AnalysisCancelled extends Error {
  constructor() {
    super("Análise cancelada.");
  }
}

export function defaultPoolSize(): number {
  return Math.min(6, Math.max(1, (navigator.hardwareConcurrency || 2) - 1));
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
