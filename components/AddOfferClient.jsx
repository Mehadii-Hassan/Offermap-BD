"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { CATEGORIES, DIVISIONS, PAYMENT_METHODS, districtNames } from "@/lib/offers";
import { BD_BOUNDS, isInsideBangladesh } from "@/lib/bd-locations";

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_USER_AGENT = "OfferMapBD/1.0 (contact@offermap-bd.example.com)";

const DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 };
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Leaflet touches `window` at module load -> only load in the browser.
const LocationPickerMap = dynamic(
  () => import("./LocationPickerMap"),
  {
    ssr: false,
    loading: () => (
      <div
        className="relative grid h-[320px] w-full place-items-center rounded-2xl border border-white/10 bg-white/5 text-sm text-white/40"
        aria-busy="true"
      >
        Loading map…
      </div>
    ),
  }
);

async function nominatimSearch(query, lang) {
  if (!query.trim()) return [];
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "bd");
  url.searchParams.set("bounded", "1");
  url.searchParams.set(
    "viewbox",
    [BD_BOUNDS.minLng, BD_BOUNDS.minLat, BD_BOUNDS.maxLng, BD_BOUNDS.maxLat].join(",")
  );
  url.searchParams.set("limit", "5");
  url.searchParams.set("format", "json");
  url.searchParams.set("accept-language", lang === "bn" ? "bn" : "en");
  const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_USER_AGENT } });
  if (!res.ok) return [];
  return res.json();
}

async function nominatimReverse(lat, lng, lang) {
  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("format", "json");
  url.searchParams.set("accept-language", lang === "bn" ? "bn" : "en");
  const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_USER_AGENT } });
  if (!res.ok) return null;
  return res.json();
}

