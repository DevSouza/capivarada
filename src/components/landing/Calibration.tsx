import { DECIDED, OVERWHELMING } from "@/lib/analysis/mate";
import { BOOK_MAX_LOSS, BRILLIANT, GREAT, LOSS, MISS } from "@/lib/analysis/thresholds";
import type { Classification } from "@/lib/types";
import { Badge, CLASS_META } from "../Badge";

/** 0,15 -> 15: os limiares são frações, o texto fala em pontos de chance. */
const points = (value: number) => Math.round(value * 100);
const pawns = (cp: number) => (cp / 100).toLocaleString("pt-BR");

const BANDS: { kind: Classification; range: string; text: string }[] = [
  { kind: "good", range: `menos de ${points(LOSS.good)}`, text: "Perto do melhor." },
  { kind: "inaccuracy", range: `de ${points(LOSS.good)} a ${points(LOSS.inaccuracy)}`, text: "Um pouco fraco." },
  { kind: "mistake", range: `de ${points(LOSS.inaccuracy)} a ${points(LOSS.mistake)}`, text: "Piora bastante a posição." },
  { kind: "blunder", range: `${points(LOSS.mistake)} ou mais`, text: "Um erro grave." },
];

/** Na ordem em que `classify` decide. */
const RULES: { kind: Classification; criteria: string[] }[] = [
  {
    kind: "book",
    criteria: [
      "Segue a base de aberturas do Lichess desde o primeiro lance.",
      `Perde menos de ${points(BOOK_MAX_LOSS)} pontos.`,
      "Fica fora da precisão.",
    ],
  },
  {
    kind: "forced",
    criteria: ["Era o único lance legal.", "Fica fora do resumo e da precisão."],
  },
  {
    kind: "brilliant",
    criteria: [
      `Deixa o adversário ganhar o equivalente a ${-BRILLIANT.maxNetMaterial} peões ou mais, como uma peça menor por um peão, quando dava para evitar. Peões não contam.`,
      `Perde até ${points(BRILLIANT.maxLoss)} pontos e mantém ao menos ${points(BRILLIANT.minExpectedAfter)}% de chance.`,
      "Nenhum outro lance dava mate forçado.",
    ],
  },
  {
    kind: "great",
    criteria: [
      `É o melhor lance, e a segunda opção vale ao menos ${points(GREAT.minGap)} pontos a menos.`,
      `A segunda opção fica abaixo de ${points(GREAT.maxAlternative)}%, e o lance mantém ao menos ${points(GREAT.minExpectedAfter)}%.`,
      `Recaptura ou captura de peça solta só conta se pune um erro de ${points(GREAT.minPunishedLoss)} pontos ou mais.`,
    ],
  },
  {
    kind: "best",
    criteria: ["É o lance nº 1 do Stockfish, ou empata com ele."],
  },
  {
    kind: "miss",
    criteria: [
      `O adversário acabou de perder ${points(MISS.minOpponentLoss)} pontos ou mais.`,
      `Você tinha ao menos ${points(MISS.minExpectedBefore)}% de chance e devolveu ${points(MISS.minLoss)} pontos ou mais.`,
    ],
  },
];

/** Os critérios de cada selo, com os números que a análise usa. */
export function Calibration() {
  return (
    <section aria-labelledby="calibration-title" className="mx-auto w-full max-w-7xl px-4 pt-20 sm:px-6">
      <h2 id="calibration-title" className="reveal font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        Como cada selo é calibrado
      </h2>
      <p className="reveal mt-4 max-w-2xl text-soft">
        O Stockfish avalia a posição antes e depois do lance. Cada avaliação vira uma chance de vitória, de 0 a 100%, e a
        queda de uma para a outra são os pontos perdidos.
      </p>

      <h3 className="reveal mt-12 font-display text-xl font-bold">Pelos pontos perdidos</h3>
      <ul className="mt-5 grid gap-x-1 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {BANDS.map(({ kind, range, text }) => (
          <li key={kind} className="reveal">
            <div className="h-2 rounded-full" style={{ backgroundColor: CLASS_META[kind].color }} />
            <div className="mt-4 flex items-center gap-4">
              <Badge kind={kind} size={40} />
              <div>
                <p className="leading-tight font-semibold">{CLASS_META[kind].label}</p>
                <p className="mt-1 text-sm text-soft tabular-nums">{range}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted">{text}</p>
          </li>
        ))}
      </ul>
      <p className="reveal mt-8 max-w-3xl text-sm leading-relaxed text-soft">
        Perder um mate forçado ou permitir um tem regra própria: é Capivara. Vira Erro se a vantagem que sobrou, ou a
        desvantagem que já havia, passa de {pawns(DECIDED)} peões, e Imprecisão se passa de {pawns(OVERWHELMING)}.
      </p>

      <h3 className="reveal mt-14 font-display text-xl font-bold">Pelo que acontece no tabuleiro</h3>
      <p className="reveal mt-2 max-w-2xl text-sm text-soft">
        Estes vêm antes dos pontos perdidos e são testados nesta ordem. A regra do mate entra logo antes de Chance perdida.
      </p>
      <ol className="mt-6 grid gap-x-10 md:grid-cols-2 lg:grid-cols-3">
        {RULES.map(({ kind, criteria }) => (
          <li key={kind} className="reveal flex gap-4 border-t border-line py-6">
            <Badge kind={kind} size={40} />
            <div>
              <p className="leading-10 font-semibold">{CLASS_META[kind].label}</p>
              <ul className="mt-1 flex flex-col gap-2 text-sm leading-relaxed text-soft">
                {criteria.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>

      <p className="reveal border-t border-line pt-6 text-sm leading-relaxed text-muted">
        Os cortes de Imprecisão, Erro e Capivara e as regras de mate são os do{" "}
        <a className="underline" href="https://github.com/lichess-org/lila/blob/master/modules/tree/src/main/Advice.scala">
          Lichess
        </a>
        . Brilhante, Excelente e Chance perdida são aproximações.
      </p>
    </section>
  );
}
