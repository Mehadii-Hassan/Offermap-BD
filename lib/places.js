// Named saved places stored in localStorage (no personal data sent anywhere).
const KEY = "om-places";
const ACTIVE = "om-place-active";

export function loadPlaces() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function persistPlaces(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function addPlace(name, coords) {
  const list = loadPlaces();
  const id = `p${Date.now()}`;
  list.push({ id, name: String(name || "").slice(0, 40), lat: coords.lat, lng: coords.lng });
  persistPlaces(list);
  return list;
}

export function renamePlace(id, name) {
  const list = loadPlaces().map((p) => (p.id === id ? { ...p, name: String(name).slice(0, 40) } : p));
  persistPlaces(list);
  return list;
}

export function removePlace(id) {
  persistPlaces(loadPlaces().filter((p) => p.id !== id));
  return loadPlaces();
}

export function getActivePlaceId() {
  try {
    return localStorage.getItem(ACTIVE) || "";
  } catch {
    return "";
  }
}

export function setActivePlaceId(id) {
  try {
    localStorage.setItem(ACTIVE, id || "");
  } catch {
    /* ignore */
  }
}