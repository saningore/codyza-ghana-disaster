import type { Metadata } from "next";

export const metadata: Metadata = { title: "Marine" };

export default function MarinePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-4xl font-semibold">Coast and marine</h1>
      <p className="mt-4 text-lg">Coastal and maritime forecasts are published by the Ghana Meteorological Agency. This site does not generate a sea-state forecast.</p>
      <p className="mt-4">A marine warning still appears on the hazard check when GMet issues one in the CAP feed and the point falls inside it.</p>
      <p className="mt-4">
        <a className="font-bold text-sea underline underline-offset-2" href="https://www.meteo.gov.gh/product/" target="_blank" rel="noopener noreferrer">Open the GMet forecast products</a>
      </p>
    </article>
  );
}
