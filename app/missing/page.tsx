import type { Metadata } from "next";
import Link from "next/link";
import { POLICE_CHILDREN, POLICE_MISSING, loadMissingNotices, type MissingNotice } from "@/lib/missing";
import { formatOfficialTime } from "@/lib/time";
import { TIME_ZONE } from "@/lib/types";

export const metadata: Metadata = { title: "Missing persons" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MissingPage() {
  const feed = await loadMissingNotices();
  const persons = feed.ok ? feed.notices.filter((notice) => notice.list === "persons") : [];
  const children = feed.ok ? feed.notices.filter((notice) => notice.list === "children") : [];
  return (
    <article className="mx-auto max-w-3xl px-4 py-10" data-missing={feed.ok ? "ready" : "error"}>
      <h1 className="font-serif text-4xl font-semibold">Missing persons</h1>
      <p className="mt-4 text-lg">These notices are published by the Ghana Police Service. GhanaDisaster does not accept reports and does not add a name the police page did not publish.</p>
      <p className="mt-4">Contact the Ghana Police Service. The Ministry of the Interior lists 191 as the toll-free police number.</p>
      <p className="mt-4">
        <a className="font-bold text-sea underline underline-offset-2" href="https://www.mint.gov.gh/agencies/" target="_blank" rel="noopener noreferrer">Ministry of the Interior emergency numbers</a>
      </p>
      <p className="mt-4">
        <Link className="font-bold text-sea underline underline-offset-2" href="/helplines">All helplines kept on this site</Link>
      </p>
      <p className="mt-4">Wanted persons and accident victims stay on the police page and are not listed here.</p>
      {feed.ok ? (
        <>
          <p className="mt-4 text-sm">Checked at {formatOfficialTime(feed.checkedAt, TIME_ZONE)}.</p>
          {feed.partial ? <p className="mt-4 font-bold">{feed.partial}</p> : null}
          <NoticeGroup title="Missing persons" href={POLICE_MISSING} linkLabel="Ghana Police Service missing persons" notices={persons} />
          <NoticeGroup title="Missing children (Amber Alert Ghana)" href={POLICE_CHILDREN} linkLabel="Ghana Police Service missing children" notices={children} />
        </>
      ) : (
        <p className="mt-4 text-lg">{feed.message}</p>
      )}
    </article>
  );
}

function NoticeGroup({
  title,
  href,
  linkLabel,
  notices,
}: {
  title: string;
  href: string;
  linkLabel: string;
  notices: MissingNotice[];
}) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-3xl font-semibold">{title}</h2>
      <p className="mt-3">
        <a className="font-bold text-sea underline underline-offset-2" href={href} target="_blank" rel="noopener noreferrer">{linkLabel}</a>
      </p>
      {notices.length ? (
        <ul className="mt-6 space-y-4">
          {notices.map((notice) => (
            <li key={notice.id} className="rounded-3xl border border-line bg-card p-5">
              <h3 className="font-serif text-2xl font-semibold">{notice.title}</h3>
              {notice.published ? <p className="mt-2 text-sm">{formatOfficialTime(notice.published, TIME_ZONE)}</p> : null}
              {notice.imageUrl ? (
                <img className="mt-3 max-h-48 w-auto rounded-2xl" src={notice.imageUrl} alt={notice.title} loading="lazy" />
              ) : null}
              <p className="mt-3">
                <a className="font-bold text-sea underline underline-offset-2" href={notice.url} target="_blank" rel="noopener noreferrer">Open the police notice</a>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4">No notice was returned for this list.</p>
      )}
    </section>
  );
}
