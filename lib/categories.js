// Single source of truth for offer categories: key, English label, Bengali
// label, and a lucide icon. Unknown categories map to "Other" so nothing ever
// renders an undefined component.
//
// This is the ONLY list the app uses (chips, filters, /add form, admin,
// scraper, DB fixes). Keep it small and canonical — one entry per category.

import {
  UtensilsCrossed,
  Shirt,
  CreditCard,
  Smartphone,
  Scissors,
  ShoppingBasket,
  Clapperboard,
  Plane,
  Cpu,
  HeartPulse,
  GraduationCap,
  ShoppingCart,
  Wallet,
  Tag,
  Sparkles,
} from "lucide-react";

export const CATEGORIES = [
  { key: "Restaurant", en: "Restaurant", bn: "রেস্টুরেন্ট", icon: UtensilsCrossed },
  { key: "Fashion & Clothing", en: "Fashion & Clothing", bn: "ফ্যাশন ও পোশাক", icon: Shirt },
  { key: "Bank Card Offers", en: "Bank Card Offers", bn: "ব্যাংক কার্ড অফার", icon: CreditCard },
  { key: "Electronics", en: "Electronics", bn: "ইলেকট্রনিক্স", icon: Smartphone },
  { key: "Salon & Beauty", en: "Salon & Beauty", bn: "সেলুন ও বিউটি", icon: Scissors },
  { key: "Grocery", en: "Grocery", bn: "মুদি", icon: ShoppingBasket },
  { key: "Entertainment", en: "Entertainment", bn: "বিনোদন", icon: Clapperboard },
  { key: "Travel & Hotels", en: "Travel & Hotels", bn: "ভ্রমণ ও হোটেল", icon: Plane },
  { key: "Mobile & Gadgets", en: "Mobile & Gadgets", bn: "মোবাইল ও গ্যাজেট", icon: Cpu },
  { key: "Health & Fitness", en: "Health & Fitness", bn: "স্বাস্থ্য ও ফিটনেস", icon: HeartPulse },
  { key: "Education & Courses", en: "Education & Courses", bn: "শিক্ষা ও কোর্স", icon: GraduationCap },
  { key: "Online Shopping", en: "Online Shopping", bn: "অনলাইন কেনাকাটা", icon: ShoppingCart },
  { key: "Cashback & Wallet", en: "Cashback & Wallet", bn: "কাশবাক ও ওয়ালেট", icon: Wallet },
  { key: "Other", en: "Other", bn: "অন্যান্য", icon: Tag },
];

// Ordered list of canonical category keys (excluding the "Other" fallback).
export const ACTIVE_CATEGORIES = CATEGORIES.filter((c) => c.key !== "Other");

// Ordered list of category keys (the strings used everywhere).
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

// Aliases (lower-cased) that map old/legacy/alternate database or UI values to
// a canonical category key. Covers lowercase, partial, and Bengali naming.
const ALIASES = {
  "mobile wallet cashback": "Cashback & Wallet",
  "mobile wallets": "Cashback & Wallet",
  "mobile wallet": "Cashback & Wallet",
  "wallet cashback": "Cashback & Wallet",
  cashback: "Cashback & Wallet",
  wallet: "Cashback & Wallet",
  "cashback & wallet": "Cashback & Wallet",
  "bank cards": "Bank Card Offers",
  bankcard: "Bank Card Offers",
  "bank card": "Bank Card Offers",
  "cards ": "Bank Card Offers",
  health: "Health & Fitness",
  fitness: "Health & Fitness",
  "health & fitness": "Health & Fitness",
  "salon & beauty": "Salon & Beauty",
  salon: "Salon & Beauty",
  beauty: "Salon & Beauty",
  "mobile & gadgets": "Mobile & Gadgets",
  "mobile gadgets": "Mobile & Gadgets",
  gadgets: "Mobile & Gadgets",
  electronics: "Electronics",
  grocery: "Grocery",
  restaurant: "Restaurant",
  "fashion & clothing": "Fashion & Clothing",
  fashion: "Fashion & Clothing",
  clothing: "Fashion & Clothing",
  entertainment: "Entertainment",
  "travel & hotels": "Travel & Hotels",
  travel: "Travel & Hotels",
  hotels: "Travel & Hotels",
  "education & courses": "Education & Courses",
  education: "Education & Courses",
  courses: "Education & Courses",
  "online shopping": "Online Shopping",
  "restaurant ": "Restaurant",
};

const FALLBACK_ICON = Sparkles;

// Icon used for the "All" chip and when a category has no usable icon.
export function fallbackIcon() {
  return FALLBACK_ICON;
}

// Lookup a category by key (or exact English/Bengali label); unknown keys map
// to the "Other" entry.
export function getCategory(key) {
  if (!key) return CATEGORIES[CATEGORIES.length - 1];
  const low = String(key).trim().toLowerCase();
  for (const c of CATEGORIES) {
    if (c.key.toLowerCase() === low) return c;
    if (String(c.bn || "").toLowerCase() === low) return c;
  }
  return CATEGORIES[CATEGORIES.length - 1];
}

// Map any old/unknown/lowercase/Bengali category text to the canonical key.
export function normalizeCategory(input) {
  const raw = String(input || "").trim();
  if (!raw) return "Other";
  const low = raw.toLowerCase();
  for (const c of CATEGORIES) {
    if (c.key.toLowerCase() === low) return c.key;
    if (String(c.bn || "").toLowerCase() === low) return c.key;
  }
  return ALIASES[low] || "Other";
}

// Expose the category strings for code that just needs the list of allowed
// categories (filters, add form, scraper, admin).
export function categoryLabels() {
  return CATEGORIES.map((c) => c.key);
}