import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Map" };

export default function MapPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-4xl font-semibold">Alert map</h1>
      <p className="mt-4 text-lg">The check page shows a map of Ghana. Use my location asks that map for your device position and moves the map to it. After a check, the same map shows that point, any GMet polygon returned for it, and USGS earthquakes in the same window.</p>
      <p className="mt-4">Region outlines used to name a point come from geoBoundaries and are described on the Sources page. They are not drawn as warnings.</p>
      <p className="mt-4">
        <Link className="font-bold text-sea underline underline-offset-2" href="/">Check a town or use device location</Link>
      </p>
    </article>
  );
}
