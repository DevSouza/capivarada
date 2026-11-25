import Link from "next/link";
import type { CSSProperties } from "react";
import { Brand } from "@/components/Brand";
import { Descent } from "@/components/landing/Descent";
import { HeroBoard } from "@/components/landing/HeroBoard";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { River } from "@/components/landing/River";
import { SiteFooter } from "@/components/SiteFooter";

const delay = (i: number) => ({ "--i": i }) as CSSProperties;

export default function Landing() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Brand />
        <Link href="/partidas" prefetch={false} className="rounded-lg px-3 py-2 text-sm font-medium text-soft hover:bg-panel hover:text-text">
          Suas partidas
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-7xl items-center gap-x-12 gap-y-8 px-4 pt-6 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:pt-2">
          <div>
            <h1 className="rise font-display text-5xl leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl xl:text-7xl">
              Toda derrota tem uma <span className="text-[#e0a35c]">capivara</span>.
            </h1>
            <p className="rise mt-6 max-w-lg text-lg leading-relaxed text-soft" style={delay(1)}>
              Cole o PGN da sua partida de xadrez e veja, lance a lance, onde ela virou e o que o motor teria jogado no seu
              lugar.
            </p>
            <div className="rise mt-9 flex flex-wrap items-center gap-x-6 gap-y-4" style={delay(2)}>
              <Link
                href="/partidas"
                prefetch={false}
                className="rounded-xl bg-accent px-7 py-3.5 text-lg font-semibold text-[#2a1a02] transition-transform hover:scale-[1.03] active:scale-95"
              >
                Analisar minha partida
              </Link>
              <p className="text-sm text-muted">Grátis, sem cadastro e sem instalar nada.</p>
            </div>
          </div>
          <div className="rise" style={delay(3)}>
            <HeroBoard />
          </div>
        </section>

        <Descent />
        <HowItWorks />
        <River />
      </main>
      <SiteFooter />
    </>
  );
}
