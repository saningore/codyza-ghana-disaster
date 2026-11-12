export function kmBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const earth = 6371.0088;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function inGhana(latitude: number, longitude: number): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return latitude >= 4.3 && latitude <= 11.4 && longitude >= -3.5 && longitude <= 1.5;
}

export function roundCoordinate(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}
