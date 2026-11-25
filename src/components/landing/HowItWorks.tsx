import type { ReactNode } from "react";
import { expectedPoints } from "@/lib/analysis/winprob";
import { CLASS_META } from "../Badge";
import { BEST_LINES, BLUNDER_STEP, SCORES } from "./showcase";

const PGN = ["1. e4 e5 2. Nf3 d6", "3. Bc4 Bg4 4. Nc3 g6", "5. Nxe5 Bxd1", "6. Bxf7+ Ke7 7. Nd5#"];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="border-y border-line bg-panel/50">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
        <h2 id="how-title" className="reveal font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Da partida colada ao lance que decidiu
        </h2>
        <ol className="mt-12 grid gap-10 lg:grid-cols-3 lg:gap-8">
          <Step number={1} title="Cole o PGN" text="Uma partida ou várias de uma vez. Tudo fica salvo no seu navegador.">
            <div className="flex flex-col gap-1.5 font-mono text-sm text-soft">
              {PGN.map((line) => (
                <span key={line} className="type-in w-fit whitespace-nowrap">
                  {line}
                </span>
              ))}
            </div>
          </Step>
          <Step
            number={2}
            title="O Stockfish analisa"
            text="Ele roda aí mesmo, no seu computador, e guarda as três melhores linhas de cada posição."
          >
            <div className="flex w-full flex-col gap-3 text-sm">
              {BEST_LINES.map((line) => (
                <p key={line.moves} className="reveal flex gap-3 whitespace-nowrap">
                  <span className="w-10 shrink-0 font-semibold text-text tabular-nums">{line.score}</span>
                  <span className="truncate text-soft">{line.moves}</span>
                </p>
              ))}
            </div>
          </Step>
          <Step number={3} title="Reveja o que importa" text="Dê play ou vá lance a lance, com o gráfico mostrando onde a chance de vitória mudou.">
            <WinGraph />
          </Step>
        </ol>
      </div>
    </section>
  );
}

interface StepProps {
  number: number;
  title: string;
  text: string;
  children: ReactNode;
}

function Step({ number, title, text, children }: StepProps) {
  return (
    <li className="flex flex-col">
      <div className="flex h-44 items-center overflow-hidden rounded-xl border border-line bg-ink px-5">{children}</div>
      <h3 className="mt-5 flex items-baseline gap-3 font-display text-xl font-bold">
        <span className="text-accent tabular-nums">{number}</span>
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-soft">{text}</p>
    </li>
  );
}

/** Chance de vitória das brancas na partida da abertura. */
function WinGraph() {
  const last = SCORES.length - 1;
  const points = SCORES.map((score, i) => [(i / last) * 300, 100 - expectedPoints(score, "w") * 100]);
  const [x, y] = points[BLUNDER_STEP];
  return (
    <svg
      viewBox="-6 -12 312 84"
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label="Gráfico: a chance de vitória das brancas salta para o máximo depois de 5… Bxd1"
    >
      <line x1="0" x2="300" y1="50" y2="50" stroke="#313b4d" />
      <polyline
        className="draw"
        pathLength={1}
        points={points.map((point) => point.join(",")).join(" ")}
        fill="none"
        stroke="#f1ede4"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={x} cy={y} r="6.5" fill={CLASS_META.blunder.color} stroke="#10141d" strokeWidth="2.5" />
    </svg>
  );
}
