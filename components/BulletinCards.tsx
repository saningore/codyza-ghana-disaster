import { formatOfficialTime } from "@/lib/time";
import { TIME_ZONE } from "@/lib/types";
import type { Bulletin } from "@/lib/bulletins";

export function BulletinCards({ items }: { items: Bulletin[] }) {
  return (
    <div className="mt-8 space-y-6">
      {items.map((item) => (
        <section key={item.url} className="rounded-3xl border border-line bg-card p-5">
          <h2 className="font-serif text-2xl font-semibold">
            <a className="underline decoration-sea/40 underline-offset-4" href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
          </h2>
          <p className="mt-2 text-sm">
            {item.published ? formatOfficialTime(item.published, TIME_ZONE) : "The feed did not include a date"}
            {" · "}
            {item.publisher ?? "ReliefWeb"}
          </p>
          {item.excerpt ? <p className="mt-3">{item.excerpt}</p> : null}
        </section>
      ))}
    </div>
  );
}
