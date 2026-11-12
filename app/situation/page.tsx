import type { Metadata } from "next";
import { BulletinCards } from "@/components/BulletinCards";
import { RELIEFWEB_GHANA, loadBulletins } from "@/lib/bulletins";
import { formatOfficialTime } from "@/lib/time";
import { TIME_ZONE } from "@/lib/types";

export const metadata: Metadata = { title: "Situation" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export default async function SituationPage() {
  const feed = await loadBulletins();
  const reports = feed.ok ? feed.items.filter((item) => item.situation) : [];
  const state = !feed.ok ? "error" : reports.length ? "ready" : "empty";
  return (
    <article className="mx-auto max-w-3xl px-4 py-10" data-situation={state}>
      <h1 className="font-serif text-4xl font-semibold">Situation report</h1>
      <p className="mt-4 text-lg">Situation reports are the ReliefWeb items filed under that category. They are not Ghana Meteorological Agency warnings.</p>
      {feed.ok ? <p className="mt-4 text-sm">Checked at {formatOfficialTime(feed.checkedAt, TIME_ZONE)}.</p> : null}
      {!feed.ok ? <p className="mt-4 text-lg" data-upstream={feed.detail}>{feed.message}</p> : null}
      {feed.ok && !reports.length ? <p className="mt-4 text-lg">ReliefWeb returned no situation report for Ghana.</p> : null}
      {reports.length ? <BulletinCards items={reports} /> : null}
      <p className="mt-4">A number in a report stays in that publisher&apos;s text. Counts are not collected from news headlines.</p>
      <p className="mt-4">
        <a className="font-bold text-sea underline underline-offset-2" href={RELIEFWEB_GHANA} target="_blank" rel="noopener noreferrer">ReliefWeb Ghana</a>
      </p>
    </article>
  );
}
