import { readFileSync } from "node:fs";
import path from "node:path";
import { httpsUrl } from "@/lib/text";

export type CitedRecord = {
  title: string;
  when: string | null;
  summary: string | null;
  sourceName: string | null;
  sourceUrl: string;
};

export type HelplineGroup = {
  group: string;
  sourceName: string;
  sourceUrl: string;
  lines: Array<{ label: string; number: string }>;
};

export function citedRows(value: unknown): CitedRecord[] {
  if (!Array.isArray(value)) return [];
  const rows: CitedRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const sourceUrl = httpsUrl(typeof record.sourceUrl === "string" ? record.sourceUrl : null);
    if (!title || !sourceUrl) continue;
    rows.push({
      title,
      when: typeof record.when === "string" ? record.when : null,
      summary: typeof record.summary === "string" ? record.summary : null,
      sourceName: typeof record.sourceName === "string" ? record.sourceName : null,
      sourceUrl,
    });
  }
  return rows;
}

export function helplineGroups(value: unknown): HelplineGroup[] {
  if (!Array.isArray(value)) return [];
  const groups: HelplineGroup[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const sourceUrl = httpsUrl(typeof record.sourceUrl === "string" ? record.sourceUrl : null);
    const group = typeof record.group === "string" ? record.group.trim() : "";
    if (!group || !sourceUrl || !Array.isArray(record.lines)) continue;
    const lines = record.lines.flatMap((line) => {
      if (!line || typeof line !== "object") return [];
      const entry = line as Record<string, unknown>;
      const label = typeof entry.label === "string" ? entry.label.trim() : "";
      const number = typeof entry.number === "string" ? entry.number.trim() : "";
      if (!label || !number) return [];
      return [{ label, number }];
    });
    if (!lines.length) continue;
    groups.push({
      group,
      sourceName: typeof record.sourceName === "string" ? record.sourceName : group,
      sourceUrl,
      lines,
    });
  }
  return groups;
}

export function readJson(name: string): unknown {
  const file = path.join(process.cwd(), "data", name);
  return JSON.parse(readFileSync(file, "utf8")) as unknown;
}
