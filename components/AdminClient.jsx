"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Lock,
  LogOut,
  Check,
  X,
  Trash2,
  Star,
  Pencil,
  Save,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { formatDate } from "@/lib/offers";

const TABS = ["pending", "approved", "rejected"];

export default function AdminClient() {
  const { t } = useApp();
  const [authed, setAuthed] = useState(null); // null = checking, true/false
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState([]);
  const [tab, setTab] = useState("pending");
  const [busyId, setBusyId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", discount_text: "", valid_till: "" });

  // Check if already logged in by attempting to load data.
  const loadOffers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/offers");
      if (res.status === 401) {
        setAuthed(false);
        return [];
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAuthed(true);
      setOffers(data.offers || []);
      return data.offers || [];
    } catch (e) {
      setAuthed(false);
      return [];
    }
  }, []);

  useEffect(() => {
    loadOffers().finally(() => setLoading(false));
  }, [loadOffers]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        await loadOffers();
      } else {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || t.adminWrongPassword);
        setAuthed(false);
      }
    } catch (err) {
      setLoginError(t.adminWrongPassword);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
    setOffers([]);
  }

  async function runAction(id, action, extra = {}) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/offers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error(data.error);
      }
      await loadOffers();
    } finally {
      setBusyId(null);
    }
  }

  async function removeOffer(id) {
    if (!window.confirm(t.adminDeleteConfirm)) return;
    setBusyId(id);
    try {
      await fetch(`/api/admin/offers/${id}`, { method: "DELETE" });
      await loadOffers();
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(o) {
    setEditingId(o.id);
    setEditForm({
      title: o.title,
      discount_text: o.discountText,
      valid_till: o.validTill,
    });
  }

  async function saveEdit(o) {
    await runAction(o.id, "edit", {
      title: editForm.title,
      discount_text: editForm.discount_text,
      valid_till: editForm.valid_till,
    });
    setEditingId(null);
  }

  const counts = {
    pending: offers.filter((o) => o.status === "pending").length,
    approved: offers.filter((o) => o.status === "approved").length,
    total: offers.length,
  };

  const filtered = offers.filter((o) => o.status === tab);

  // ---------- Login screen ----------
  if (authed === false) {
    return (
      <main className="mx-auto flex max-w-sm flex-col px-4 py-24">
        <div className="glass rounded-2xl p-6">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-tr from-accent-orange to-accent-purple">
            <Lock size={24} className="text-white" />
          </div>
          <h1 className="text-center text-xl font-black">{t.adminLoginTitle}</h1>
          {loginError && (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-center text-sm text-red-200">
              {loginError}
            </div>
          )}
          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.adminPassword}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder-white/30 focus:border-accent-purple"
            />
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-5 py-3 font-bold text-white hover:opacity-90 transition disabled:opacity-60"
            >
              {loading ? "…" : t.adminLogin}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ---------- Dashboard ----------
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 pb-24 md:pb-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black sm:text-3xl">
          <span className="text-gradient">{t.adminTitle}</span>
        </h1>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 transition"
        >
          <LogOut size={15} /> {t.adminLogout}
        </button>
      </div>

      {/* Counts */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-amber-300">{counts.pending}</div>
          <div className="text-xs text-white/50">{t.adminPendingCount}</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-emerald-300">{counts.approved}</div>
          <div className="text-xs text-white/50">{t.adminApprovedCount}</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-accent-purple">{counts.total}</div>
          <div className="text-xs text-white/50">{t.adminTotalCount}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex overflow-x-auto no-scrollbar gap-2">
        {TABS.map((k) => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`relative shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                active
                  ? "text-white"
                  : "border border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="admin-tab"
                  className="absolute inset-0 rounded-xl bg-gradient-to-tr from-accent-orange to-accent-purple"
                />
              )}
              <span className="relative">
                {k === "pending" ? t.adminPending : k === "approved" ? t.adminApproved : t.adminRejected}
              </span>
            </button>
          );
        })}
      </div>

      {/* Offer list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-16 text-center text-white/50">
          {t.adminNoOffers}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {filtered.map((o) => {
            const editing = editingId === o.id;
            return (
              <motion.article
                key={o.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5"
              >
                <div className="flex">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={o.image}
                    alt={o.title}
                    className="h-28 w-28 shrink-0 object-cover sm:h-32 sm:w-40"
                  />
                  <div className="min-w-0 flex-1 p-3">
                    <div className="font-bold leading-snug">{o.title}</div>
                    <div className="mt-1 text-xs text-white/60">{o.shopName}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-md bg-gradient-to-tr from-accent-orange to-accent-pink px-2 py-0.5 font-bold text-white">
                        {o.discountText}
                      </span>
                      <span className="rounded-md bg-accent-purple/20 px-2 py-0.5 text-accent-purple">
                        {o.area}
                      </span>
                      {o.isFeatured && (
                        <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-amber-300">
                          ★ {t.adminFeatured}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 px-3 pb-3 text-xs text-white/50">
                  <div>{t.adminValidTill}: {formatDate(o.validTill)}</div>
                  <div>{t.adminPayment}: {o.paymentMethod}</div>
                  {o.description && <div className="line-clamp-2">{o.description}</div>}
                </div>

                {editing ? (
                  <div className="space-y-2 border-t border-white/10 p-3">
                    <input
                      value={editForm.title}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={editForm.discount_text}
                        onChange={(e) => setEditForm((f) => ({ ...f, discount_text: e.target.value }))}
                        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                      />
                      <input
                        type="date"
                        value={editForm.valid_till}
                        onChange={(e) => setEditForm((f) => ({ ...f, valid_till: e.target.value }))}
                        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(o)}
                        disabled={busyId === o.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                      >
                        <Save size={13} /> {t.adminSave}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white/70"
                      >
                        {t.adminCancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-3 sm:grid-cols-3">
                    {tab !== "approved" && (
                      <button
                        onClick={() => runAction(o.id, "approve")}
                        disabled={busyId === o.id}
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-500/90 px-2 py-2 text-xs font-bold text-white disabled:opacity-60"
                      >
                        <Check size={13} /> {t.adminApprove}
                      </button>
                    )}
                    {tab !== "rejected" && (
                      <button
                        onClick={() => runAction(o.id, "reject")}
                        disabled={busyId === o.id}
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-red-500/90 px-2 py-2 text-xs font-bold text-white disabled:opacity-60"
                      >
                        <X size={13} /> {t.adminReject}
                      </button>
                    )}
                    <button
                      onClick={() => runAction(o.id, "feature", { is_featured: !o.isFeatured })}
                      disabled={busyId === o.id}
                      className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-bold disabled:opacity-60 ${
                        o.isFeatured
                          ? "bg-amber-500/90 text-white"
                          : "border border-white/15 text-amber-300"
                      }`}
                    >
                      <Star size={13} /> {o.isFeatured ? t.adminUnfeature : t.adminMakeFeatured}
                    </button>
                    <button
                      onClick={() => startEdit(o)}
                      disabled={busyId === o.id}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/15 px-2 py-2 text-xs font-bold text-white/70 hover:bg-white/10 disabled:opacity-60"
                    >
                      <Pencil size={13} /> {t.adminEdit}
                    </button>
                    <button
                      onClick={() => removeOffer(o.id)}
                      disabled={busyId === o.id}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/40 px-2 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                    >
                      <Trash2 size={13} /> {t.adminDelete}
                    </button>
                  </div>
                )}
              </motion.article>
            );
          })}
        </div>
      )}
    </main>
  );
}