// Simple in-memory rate limiter (per server process).
// Good enough to reduce spam; resets when the server restarts.

const hits = new Map();

// Returns true if the request is allowed, false if it exceeds the limit.
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const record = hits.get(key);
  if (!record || now >= record.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= max) return false;
  record.count += 1;
  return true;
}

// Best-effort client IP extraction from Next request headers.
export function getClientIp(req) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

// Simple string hash for the honeypot check (matches a fixed salt).
export function honeypotHash(value) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h.toString(36);
}