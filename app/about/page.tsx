import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-4xl font-semibold">About GhanaDisaster</h1>
      <p className="mt-4 text-lg">GhanaDisaster is an independent information service. It is not the Ghana Meteorological Agency, NADMO, or any other government office.</p>
      <p className="mt-4">Warning text is quoted from the CAP record GMet publishes. The page does not rewrite an instruction, invent a severity, or fill a failed source with a headline. An empty result means the sources that were checked returned no matching record. It does not mean the area is safe.</p>
      <p className="mt-4">If you are in immediate danger, call 112. This site does not dispatch help and it is not a cell-broadcast alert.</p>
      <p className="mt-4">You can save up to five locations on this device. Notifications, if you turn them on, repeat the official headline for a new Severe or Extreme alert whose polygon contains that point. Moderate warnings stay on the page unless you opt in. The last successful check can be opened offline and is labeled with the time it was retrieved.</p>
      <p className="mt-4">GhanaDisaster is powered by Codyza.</p>
      <p className="mt-6">
        <Link className="font-bold text-sea underline underline-offset-2" href="/sources">Read how each source is queried</Link>
      </p>
    </article>
  );
}
