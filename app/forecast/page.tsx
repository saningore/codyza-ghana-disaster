import type { Metadata } from "next";
import ForecastPanel from "@/components/ForecastPanel";

export const metadata: Metadata = { title: "Forecast" };

export default function ForecastPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-4xl font-semibold">Forecast</h1>
      <p className="mt-4 text-lg">The official forecast is the Ghana Meteorological Agency product list. A model panel below is separate and cannot replace a warning.</p>
      <p className="mt-4">
        <a className="font-bold text-sea underline underline-offset-2" href="https://www.meteo.gov.gh/product/" target="_blank" rel="noopener noreferrer">Open the GMet forecast products</a>
      </p>
      <ForecastPanel />
    </article>
  );
}
