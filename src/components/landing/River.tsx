import Link from "next/link";
import { Capybara } from "../Capybara";
import { PieceIcon } from "../PieceIcon";

/** Uma onda que se repete a cada 400 unidades, para o laço não ter emenda. */
function Wave({ className, fill, height }: { className: string; fill: string; height: number }) {
  const period = `q50 -${height} 100 0t100 0t100 0t100 0`;
  return (
    <svg viewBox="0 0 1600 200" preserveAspectRatio="none" className={`absolute left-0 w-[200%] ${className}`} aria-hidden>
      <path d={`M0 40${period.repeat(4)}V200H0z`} fill={fill} />
    </svg>
  );
}

/** Fecho da página: a capivara passeia no rio com as peças que você perdeu. */
export function River() {
  return (
    <section aria-labelledby="river-title" className="relative overflow-hidden">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 pt-24 text-center sm:px-6">
        <h2 id="river-title" className="reveal font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Onde está a sua capivara?
        </h2>
        <p className="reveal mt-4 max-w-md text-soft">Cole a partida e descubra. É grátis e não precisa de cadastro.</p>
        <Link
          href="/partidas"
          prefetch={false}
          className="reveal mt-8 rounded-xl bg-accent px-8 py-4 text-lg font-semibold text-[#2a1a02] transition-transform hover:scale-[1.03] active:scale-95"
        >
          Analisar minha partida
        </Link>
      </div>

      <div className="relative mt-10 h-72" aria-hidden>
        <Wave className="wave wave-slow top-20 h-52" fill="#33435c" height={26} />
        <div className="swim absolute top-2 left-1/2 w-52 sm:w-64">
          <div className="bob relative">
            <span className="absolute bottom-[72%] left-[22%] w-[21%] -rotate-6">
              <PieceIcon piece="n" color="w" />
            </span>
            <span className="absolute bottom-[73.5%] left-[40%] w-[19%] rotate-3">
              <PieceIcon piece="p" color="w" />
            </span>
            <Capybara className="relative block w-full text-[#c98f4e]" />
          </div>
        </div>
        <Wave className="wave top-32 h-40" fill="#25334a" height={34} />
        <Wave className="wave wave-fast top-44 h-32" fill="#1b2638" height={28} />
      </div>
    </section>
  );
}
