import type { Color, PositionEval } from "../types";
import { SearchCollector } from "./uci";

const ENGINE_URL = "/engine/stockfish-19-lite-single.js";
const INIT_TIMEOUT_MS = 30_000;

export interface SearchRequest {
  startFen: string;
  moves: string[];
  turn: Color;
  nodes: number;
  multiPv: number;
  searchMoves?: string[];
}

/** Um Stockfish em um Web Worker; executa uma busca por vez. */
export class EngineWorker {
  private readonly worker: Worker;
  private onLine: ((line: string) => void) | null = null;
  private rejectCurrent: ((error: Error) => void) | null = null;
  private failure: Error | null = null;
  private multiPv = 0;

  constructor() {
    this.worker = new Worker(ENGINE_URL);
    this.worker.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;
      for (const line of event.data.split("\n")) this.onLine?.(line);
    };
    this.worker.onerror = (event) => {
      this.fail(new Error(`O motor de análise falhou${event.message ? `: ${event.message}` : "."}`));
    };
  }

  private fail(error: Error): void {
    this.failure ??= error;
    this.rejectCurrent?.(this.failure);
    this.onLine = null;
    this.rejectCurrent = null;
  }

  /** Envia comandos e espera a primeira linha aceita por `done`. */
  private run<T>(commands: string[], done: (line: string) => T | undefined, timeoutMs?: number): Promise<T> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise<T>((resolve, reject) => {
      const timer = timeoutMs
        ? setTimeout(() => this.fail(new Error("O motor de análise demorou demais para carregar.")), timeoutMs)
        : undefined;
      const settle = () => {
        clearTimeout(timer);
        this.onLine = null;
        this.rejectCurrent = null;
      };
      this.rejectCurrent = (error) => {
        clearTimeout(timer);
        reject(error);
      };
      this.onLine = (line) => {
        try {
          const result = done(line);
          if (result === undefined) return;
          settle();
          resolve(result);
        } catch (error) {
          settle();
          reject(error);
        }
      };
      for (const command of commands) this.worker.postMessage(command);
    });
  }

  async init(): Promise<void> {
    await this.run(["uci"], (line) => (line === "uciok" ? true : undefined), INIT_TIMEOUT_MS);
    await this.run(
      ["setoption name Hash value 16", "isready"],
      (line) => (line === "readyok" ? true : undefined),
      INIT_TIMEOUT_MS,
    );
  }

  async search(request: SearchRequest): Promise<PositionEval> {
    const setup: string[] = [];
    if (request.multiPv !== this.multiPv) {
      setup.push(`setoption name MultiPV value ${request.multiPv}`);
      this.multiPv = request.multiPv;
    }
    // Limpa o hash para o resultado não depender do que este worker analisou antes.
    setup.push("ucinewgame", "isready");
    await this.run(setup, (line) => (line === "readyok" ? true : undefined));

    const collector = new SearchCollector(request.turn);
    const moves = request.moves.length ? ` moves ${request.moves.join(" ")}` : "";
    // "searchmoves" consome o resto da linha, então vem por último.
    const only = request.searchMoves?.length ? ` searchmoves ${request.searchMoves.join(" ")}` : "";
    return this.run(
      [`position fen ${request.startFen}${moves}`, `go nodes ${request.nodes}${only}`],
      (line) => {
        collector.add(line);
        const best = line.match(/^bestmove (\S+)/);
        if (!best) return undefined;
        const result = collector.finish(best[1]);
        if (!result) throw new Error("O motor não devolveu avaliação para uma posição.");
        return result;
      },
    );
  }

  terminate(reason: Error = new Error("Motor encerrado.")): void {
    this.fail(reason);
    this.worker.terminate();
  }
}
