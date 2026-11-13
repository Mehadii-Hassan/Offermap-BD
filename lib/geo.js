"use client";
// Persist the user's chosen location (GPS or division/district override)
// and remember whether we've already asked for their GPS once.

const GEO_KEY = "om-geo";
const ASKED_KEY = "om-geo-asked";

export function getGeo() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(GEO_KEY) || "null");
  } catch (e) {
    return null;
  }
}

export function setGeo(geo) {
  try {
    localStorage.setItem(GEO_KEY, JSON.stringify(geo));
  } catch (e) {
    /* ignore */
  }
}

export function wasAsked() {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ASKED_KEY) === "1";
  } catch (e) {
    return true;
  }
}

export function markAsked() {
  try {
    localStorage.setItem(ASKED_KEY, "1");
  } catch (e) {
    /* ignore */
  }
}