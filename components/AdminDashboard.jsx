"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw,
  Trash,
  TrendingUp,
  Users,
  Activity,
  Image as ImageIcon,
  FileWarning,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { useApp } from "@/lib/app-context";

function StatCard({ label, value, sub, tone = "text-white" }) {
  return (
    <div className="glass rounded-2xl p-3 sm:p-4">
      <div className={`text-2xl font-black ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[11px] leading-tight text-white/50">{label}</div>
      {sub && <div className="mt-1 text-[11px] text-white/35">{sub}</div>}
    </div>
  );
}

function BarChart({ data, type = "bar" }) {
  // data: [{d, c, c2?}] with named fields for visitors/added/deleted.
  const items = (data || []).slice(-14);
  if (!items.length) return <div className="text-xs text-white/40">No data yet.</div>;
  const vmax = Math.max(1, ...items.map((i) => i.c || 0));
  const vmax2 = Math.max(1, ...items.map((i) => i.c2 || 0));
  return (
    <div className="flex items-end gap-1" style={{ height: "96px" }}>
      {items.map((it, idx) => (
        <div key={idx} className="flex flex-1 flex-col items-center gap-1" title={`${it.d}: ${it.c ?? 0}`}>
          {type === "stack" ? (
            <div className="flex w-full flex-col-reverse justify-end" style={{ height: "80px" }}>
              <div className="w-full rounded-sm bg-accent-pink/80" style={{ height: `${((it.c2 || 0) / vmax2) * 100}%` }} />
              <div className="w-full rounded-t-sm bg-emerald-400/80" style={{ height: `${((it.c || 0) / vmax) * 100}%` }} />
            </div>
          ) : (
            <div
              className="w-full rounded-t-sm bg-emerald-400/80"
              style={{ height: `${((it.c || 0) / vmax) * 100}%` }}
            />
          )}
          <span className="hidden text-[8px] text-white/30 sm:block">{String(it.d).slice(8)}</span>
        </div>
      ))}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white/80">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function AdminDashboard({ onDeleteExpired, busyDelete }) {
  const { t } = useApp();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Unauthorized or failed");
      const data = await res.json();
      setStats(data);
    } catch (e) {
      setError(e.message || "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !stats) {
    return <div className="py-16 text-center text-white/50">Loading dashboard…</div>;
  }
  if (error && !stats) {
    return <div className="py-16 text-center text-red-300">Error: {error}</div>;
  }
  if (!stats) return null;

  const o = stats.offers;
  const v = stats.visitors;
  const act = stats.activity;

  return (
    <div className="space-y-4">
      {/* Dashboard actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={onDeleteExpired}
          disabled={busyDelete}
          className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-white/5 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10 transition disabled:opacity-60"
        >
          <Trash size={15} /> {t.adminDeleteExpiredNow}
        </button>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 transition disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> {t.adminRefresh}
        </button>
      </div>

      {/* OFFERS */}
      <Section title="Offers" icon={<TrendingUp size={16} className="text-accent-orange" />}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Added today" value={o.added_today} sub={`User ${o.added_user_today} · Scraped ${o.added_scraper_today}`} tone="text-emerald-300" />
          <StatCard label="Added yesterday" value={o.added_yesterday} tone="text-emerald-300" />
          <StatCard label="Added last 7 days" value={o.added_7d} sub={`User ${o.added_user_7d} · Scraped ${o.added_scraper_7d}`} tone="text-emerald-300" />
          <StatCard label="Live now" value={o.live_now} tone="text-white" />
          <StatCard label="Pending" value={o.pending} tone="text-amber-300" />
          <StatCard label="Expiring in 3 days" value={o.expiring_3d} tone="text-orange-300" />
          <StatCard label="Deleted today" value={o.deleted_today} sub={`Auto ${o.deleted_auto_today} · Admin ${o.deleted_admin_today}`} tone="text-red-300" />
          <StatCard label="Deleted last 7 days" value={o.deleted_7d} tone="text-red-300" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="glass rounded-2xl p-3 sm:p-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <ImageIcon size={15} className="text-accent-purple" /> Images
            </div>
            <div className="mt-1 text-xs text-white/45">Real: <b className="text-emerald-300">{o.real_image}</b> · Placeholder: <b className="text-amber-300">{o.placeholder}</b></div>
          </div>
          <div className="glass rounded-2xl p-3 sm:p-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <MapPin size={15} className="text-accent-orange" /> Precision
            </div>
            <div className="mt-1 text-xs text-white/45">Exact {o.precision_exact} · Area {o.precision_area} · District {o.precision_district}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-white/50">Top categories</div>
            <div className="flex flex-wrap gap-1.5">
              {(o.top_categories || []).map((c) => (
                <span key={c.k} className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/70">{c.k} <b className="text-white">{c.c}</b></span>
              ))}
              {!(o.top_categories || []).length && <span className="text-xs text-white/40">none</span>}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-white/50">Top divisions</div>
            <div className="flex flex-wrap gap-1.5">
              {(o.top_divisions || []).map((c) => (
                <span key={c.k} className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/70">{c.k} <b className="text-white">{c.c}</b></span>
              ))}
              {!(o.top_divisions || []).length && <span className="text-xs text-white/40">none</span>}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 text-xs font-semibold text-white/50">Offers added vs deleted (14 days)</div>
          <BarChart data={o.added_by_day?.map((a) => ({ d: a.d, c: a.c }))} type="bar" />
        </div>
      </Section>

      {/* VISITORS */}
      <Section title="Visitors" icon={<Users size={16} className="text-accent-purple" />}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Unique today" value={v.unique_today} tone="text-accent-purple" />
          <StatCard label="Unique yesterday" value={v.unique_yesterday} tone="text-accent-purple" />
          <StatCard label="Unique 7 days" value={v.unique_7d} tone="text-accent-purple" />
          <StatCard label="Unique 30 days" value={v.unique_30d} tone="text-accent-purple" />
          <StatCard label="Page views today" value={v.page_views} tone="text-white" />
          <StatCard label="New (30d)" value={v.new_visitors} tone="text-emerald-300" />
          <StatCard label="Returning (30d)" value={v.returning_visitors} tone="text-orange-300" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-white/50">Top pages (30 days)</div>
            <ul className="space-y-1">
              {(v.top_pages || []).map((p) => (
                <li key={p.k} className="flex items-center justify-between gap-2 text-xs text-white/60">
                  <span className="truncate">{p.k}</span>
                  <b className="text-white/80">{p.c}</b>
                </li>
              ))}
              {!(v.top_pages || []).length && <li className="text-xs text-white/40">none</li>}
            </ul>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-white/50">Top referrers (30 days)</div>
            <ul className="space-y-1">
              {(v.top_referrers || []).map((p) => (
                <li key={p.k} className="flex items-center justify-between gap-2 text-xs text-white/60">
                  <span className="truncate">{p.k}</span>
                  <b className="text-white/80">{p.c}</b>
                </li>
              ))}
              {!(v.top_referrers || []).length && <li className="text-xs text-white/40">none</li>}
            </ul>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-white/50">Devices</div>
            <ul className="space-y-1">
              {(v.top_devices || []).map((p) => (
                <li key={p.k} className="flex justify-between text-xs text-white/60"><span>{p.k}</span><b className="text-white/80">{p.c}</b></li>
              ))}
              {!(v.top_devices || []).length && <li className="text-xs text-white/40">none</li>}
            </ul>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-white/50">Top cities</div>
            <ul className="space-y-1">
              {(v.top_cities || []).map((p) => (
                <li key={p.k} className="flex justify-between text-xs text-white/60"><span>{p.k}</span><b className="text-white/80">{p.c}</b></li>
              ))}
              {!(v.top_cities || []).length && <li className="text-xs text-white/40">none</li>}
            </ul>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 text-xs font-semibold text-white/50">Visitors (14 days)</div>
          <BarChart data={o.visitors_by_day?.map((a) => ({ d: a.d, c: a.c }))} type="bar" />
        </div>
      </Section>

      {/* ACTIVITY */}
      <Section title={t.adminActivityLog} icon={<Activity size={16} className="text-accent-pink" />}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold text-white/50">Latest events</div>
            <ul className="space-y-1.5">
              {(act.events || []).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 text-xs text-white/60">
                  <span className="truncate">{e.event}{(e.source && ` · ${e.source}`)}{(e.detail && ` · ${e.detail}`)}</span>
                  <span className="shrink-0 text-white/35">{new Date(e.created_at).toLocaleString()}</span>
                </li>
              ))}
              {!(act.events || []).length && <li className="text-xs text-white/40">none</li>}
            </ul>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold text-white/50">{t.adminScrapeHealth}</div>
            <ul className="space-y-1.5">
              {(act.scrape_runs || []).map((s) => {
                const bad = s.errors > 0 || s.inserted === 0;
                return (
                  <li key={s.id} className={bad ? "flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs text-red-200" : "flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1.5 text-xs text-white/60"}>
                    {bad ? <FileWarning size={13} /> : <CheckCircle2 size={13} className="text-emerald-300" />}
                    <span className="truncate">
                      {new Date(s.started_at).toLocaleString()} · inserted {s.inserted} · found {s.found} · {s.mode}
                    </span>
                  </li>
                );
              })}
              {!(act.scrape_runs || []).length && <li className="text-xs text-white/40">No scrape runs yet.</li>}
            </ul>
          </div>
        </div>
      </Section>
    </div>
  );
}