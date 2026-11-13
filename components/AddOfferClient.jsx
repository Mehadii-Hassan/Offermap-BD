"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Upload, Plus } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { CATEGORIES, AREAS, PAYMENT_METHODS } from "@/lib/offers";

const inputCls =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder-white/30 focus:border-accent-purple";

const labelCls = "mb-1.5 block text-sm font-semibold text-white/70";

export default function AddOfferClient() {
  const { t } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [fileName, setFileName] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const form = e.target;

    // Basic client-side required check
    const required = ["shop_name", "title", "discount_text", "category", "area", "payment_method", "valid_till"];
    for (const name of required) {
      if (!form.elements[name].value) {
        setError(t.fieldRequired);
        return;
      }
    }

    const file = form.elements.image?.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setError(t.uploadTooBig);
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        setError(t.uploadType);
        return;
      }
    }

    setSubmitting(true);
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/submit", { method: "POST", body: fd });
      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t.submitError);
      }
    } catch (err) {
      console.error(err);
      setError(t.submitError);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <CheckCircle2 size={72} className="text-emerald-400" />
        </motion.div>
        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-6 text-2xl font-black sm:text-3xl"
        >
          {t.thanksTitle}
        </motion.h1>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-3 text-white/60"
        >
          {t.thanksText}
        </motion.p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-6 py-3 font-bold text-white shadow-lg shadow-accent-pink/30 hover:opacity-90 transition"
          >
            {t.goHome}
          </Link>
          <button
            onClick={() => setDone(false)}
            className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-bold text-white/80 hover:bg-white/10 transition"
          >
            {t.submitAnother}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:pb-10">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
      >
        <ArrowLeft size={15} /> {t.backToHome}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center gap-3"
      >
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-accent-orange to-accent-purple">
          <Plus size={24} className="text-white" />
        </span>
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">{t.addOfferTitle}</h1>
          <p className="text-sm text-white/50">{t.addOfferSubtitle}</p>
        </div>
      </motion.div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Honeypot — hidden from humans, bots that fill it get silently dropped */}
        <div className="hidden" aria-hidden="true">
          <label>
            Leave this field empty
            <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>{t.shopName} *</span>
            <input required name="shop_name" className={inputCls} placeholder="e.g. Bunzilla Kitchen" />
          </label>
          <label className="block">
            <span className={labelCls}>{t.offerTitleLabel} *</span>
            <input required name="title" className={inputCls} placeholder="e.g. Buy 1 Get 1 Free" />
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>{t.discountTextLabel} *</span>
            <input required name="discount_text" className={inputCls} placeholder="30% OFF" />
          </label>
          <label className="block">
            <span className={labelCls}>{t.areaLabel} *</span>
            <select required name="area" className={inputCls} defaultValue="">
              <option value="" disabled className="bg-base">
                -- {t.filterArea} --
              </option>
              {AREAS.map((a) => (
                <option key={a} value={a} className="bg-base">
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>{t.categoryLabel} *</span>
            <select required name="category" className={inputCls} defaultValue="">
              <option value="" disabled className="bg-base">
                -- {t.filterCategory} --
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-base">
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>{t.paymentLabel} *</span>
            <select required name="payment_method" className={inputCls} defaultValue="">
              <option value="" disabled className="bg-base">
                -- {t.filterPayment} --
              </option>
              {PAYMENT_METHODS.map((p) => (
                <option key={p} value={p} className="bg-base">
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className={labelCls}>{t.validTillLabel} *</span>
          <input required type="date" name="valid_till" className={inputCls} />
        </label>

        <label className="block">
          <span className={labelCls}>{t.descriptionLabel} *</span>
          <textarea
            required
            name="description"
            rows={4}
            className={`${inputCls} resize-none`}
            placeholder="Describe the offer, terms and exclusions..."
          />
        </label>

        <label className="block">
          <span className={labelCls}>{t.photoLabel}</span>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-4 text-sm text-white/60 hover:bg-white/10 transition">
            <Upload size={18} className="text-accent-purple" />
            <span className={fileName ? "text-white/80" : ""}>
              {fileName || t.choosePhoto}
            </span>
            <input
              type="file"
              name="image"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
            />
          </label>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-6 py-4 font-bold text-white shadow-lg shadow-accent-pink/30 hover:opacity-90 transition disabled:opacity-60"
        >
          {submitting ? t.submitting : t.submitOffer}
        </button>
        {submitting && (
          <p className="text-center text-xs text-white/40">{t.pleaseWait}</p>
        )}
      </form>
    </main>
  );
}