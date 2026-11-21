const IGNORE_PATTERNS = [
  /tile\.openstreetmap\.org/i,
  /openstreetmap\.org/i,
  /unsplash/i,
  /Failed to load resource/i,
  /net::ERR_/i,
  /ERR_BLOCKED/i,
];

function shouldIgnore(text, url) {
  const hay = `${text || ""} ${url || ""}`;
  return IGNORE_PATTERNS.some((re) => re.test(hay));
}

export function collectConsoleErrors(page) {
  const errors = [];
  page.on("pageerror", (e) => {
    const msg = "pageerror: " + e.message;
    if (!shouldIgnore(msg, "")) errors.push(msg);
  });
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const loc = m.location();
    const text = m.text();
    if (shouldIgnore(text, loc && loc.url)) return;
    errors.push("console: " + text);
  });
  return errors;
}