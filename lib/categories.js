// Single source of truth for offer categories: key, English label, Bengali
// label, and a lucide icon. Unknown categories map to "Other" so nothing ever
// renders an undefined component.

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
  Search,
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
  { key: "Mobile Wallet Cashback", en: "Mobile Wallet Cashback", bn: "মোবাইল ওয়ালেট ক্যাশব্যাক", icon: Wallet },
  { key: "Other", en: "Other", bn: "অন্যান্য", icon: Tag },
];

// Ordered list of category keys (the strings used everywhere).
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

// Lookup a category by key; unknown keys map to the "Other" entry.
export function getCategory(key) {
  if (!key) return CATEGORIES[CATEGORIES.length - 1];
  for (const c of CATEGORIES) {
    if (c.key === key) return c;
  }
  return CATEGORIES[CATEGORIES.length - 1];
}

// Expose the category strings for code that just needs the list of allowed
// categories (filters, add form, scraper, admin).
export function categoryLabels() {
  return CATEGORIES.map((c) => c.key);
}
