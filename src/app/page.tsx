import { Analyzer } from "@/components/Analyzer";

export default function Home() {
  return (
    <>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Analyzer />
      </main>
      <footer className="mx-auto w-full max-w-7xl px-4 py-6 text-xs leading-relaxed text-muted sm:px-6">
        A análise roda no seu navegador com{" "}
        <a className="underline" href="https://github.com/nmrugg/stockfish.js/tree/v19.0.1">
          Stockfish.js 19
        </a>{" "}
        (
        <a className="underline" href="/engine/COPYING.txt">
          GPL-3.0
        </a>
        ). Aberturas de{" "}
        <a className="underline" href="https://github.com/lichess-org/chess-openings">
          lichess-org/chess-openings
        </a>{" "}
        (CC0). As classificações são aproximações próprias, sem vínculo com nenhum site de xadrez.
      </footer>
    </>
  );
}
