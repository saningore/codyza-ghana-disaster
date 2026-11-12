export function canRequestDeviceLocation(
  isSecureContext: boolean | undefined,
  hostname: string,
  hasGeolocation: boolean,
): boolean {
  if (!hasGeolocation) return false;
  if (isSecureContext !== false) return true;
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}
