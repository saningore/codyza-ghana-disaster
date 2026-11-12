import type { Metadata } from "next";

export const metadata: Metadata = { title: "Flood and dams" };

export default function FloodPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-4xl font-semibold">Flood and dams</h1>
      <p className="mt-4 text-lg">A flood warning appears on the hazard check when the Ghana Meteorological Agency CAP feed includes an unexpired alert whose polygon contains the point, or whose area text names that region and includes no polygon.</p>
      <p className="mt-4">VOLTALARM, the flood and drought early-warning product, is published on the GMet products page. This site does not copy a reservoir level.</p>
      <p className="mt-4">
        <a className="font-bold text-sea underline underline-offset-2" href="https://www.meteo.gov.gh/product/" target="_blank" rel="noopener noreferrer">GMet products, including VOLTALARM</a>
      </p>
      <p className="mt-4">
        <a className="font-bold text-sea underline underline-offset-2" href="https://www.vra.com/" target="_blank" rel="noopener noreferrer">Volta River Authority</a>
      </p>
      <p className="mt-4">The 2023 Akosombo spill is a historical record on the History page. It is not a statement that the dam is spilling today.</p>
    </article>
  );
}
