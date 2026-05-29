const STORAGE_KEY = "viax_device_id";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Stable anonymous device id for velocity checks (sent only to server functions). */
export function getOrCreateDeviceId(): string {
  if (typeof localStorage === "undefined") return randomId();
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = randomId();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
