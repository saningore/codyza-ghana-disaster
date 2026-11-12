import { asRecord } from "@/lib/text";

export type ModelLine = { label: string; value: string };

export function formatModel(body: unknown): ModelLine[] {
  const record = asRecord(body);
  const current = asRecord(record?.current);
  const daily = asRecord(record?.daily);
  const lines: ModelLine[] = [];
  if (typeof current?.temperature_2m === "number") {
    lines.push({ label: "Temperature", value: `${current.temperature_2m} °C` });
  }
  if (typeof current?.wind_speed_10m === "number") {
    lines.push({ label: "Wind", value: `${current.wind_speed_10m} km/h` });
  }
  const rain = Array.isArray(daily?.precipitation_sum) ? daily.precipitation_sum[0] : null;
  if (typeof rain === "number") lines.push({ label: "Model precipitation today", value: `${rain} mm` });
  const high = Array.isArray(daily?.temperature_2m_max) ? daily.temperature_2m_max[0] : null;
  const low = Array.isArray(daily?.temperature_2m_min) ? daily.temperature_2m_min[0] : null;
  if (typeof high === "number" && typeof low === "number") {
    lines.push({ label: "Model high / low today", value: `${high} °C / ${low} °C` });
  }
  return lines;
}
