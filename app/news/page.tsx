import type { Metadata } from "next";
import { RELIEFWEB_GHANA, loadBulletins } from "@/lib/bulletins";
import { BulletinCards } from "@/components/BulletinCards";
import { formatOfficialTime } from "@/lib/time";
import { TIME_ZONE } from "@/lib/types";

export const metadata: Metadata = { title: "Bulletins" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewsPage() {
  const feed = await loadBulletins();
  return (
    <article className="mx-auto max-w-3xl px-4 py-10" data-bulletins={feed.ok ? "ready" : "error"}>
      <h1 className="font-serif text-4xl font-semibold">Bulletins</h1>
      <p className="mt-4 text-lg">These are ReliefWeb updates for Ghana. A bulletin is not a weather warning, and a headline is not added on its own.</p>
      <p className="mt-4">
        <a className="font-bold text-sea underline underline-offset-2" href={RELIEFWEB_GHANA} target="_blank" rel="noopener noreferrer">ReliefWeb Ghana</a>
      </p>
      {feed.ok ? (
        <>
          <p className="mt-4 text-sm">Checked at {formatOfficialTime(feed.checkedAt, TIME_ZONE)}.</p>
          <BulletinCards items={feed.items} />
        </>
      ) : (
        <p className="mt-4 text-lg">{feed.message}</p>
      )}
    </article>
  );
}