export default function AddOfferClient() {
  const { t, lang } = useApp();

  const [stage, setStage] = useState("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formTitle, setFormTitle] = useState("");
  const [formShopName, setFormShopName] = useState("");
  const [formDiscount, setFormDiscount] = useState("");
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formDivision, setFormDivision] = useState("Dhaka");
  const [formDistrict, setFormDistrict] = useState("Dhaka");
  const [formArea, setFormArea] = useState("Dhaka");
  const [formPayment, setFormPayment] = useState("Any");
  const [formValidTill, setFormValidTill] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [formDescription, setFormDescription] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [scanning, setScanning] = useState(false);
  const scanInputRef = useRef(null);

  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(12);
  const [markerLat, setMarkerLat] = useState(DEFAULT_CENTER.lat);
  const [markerLng, setMarkerLng] = useState(DEFAULT_CENTER.lng);
  const [formLat, setFormLat] = useState(DEFAULT_CENTER.lat);
  const [formLng, setFormLng] = useState(DEFAULT_CENTER.lng);

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const searchTimeoutRef = useRef(null);

  const divisions = DIVISIONS;
  const districts = formDivision ? districtNames(formDivision) : [];

  const setLocation = useCallback((lat, lng) => {
    setMarkerLat(lat);
    setMarkerLng(lng);
    setFormLat(lat);
    setFormLng(lng);
  }, []);

  const handleDivisionChange = useCallback(
    (val) => {
      setFormDivision(val);
      setFormDistrict("Dhaka");
      setFormArea("Dhaka");
      const center = divisions.find((d) => d.name === val);
      if (center) {
        setMapCenter({ lat: center.lat, lng: center.lng });
        setMapZoom(9);
        setLocation(center.lat, center.lng);
      }
    },
    [divisions, setLocation]
  );

  const handleDistrictChange = useCallback(
    (val) => {
      setFormDistrict(val);
      setFormArea(val || "Dhaka");
      const d = divisions
        .find((div) => div.name === formDivision)
        ?.districts.find((x) => x.name === val);
      if (d) {
        setMapCenter({ lat: d.lat, lng: d.lng });
        setMapZoom(11);
        setLocation(d.lat, d.lng);
        nominatimReverse(d.lat, d.lng, lang).then((data) => {
          if (data && data.display_name) setFormAddress(data.display_name);
        });
      }
    },
    [divisions, formDivision, lang, setLocation]
  );

  const handleMapClick = useCallback(
    (e) => {
      const { lat, lng } = e.latlng;
      setLocation(lat, lng);
      if (!isInsideBangladesh(lat, lng)) {
        setError(t.invalidAddress);
        return;
      }
      setError("");
      nominatimReverse(lat, lng, lang).then((data) => {
        if (data && data.display_name) setFormAddress(data.display_name);
      });
    },
    [lang, setLocation, t.invalidAddress]
  );

  const handleCurrentLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError(t.nearMeDenied);
      return;
    }
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!isInsideBangladesh(latitude, longitude)) {
          setError(t.invalidAddress);
          return;
        }
        setLocation(latitude, longitude);
        setMapCenter({ lat: latitude, lng: longitude });
        setMapZoom(15);
        nominatimReverse(latitude, longitude, lang).then((data) => {
          if (data && data.display_name) setFormAddress(data.display_name);
        });
      },
      () => {
        setError(t.nearMeDenied);
      }
    );
  }, [lang, setLocation, t.invalidAddress, t.nearMeDenied]);

  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchQuery(value);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (!value.trim()) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      searchTimeoutRef.current = setTimeout(() => {
        nominatimSearch(value, lang).then((results) => {
          setSearchResults(results);
          setSearching(false);
        });
      }, 300);
    },
    [lang]
  );

  const pickSearchResult = useCallback(
    (r) => {
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lon);
      if (!isInsideBangladesh(lat, lng)) {
        setError(t.invalidAddress);
        return;
      }
      setError("");
      setSearchQuery(r.display_name || "");
      setSearchResults([]);
      setLocation(lat, lng);
      setMapCenter({ lat, lng });
      setMapZoom(15);
      setFormAddress(r.display_name || "");
    },
    [setLocation, t.invalidAddress]
  );

  const handlePhotoChange = useCallback(
    (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > MAX_PHOTO_BYTES) {
        setPhotoError(t.uploadTooBig);
        setPhotoFile(null);
        setPhotoPreview(null);
        return;
      }
      if (file.type && !PHOTO_TYPES.includes(file.type)) {
        setPhotoError(t.uploadType);
        setPhotoFile(null);
        setPhotoPreview(null);
        return;
      }
      setPhotoFile(file);
      setPhotoError("");
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target ? ev.target.result : null);
      reader.readAsDataURL(file);
    },
    [t.uploadTooBig, t.uploadType]
  );

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // BATCH H6: pre-set the pin from /add?lat=..&lng=..&place=.. (the empty-state
  // card links here with the chosen place).
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const lat = parseFloat(u.searchParams.get("lat"));
      const lng = parseFloat(u.searchParams.get("lng"));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setLocation(lat, lng);
        setMapCenter({ lat, lng });
        setMapZoom(14);
        const place = u.searchParams.get("place");
        if (place) {
          setFormArea(place);
          setFormAddress(place);
        } else {
          nominatimReverse(lat, lng, lang).then((data) => {
            if (data && data.display_name) setFormAddress(data.display_name);
          });
        }
      }
    } catch (e) {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = useCallback(() => {
    setFormTitle("");
    setFormShopName("");
    setFormDiscount("");
    setFormCategory(CATEGORIES[0]);
    setFormDivision("Dhaka");
    setFormDistrict("Dhaka");
    setFormArea("Dhaka");
    setFormPayment("Any");
    setFormValidTill(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setFormDescription("");
    setFormAddress("");
    setFormPhone("");
    setMapCenter(DEFAULT_CENTER);
    setMapZoom(12);
    setLocation(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoError("");
    setSearchQuery("");
    setSearchResults([]);
    setError("");
  }, [setLocation]);

  // AI fill: upload a photo/screenshot, server reads it with Gemini and
  // prefills the form fields so the user only verifies and submits.
  async function handleScanFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setScanning(true);
    try {
      const fd = new FormData();
      fd.set("image", file);
      const res = await fetch("/api/scan-offer", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.fields) {
        setError(data.error || "AI could not read this image.");
        return;
      }
      const f = data.fields;
      if (f.title) setFormTitle(f.title);
      if (f.shopName) setFormShopName(f.shopName);
      if (f.discountText) setFormDiscount(f.discountText);
      if (f.category && f.category !== "Other") setFormCategory(f.category);
      if (f.area) setFormArea(f.area);
      if (f.validTill) setFormValidTill(f.validTill);
      if (f.description) setFormDescription(f.description);
      if (f.address) setFormAddress(f.address);
      if (f.lat != null && f.lng != null) {
        setFormLat(f.lat);
        setFormLng(f.lng);
        setMarkerLat(f.lat);
        setMarkerLng(f.lng);
        setMapCenter({ lat: f.lat, lng: f.lng });
        setMapZoom(14);
      }
    } catch (err) {
      console.error(err);
      setError("AI fill failed. Please try again or fill the form manually.");
    } finally {
      setScanning(false);
    }
  }

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      if (
        !formTitle.trim() ||
        !formShopName.trim() ||
        !formDiscount.trim() ||
        !formArea.trim() ||
        !formValidTill ||
        !formDescription.trim() ||
        !formAddress.trim()
      ) {
        setError(t.fieldRequired);
        return;
      }
      if (!isInsideBangladesh(formLat, formLng)) {
        setError(t.invalidAddress);
        return;
      }
      setSubmitting(true);
      const formData = new FormData();
      formData.set("title", formTitle.trim());
      formData.set("shop_name", formShopName.trim());
      formData.set("discount_text", formDiscount.trim());
      formData.set("category", formCategory);
      formData.set("division", formDivision);
      formData.set("district", formDistrict);
      formData.set("area", formArea.trim());
      formData.set("payment_method", formPayment);
      formData.set("valid_till", formValidTill);
      formData.set("description", formDescription.trim());
      formData.set("lat", String(formLat));
      formData.set("lng", String(formLng));
      formData.set("address", formAddress.trim());
      if (formPhone.trim()) formData.set("phone", formPhone.trim());
      if (photoFile) formData.set("image", photoFile);

      try {
        const res = await fetch("/api/submit", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || t.submitError);
          setSubmitting(false);
          return;
        }
        resetForm();
        setStage("success");
      } catch (err) {
        console.error(err);
        setError(t.submitError);
      }
      setSubmitting(false);
    },
    [
      formTitle, formShopName, formDiscount, formCategory, formDivision,
      formDistrict, formArea, formPayment, formValidTill, formDescription,
      formLat, formLng, formAddress, photoFile, t, resetForm,
    ]
  );

  if (stage === "success") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center space-y-6">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
          <h2 className="text-3xl font-bold">{t.thanksTitle}</h2>
          <p className="text-white/60">{t.thanksText}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 px-6 py-3 font-semibold text-white hover:opacity-90 transition"
            >
              {t.goHome}
            </Link>
            <button
              onClick={() => setStage("form")}
              className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white/80 hover:bg-white/10 transition"
            >
              {t.submitAnother}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-accent-purple transition placeholder:text-white/30";
  const labelCls =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{t.addOfferTitle}</h1>
        <p className="text-white/50">{t.addOfferSubtitle}</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <input
            ref={scanInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleScanFile}
          />
          <button
            type="button"
            onClick={() => scanInputRef.current && scanInputRef.current.click()}
            disabled={scanning}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent-purple/50 bg-accent-purple/10 px-4 py-4 text-sm font-semibold text-accent-purple hover:bg-accent-purple/20 transition disabled:opacity-60"
          >
            {scanning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> AI is reading your photo…</>
            ) : (
              <>📸 Upload offer photo / screenshot (AI fills the form)</>
            )}
          </button>
          {photoError && <p className="mt-1 text-sm text-pink-500">{photoError}</p>}
        </div>
        <div>
          <label className={labelCls}>{t.shopName}</label>
          <input
            className={inputCls}
            value={formShopName}
            onChange={(e) => setFormShopName(e.target.value)}
            placeholder="e.g. Sweet Sensation Cafe"
            required
          />
        </div>

        <div>
          <label className={labelCls}>{t.offerTitleLabel}</label>
          <input
            className={inputCls}
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="e.g. 30% off all menu items"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{t.discountTextLabel}</label>
            <input
              className={inputCls}
              value={formDiscount}
              onChange={(e) => setFormDiscount(e.target.value)}
              placeholder="e.g. 30% OFF"
              required
            />
          </div>
          <div>
            <label className={labelCls}>{t.categoryLabel}</label>
            <select
              className={inputCls}
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              required
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-base">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{t.filterDivision}</label>
            <select
              className={inputCls}
              value={formDivision}
              onChange={(e) => handleDivisionChange(e.target.value)}
              required
            >
              {divisions.map((d) => (
                <option key={d.name} value={d.name} className="bg-base">
                  {d.name} · {d.bn}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t.filterDistrict}</label>
            <select
              className={inputCls}
              value={formDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              required
            >
              {districts.map((d) => (
                <option key={d} value={d} className="bg-base">
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>{t.areaLabel}</label>
          <input
            className={inputCls}
            value={formArea}
            onChange={(e) => setFormArea(e.target.value)}
            placeholder="e.g. Dhanmondi, Gulshan, Banani..."
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{t.paymentLabel}</label>
            <select
              className={inputCls}
              value={formPayment}
              onChange={(e) => setFormPayment(e.target.value)}
              required
            >
              {PAYMENT_METHODS.map((p) => (
                <option key={p} value={p} className="bg-base">
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t.validTillLabel}</label>
            <input
              type="date"
              className={inputCls}
              value={formValidTill}
              onChange={(e) => setFormValidTill(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>{t.descriptionLabel}</label>
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Tell us more about this offer..."
            required
          />
        </div>

        <div>
          <label className={labelCls}>{t.phoneLabel}</label>
          <input
            className={inputCls}
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
            placeholder="01700000000"
            inputMode="tel"
          />
        </div>

        <div>
          <label className={labelCls}>{t.addressLabel}</label>
          <div className="rounded-xl border border-white/15 bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-white/50" />
              <input
                className="flex-1 rounded-lg border-0 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={t.searchAddress}
                aria-label="Search address"
              />
              {searching && <Loader2 className="w-4 h-4 animate-spin text-white/50" />}
            </div>
            {searchResults.length > 0 && (
              <div className="mt-3 max-h-44 overflow-y-auto rounded-lg border border-white/10 bg-base/80">
                {searchResults.map((r) => (
                  <button
                    key={r.place_id}
                    type="button"
                    onClick={() => pickSearchResult(r)}
                    className="block w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/5 transition"
                  >
                    <span className="block truncate">{r.display_name}</span>
                    <span className="block text-[10px] text-white/40">
                      {r.type ? `${r.type}, ` : ""}
                      {r.city || r.village || r.town || ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <LocationPickerMap
            center={mapCenter}
            zoom={mapZoom}
            markerLat={markerLat}
            markerLng={markerLng}
            onMapClick={handleMapClick}
            onCurrentLocation={handleCurrentLocation}
            markerLabel={formArea}
            markerAddress={formAddress}
          />

          {(formArea || formAddress) && (
            <p className="mt-2 text-sm font-semibold text-emerald-300">
              📍 {formArea || formAddress}
            </p>
          )}

          <textarea
            className={`${inputCls} mt-3 resize-none`}
            rows={2}
            value={formAddress}
            onChange={(e) => setFormAddress(e.target.value)}
            placeholder={t.addressLabel}
          />
        </div>

        <div>
          <label className={labelCls}>{t.photoLabel}</label>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className={`${inputCls} cursor-pointer`}
          />
          {photoError && <p className="mt-1 text-sm text-pink-500">{photoError}</p>}
          {photoPreview && (
            <img
              src={photoPreview}
              alt="Preview"
              className="mt-3 h-32 w-32 rounded-xl object-cover border border-white/10"
            />
          )}
        </div>

        {error && (
          <p className="flex items-center gap-2 text-sm text-pink-500">
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-700 px-6 py-3 text-lg font-semibold text-white hover:opacity-90 transition ${
            submitting ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> {t.submitting}
            </>
          ) : (
            t.submitOffer
          )}
        </button>
      </form>
    </div>
  );
}