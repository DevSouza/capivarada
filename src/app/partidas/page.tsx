import type { Metadata } from "next";
import { Analyzer } from "@/components/Analyzer";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "Suas partidas" };

export default function GamesPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Analyzer />
      </main>
      <SiteFooter />
    </>
  );
}
