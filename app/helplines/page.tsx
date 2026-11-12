import type { Metadata } from "next";
import { helplineGroups, readJson } from "@/lib/records";

export const metadata: Metadata = { title: "Helplines" };

export default function HelplinesPage() {
  const groups = helplineGroups(readJson("helplines.json"));
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-4xl font-semibold">Emergency helplines</h1>
      <p className="mt-4 text-lg">Each number is shown under the official page that published it. Pages do not use the same NADMO numbers, so they are not merged. If you are in immediate danger, call 112.</p>
      <div className="mt-8 space-y-6">
        {groups.map((group) => (
          <section key={group.group} className="rounded-3xl border border-line bg-card p-5">
            <h2 className="font-serif text-2xl font-semibold">{group.group}</h2>
            <p className="mt-2 text-sm">
              Source: <a className="font-bold text-sea underline underline-offset-2" href={group.sourceUrl} target="_blank" rel="noopener noreferrer">{group.sourceName}</a>
            </p>
            <ul className="mt-4 space-y-2">
              {group.lines.map((line) => (
                <li key={`${group.group}-${line.number}-${line.label}`} className="flex flex-wrap justify-between gap-2 border-t border-line pt-2">
                  <span>{line.label}</span>
                  <a className="font-bold" href={`tel:${line.number.replace(/\s+/g, "")}`}>{line.number}</a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}
