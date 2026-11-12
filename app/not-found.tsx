import Link from "next/link";

export default function NotFound() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-serif text-4xl font-semibold">That page is not here</h1>
      <p className="mt-4 text-lg">The address does not match a page on GhanaDisaster.</p>
      <p className="mt-4">
        <Link className="font-bold text-sea underline underline-offset-2" href="/">Check hazards</Link>
      </p>
    </article>
  );
}
