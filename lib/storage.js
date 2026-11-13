"use client";

export function getSavedIds() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("om-saved") || "[]");
  } catch (e) {
    return [];
  }
}

export function toggleSavedId(id, onChange) {
  const current = getSavedIds();
  const exists = current.includes(String(id));
  const next = exists
    ? current.filter((x) => x !== String(id))
    : [...current, String(id)];
  try {
    localStorage.setItem("om-saved", JSON.stringify(next));
  } catch (e) {
    /* ignore */
  }
  onChange?.(next, exists);
  return next;
}

export function getVotes(id) {
  if (typeof window === "undefined")
    return { worked: 0, didntWork: 0, userVote: null };
  try {
    const data = JSON.parse(localStorage.getItem("om-votes") || "{}");
    const entry = data[String(id)] || { worked: 0, didntWork: 0, userVote: null };
    return entry;
  } catch (e) {
    return { worked: 0, didntWork: 0, userVote: null };
  }
}

export function castVote(id, type) {
  const current = getVotes(id);
  // if already voted same type, remove vote; else set/switch
  const userVote = current.userVote === type ? null : type;
  const entry = { ...current };
  if (entry.userVote === "worked") entry.worked = Math.max(0, entry.worked - 1);
  if (entry.userVote === "didntWork")
    entry.didntWork = Math.max(0, entry.didntWork - 1);
  if (userVote === "worked") entry.worked = entry.worked + 1;
  if (userVote === "didntWork") entry.didntWork = entry.didntWork + 1;
  entry.userVote = userVote;
  try {
    const data = JSON.parse(localStorage.getItem("om-votes") || "{}");
    data[String(id)] = entry;
    localStorage.setItem("om-votes", JSON.stringify(data));
  } catch (e) {
    /* ignore */
  }
  return entry;
}