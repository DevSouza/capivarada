import type { CSSProperties } from "react";
import type { Classification } from "@/lib/types";
import { Badge, CLASS_META } from "../Badge";
import { Capybara } from "../Capybara";

const STEPS: [Classification, string][] = [
  ["brilliant", "sacrifício que funciona"],
  ["great", "o único lance bom"],
  ["best", "a escolha do motor"],
  ["good", "perto do melhor"],
  ["book", "teoria de abertura"],
  ["inaccuracy", "um pouco fraco"],
  ["mistake", "piora a posição"],
  ["miss", "deixou o rival escapar"],
  ["blunder", "entregou a partida"],
];

/** As nove classificações descendo em escada até a água, onde a capivara espera. */
export function Descent() {
  return (
    <section aria-labelledby="descent-title" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:pb-8">
      <h2 id="descent-title" className="reveal max-w-xl font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        Do brilhante à capivara, cada lance ganha um nome
      </h2>
      <p className="reveal mt-4 max-w-xl text-soft">
        São nove classificações. Clique em qualquer uma no resumo e vá direto ao lance.
      </p>

      <ol className="mt-12 grid gap-x-3 gap-y-5 sm:grid-cols-2 lg:mt-4 lg:grid-cols-9">
        {STEPS.map(([kind, text], i) => (
          <li
            key={kind}
            className="reveal flex items-center gap-4 lg:mt-[calc(var(--i)*1.8rem)] lg:flex-col lg:items-start lg:gap-3"
            style={{ "--i": i } as CSSProperties}
          >
            <Badge kind={kind} size={48} />
            <div>
              <p className="leading-tight font-semibold">{CLASS_META[kind].label}</p>
              <p className="mt-1 text-sm leading-snug text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="relative -mt-40 hidden h-40 xl:block" aria-hidden>
        <Capybara className="walk absolute bottom-0 left-0 w-40 text-[#c98f4e]" />
      </div>
    </section>
  );
}
