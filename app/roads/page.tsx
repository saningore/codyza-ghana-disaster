import type { Metadata } from "next";
import { OSM_COPYRIGHT, loadRoadNotices } from "@/lib/roads";
import { formatOfficialTime } from "@/lib/time";
import { TIME_ZONE } from "@/lib/types";

export const metadata: Metadata = { title: "Roads" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RoadsPage() {
  const feed = await loadRoadNotices();
  const state = !feed.ok ? "error" : feed.notices.length ? "ready" : "empty";
  return (
    <article className="mx-auto max-w-3xl px-4 py-10" data-roads={state}>
      <h1 className="font-serif text-4xl font-semibold">Roads</h1>
      <p className="mt-4 text-lg">OpenStreetMap tags for major roads marked closed or under construction are listed here. News headlines are not turned into closure notices.</p>
      <p className="mt-4">The Ghana Highway Authority publishes trunk-road condition surveys. That survey is a condition report, not a list of today&apos;s closures.</p>
      <p className="mt-4">
        <a className="font-bold text-sea underline underline-offset-2" href="https://highways.gov.gh/report/road_con_survey/" target="_blank" rel="noopener noreferrer">Ghana Highway Authority road condition survey</a>
      </p>
      {feed.ok ? (
        <>
          <p className="mt-4 text-sm">
            Checked at {formatOfficialTime(feed.checkedAt, TIME_ZONE)}.
            {feed.osmTime ? ` OpenStreetMap data timestamp ${formatOfficialTime(feed.osmTime, "UTC")}.` : ""}
          </p>
          {feed.notices.length ? (
            <ul className="mt-6 space-y-4">
              {feed.notices.map((notice) => (
                <li key={notice.id} className="rounded-3xl border border-line bg-card p-5">
                  <h2 className="font-serif text-2xl font-semibold">{notice.label}</h2>
                  <p className="mt-2">{notice.tag}. {notice.highway} road. Center {notice.latitude.toFixed(4)}, {notice.longitude.toFixed(4)}.</p>
                  <p className="mt-3">
                    <a className="font-bold text-sea underline underline-offset-2" href={notice.url} target="_blank" rel="noopener noreferrer">Open this way on OpenStreetMap</a>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-lg">OpenStreetMap returned no motorway, trunk, primary, or secondary road tagged access=no, access=closed, or under construction inside Ghana. An empty tag list is not a statement that every road is open.</p>
          )}
          <p className="mt-4 text-sm">
            <a className="font-bold text-sea underline underline-offset-2" href={OSM_COPYRIGHT} target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>
            , ODbL.
          </p>
        </>
      ) : (
        <p className="mt-4 text-lg">{feed.message}</p>
      )}
      <p className="mt-4">For a crash or a road emergency, the Ministry of the Interior lists police at 191.</p>
    </article>
  );
}
