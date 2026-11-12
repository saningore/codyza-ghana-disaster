import type { Metadata } from "next";
import { citedRows, readJson } from "@/lib/records";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  const rows = citedRows(readJson("history.json"));
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-4xl font-semibold">Historical records</h1>
      <p className="mt-4 text-lg">These are selected records with a source URL. They are not the full DesInventar database and they are not live counts.</p>
      <p className="mt-4">
        <a className="font-bold text-sea underline underline-offset-2" href="https://www.desinventar.net/DesInventar/main.jsp?countrycode=gha&lang=EN" target="_blank" rel="noopener noreferrer">Open DesInventar for Ghana</a>
      </p>
      <div className="mt-8 space-y-6">
        {rows.map((row) => (
          <section key={row.sourceUrl} className="rounded-3xl border border-line bg-card p-5">
            <h2 className="font-serif text-2xl font-semibold">{row.title}</h2>
            {row.when ? <p className="mt-2 text-sm">{row.when}</p> : null}
            {row.summary ? <p className="mt-3">{row.summary}</p> : null}
            <p className="mt-3">
              <a className="font-bold text-sea underline underline-offset-2" href={row.sourceUrl} target="_blank" rel="noopener noreferrer">{row.sourceName ?? "Source"}</a>
            </p>
          </section>
        ))}
      </div>
    </article>
  );
}
