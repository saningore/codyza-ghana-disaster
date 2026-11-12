import type { Metadata } from "next";

export const metadata: Metadata = { title: "Preparedness" };

export default function PreparednessPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-4xl font-semibold">Preparedness</h1>
      <p className="mt-4 text-lg">This is general guidance. It is not an instruction from the current alert. If an alert includes an instruction, that text is on the hazard check and is quoted from GMet.</p>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li>Know the police, fire, and ambulance numbers on the Helplines page, and call 112 in immediate danger.</li>
        <li>During a thunderstorm warning from GMet, follow the instruction in that alert. The expired 10 November 2026 alert told people not to shelter under trees and not to cross flooded roads.</li>
        <li>A town-center result can miss a warning that covers another part of the district. Use device location for a closer check.</li>
        <li>Save the places you care about on this device if you want this browser to watch them.</li>
      </ul>
    </article>
  );
}
