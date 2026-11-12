import type { Metadata } from "next";
import AlertFacts from "@/components/AlertFacts";
import { loadAlert } from "@/lib/hazards";
import { isBefore } from "@/lib/time";

export const metadata: Metadata = { title: "Alert" };

export default async function AlertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alert = await loadAlert(decodeURIComponent(id));
  if (!alert) {
    return (
      <article className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-serif text-4xl font-semibold">Alert not in the current feed</h1>
        <p className="mt-4">This identifier is not in the Ghana Meteorological Agency feed that was just checked. No substitute alert was added.</p>
      </article>
    );
  }
  const expired = isBefore(alert.expires, new Date().toISOString());
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-bold uppercase tracking-wide text-sea">Ghana Meteorological Agency</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold">{alert.headline ?? alert.event ?? "Alert"}</h1>
      {expired ? <p className="mt-4 rounded-2xl bg-amber px-4 py-3 font-bold">This alert is expired. It is not an active warning.</p> : null}
      <p className="mt-4">This page repeats the current CAP record. It does not add an instruction.</p>
      <AlertFacts alert={alert} timeZone="Africa/Accra" retrievedAt={new Date().toISOString()} showPageLink={false} />
    </article>
  );
}
