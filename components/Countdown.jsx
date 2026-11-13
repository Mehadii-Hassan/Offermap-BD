"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-context";

export function timeLeft(validTill) {
  const target = new Date(validTill).getTime();
  const now = Date.now();
  const diff = target - now;
  return diff <= 0 ? 0 : diff;
}

function pad(n) {
  return n < 10 ? `0${n}` : String(n);
}

export function parseTimeDiff(diff) {
  const totalSecs = Math.floor(diff / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return { days, hours, mins, secs, expired: diff <= 0 };
}

export default function Countdown({ validTill, compact = false }) {
  const { t } = useApp();
  const [diff, setDiff] = useState(() => timeLeft(validTill));

  useEffect(() => {
    setDiff(timeLeft(validTill));
    const id = setInterval(() => setDiff(timeLeft(validTill)), 1000);
    return () => clearInterval(id);
  }, [validTill]);

  const { days, hours, mins, secs, expired } = parseTimeDiff(diff);

  if (expired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-red-200 bg-red-500/20">
        {t.expired}
      </span>
    );
  }

  if (compact) {
    const label =
      days > 0 ? `${days}${t.days}` : hours > 0 ? `${hours}${t.hours}` : `${pad(mins)}:${pad(secs)}`;
    return (
      <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-emerald-100 bg-emerald-500/20">
        {label}
      </span>
    );
  }

  const boxes = [
    { v: pad(days), l: t.days },
    { v: pad(hours), l: t.hours },
    { v: pad(mins), l: t.mins },
    { v: pad(secs), l: t.secs },
  ];

  return (
    <div className="flex gap-2">
      {boxes.map((b) => (
        <div
          key={b.l}
          className="glass flex min-w-[52px] flex-col items-center rounded-xl px-2 py-2"
        >
          <span className="text-xl font-extrabold tabular-nums text-white">
            {b.v}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-white/50">
            {b.l}
          </span>
        </div>
      ))}
    </div>
  );
}