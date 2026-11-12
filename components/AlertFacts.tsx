import Link from "next/link";
import { NOT_INCLUDED, NO_INSTRUCTION, relationNote } from "@/lib/copy";
import { formatOfficialTime, isBefore } from "@/lib/time";
import type { OfficialAlert } from "@/lib/types";

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-3">
      <dt className="font-bold">{term}</dt>
      <dd className="min-w-0 whitespace-pre-wrap">{children}</dd>
    </div>
  );
}

export default function AlertFacts({
  alert,
  timeZone,
  retrievedAt,
  latitude,
  longitude,
  showPageLink = true,
}: {
  alert: OfficialAlert;
  timeZone: string | null;
  retrievedAt: string;
  latitude?: number;
  longitude?: number;
  showPageLink?: boolean;
}) {
  const start = formatOfficialTime(alert.effective, timeZone);
  const end = formatOfficialTime(alert.expires, timeZone);
  const expired = isBefore(alert.expires, retrievedAt);
  const readable = showPageLink && alert.id
    ? `/alerts/${encodeURIComponent(alert.id)}${latitude !== undefined && longitude !== undefined ? `?lat=${latitude}&lon=${longitude}` : ""}`
    : null;
  return (
    <dl className="mt-4 space-y-3 text-sm">
      <Fact term="Alert type">{alert.event ?? NOT_INCLUDED}</Fact>
      <Fact term="Severity">{alert.severity ?? NOT_INCLUDED}</Fact>
      <Fact term="Urgency">{alert.urgency ?? NOT_INCLUDED}</Fact>
      <Fact term="Certainty">{alert.certainty ?? NOT_INCLUDED}</Fact>
      <Fact term="Area affected">{alert.areaDesc ?? NOT_INCLUDED}</Fact>
      <Fact term="Map relationship">{relationNote(alert.relation, alert.relationChecked, alert.scope)}</Fact>
      <Fact term="Start time">{start ?? NOT_INCLUDED}</Fact>
      <Fact term="Expiration / end">
        {end ?? NOT_INCLUDED}
        {expired ? "\nThis expiration time is earlier than this page's retrieval time." : ""}
      </Fact>
      <Fact term="Official instructions">{alert.instruction ?? NO_INSTRUCTION}</Fact>
      <Fact term="Issuing authority">{alert.senderName ?? NOT_INCLUDED}</Fact>
      <Fact term="CAP status">{alert.status ?? NOT_INCLUDED}</Fact>
      <Fact term="CAP message type">{alert.messageType ?? NOT_INCLUDED}</Fact>
      {alert.headline ? <Fact term="Headline">{alert.headline}</Fact> : null}
      {alert.description ? <Fact term="Official description">{alert.description}</Fact> : null}
      <Fact term="Original source">
        {alert.officialUrl ? (
          <a className="font-bold text-sea underline underline-offset-2" href={alert.officialUrl} target="_blank" rel="noopener noreferrer">Open the GMet alert record</a>
        ) : "An official link was not included by GMet."}
        {readable ? (
          <>
            {"\n"}
            <Link className="font-bold text-sea underline underline-offset-2" href={readable}>Readable copy of this GMet record</Link>
          </>
        ) : null}
      </Fact>
    </dl>
  );
}
