"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Clock,
  Navigation,
  MessageCircle,
  Check,
  X,
  ArrowLeft,
  Heart,
  Flame,
  Share2,
  CreditCard,
  Flag,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import {
  getDirectionsUrl,
  whatsappShareUrl,
  messengerShareUrl,
  formatDate,
} from "@/lib/offers";
import Countdown from "./Countdown";
import MapView from "./MapView";
import { getSavedIds, toggleSavedId, getVotedType, setVotedType } from "@/lib/storage";
import Confetti from "./Confetti";

export default function OfferDetailClient({ offer }) {
  const { t } = useApp();
  const [saved, setSaved] = useState(
    () => typeof window !== "undefined" && getSavedIds().includes(String(offer.id))
  );
  const [userVote, setUserVote] = useState(() => getVotedType(offer.id));
  const [counts, setCounts] = useState({
    worked: offer.workedCount ?? 0,
    didntWork: offer.notWorkedCount ?? 0,
  });
  const [voting, setVoting] = useState(false);
  const [fireConfetti, setFireConfetti] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  async function handleReport() {
    if (reporting || reported) return;
    setReporting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer_id: offer.id, reason: "expired" }),
      });
      if (res.ok) {
        setReported(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReporting(false);
    }
  }

  function handleSave() {
    const wasSaved = saved;
    toggleSavedId(offer.id);
    setSaved(!wasSaved);
    if (!wasSaved) {
      setFireConfetti(true);
      setTimeout(() => setFireConfetti(false), 2800);
    }
  }

  async function handleVote(type) {
    // localStorage guard: this browser already voted on this offer.
    if (userVote) return;
    setVoting(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: offer.id, type }),
      });
      if (res.ok) {
        setVotedType(offer.id, type);
        setUserVote(type);
        setCounts((c) => ({
          ...c,
          [type === "worked" ? "worked" : "didntWork"]:
            (type === "worked" ? c.worked : c.didntWork) + 1,
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVoting(false);
    }
  }

  const directions = getDirectionsUrl(offer);
  const wa = whatsappShareUrl(offer);
  const msg = messengerShareUrl(offer);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 pb-24 md:pb-10">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
      >
        <ArrowLeft size={15} /> {t.backToHome}
      </Link>

      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl border border-white/10 bg-white/5"
      >
        {/* Image */}
        <div className="relative h-64 sm:h-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={offer.image}
            alt={`${offer.title} at ${offer.shopName}`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

          <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-4 py-2 text-lg font-extrabold text-white shadow-lg shadow-accent-pink/40">
              {offer.discountText}
            </span>
            {offer.isFeatured && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-l from-accent-purple to-accent-pink px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-white shadow-lg">
                <Check size={13} /> {t.featured}
              </span>
            )}
          </div>

          <button
            onClick={handleSave}
            aria-label={saved ? t.saved : t.save}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-black/40 backdrop-blur hover:bg-black/60 transition"
          >
            <Heart
              size={20}
              className={saved ? "fill-accent-pink text-accent-pink" : "text-white/80"}
            />
          </button>

          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-2xl font-black leading-tight sm:text-3xl">
              {offer.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
              <span>{offer.shopName}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} className="text-accent-orange" /> {offer.area}
              </span>
              {offer.viewsToday != null && (
                <span className="inline-flex items-center gap-1">
                  <Flame size={13} className="text-accent-orange" />
                  {offer.viewsToday} {t.viewsToday}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-7">
          {/* Validity countdown */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="glass inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/80">
              <Clock size={15} className="text-emerald-300" />
              {t.validity}: {formatDate(offer.validTill)}
            </div>
            <Countdown validTill={offer.validTill} />
          </div>

          {/* Payment */}
          <div className="mb-6 flex items-center gap-2">
            <CreditCard size={16} className="text-accent-purple" />
            <span className="text-sm text-white/50">{t.payment}:</span>
            <span className="rounded-lg bg-accent-purple/20 px-2.5 py-1 text-sm font-semibold text-accent-purple">
              {offer.paymentMethod}
            </span>
          </div>

          {/* Description */}
          <div className="mb-7">
            <h2 className="mb-2 text-lg font-bold">{t.description}</h2>
            <p className="leading-relaxed text-white/70">{offer.description}</p>
          </div>

          {/* Action buttons */}
          <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-accent-orange to-accent-pink px-4 py-3 font-bold text-white shadow-lg shadow-accent-pink/30 hover:opacity-90 transition"
            >
              <Navigation size={16} /> {t.getDirections}
            </a>
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 font-bold text-emerald-200 hover:bg-emerald-500/25 transition"
            >
              <MessageCircle size={16} /> {t.shareWhatsapp}
            </a>
            <a
              href={msg}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/15 px-4 py-3 font-bold text-blue-200 hover:bg-blue-500/25 transition"
            >
              <Share2 size={16} /> {t.shareMessenger}
            </a>
            <button
              onClick={handleReport}
              disabled={reporting || reported}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold transition ${
                reported
                  ? "bg-emerald-500/20 text-emerald-200 cursor-default"
                  : "border border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/25 disabled:opacity-60"
              }`}
            >
              <Flag size={16} />
              {reported ? t.reportSuccess : reporting ? "..." : t.report}
            </button>
          </div>

          {/* Worked / Didn't work */}
          <div className="mb-7 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleVote("worked")}
                disabled={!!userVote || voting}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-bold transition active:scale-95 disabled:opacity-60 ${
                  userVote === "worked"
                    ? "bg-emerald-500 text-white"
                    : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/25"
                }`}
              >
                <Check size={16} /> {t.worked} · {counts.worked}
              </button>
              <button
                onClick={() => handleVote("didntWork")}
                disabled={!!userVote || voting}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-bold transition active:scale-95 disabled:opacity-60 ${
                  userVote === "didntWork"
                    ? "bg-red-500 text-white"
                    : "border border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/25"
                }`}
              >
                <X size={16} /> {t.didntWork} · {counts.didntWork}
              </button>
              <span className="text-xs text-white/40">
                {counts.worked + counts.didntWork} {t.votes}
              </span>
            </div>
          </div>

          {/* Mini map */}
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <MapView
              offers={[offer]}
              userCoords={null}
              selectedId={offer.id}
              onSelect={() => {}}
            />
          </div>
        </div>
      </motion.article>

      <Confetti fire={fireConfetti} />
    </main>
  );
}