// Complete Bangladesh location data: 8 divisions, 64 districts, and main
// Dhaka areas, each with a center lat/lng and a Bengali name.
// Used for the /add form, filters, and as a geocoding fallback in the scraper.

// Bangladesh bounding box (approx)
export const BD_BOUNDS = {
  minLat: 20.5,
  maxLat: 26.7,
  minLng: 88.0,
  maxLng: 92.7,
};

export function isInsideBangladesh(lat, lng) {
  return (
    lat >= BD_BOUNDS.minLat &&
    lat <= BD_BOUNDS.maxLat &&
    lng >= BD_BOUNDS.minLng &&
    lng <= BD_BOUNDS.maxLng
  );
}

// Main locations within Dhaka (city centers), used for quick selection and
// as a geocoding hint. Each has a Bengali name.
export const DHAKA_AREAS = [
  { name: "Dhanmondi", bn: "ধানমন্ডি", lat: 23.7461, lng: 90.3762 },
  { name: "Gulshan", bn: "গুলশান", lat: 23.7925, lng: 90.4064 },
  { name: "Banani", bn: "বনানী", lat: 23.7937, lng: 90.4066 },
  { name: "Uttara", bn: "উত্তরা", lat: 23.8759, lng: 90.3795 },
  { name: "Mirpur", bn: "মিরপুর", lat: 23.8101, lng: 90.3559 },
  { name: "Mohammadpur", bn: "মোহাম্মদপুর", lat: 23.7657, lng: 90.3567 },
  { name: "Motijheel", bn: "মতিঝিল", lat: 23.7287, lng: 90.4146 },
  { name: "Old Dhaka", bn: "পুরান ঢাকা", lat: 23.7100, lng: 90.4100 },
  { name: "Bashundhara", bn: "বসুন্ধরা", lat: 23.8186, lng: 90.4308 },
  { name: "Badda", bn: "বাড্ডা", lat: 23.7809, lng: 90.4266 },
  { name: "Mohakhali", bn: "মোহাখালী", lat: 23.7813, lng: 90.4058 },
];

// Legacy AREA_COORDS for backward compatibility with existing code
export const AREA_COORDS = Object.fromEntries(
  DHAKA_AREAS.map((a) => [a.name, { lat: a.lat, lng: a.lng }])
);

// Divisions with their district names (all 64 districts across Bangladesh)
export const DIVISIONS = [
  {
    name: "Dhaka",
    bn: "ঢাকা",
    lat: 23.8103,
    lng: 90.4125,
    districts: [
      { name: "Dhaka", bn: "ঢাকা", lat: 23.8103, lng: 90.4125 },
      { name: "Faridpur", bn: "ফরিদপুর", lat: 23.5475, lng: 89.8517 },
      { name: "Gazipur", bn: "গাজীপুর", lat: 24.0025, lng: 90.4284 },
      { name: "Gopalganj", bn: "গোপালগঞ্জ", lat: 23.0047, lng: 89.8244 },
      { name: "Kishoreganj", bn: "কিশোরগঞ্জ", lat: 24.4449, lng: 90.7766 },
      { name: "Madaripur", bn: "মাদারীপুর", lat: 23.1642, lng: 90.1914 },
      { name: "Manikganj", bn: "মানিকগঞ্জ", lat: 23.8486, lng: 90.0044 },
      { name: "Munshiganj", bn: "মুন্সীগঞ্জ", lat: 23.5433, lng: 90.5342 },
      { name: "Narayanganj", bn: "নারায়ণগঞ্জ", lat: 23.6238, lng: 90.5002 },
      { name: "Narsingdi", bn: "নরসিংদী", lat: 23.9306, lng: 90.7139 },
      { name: "Rajbari", bn: "রাজবাড়ী", lat: 23.7550, lng: 89.6445 },
      { name: "Shariatpur", bn: "শরীয়তপুর", lat: 23.2075, lng: 90.3495 },
      { name: "Tangail", bn: "টাঙ্গাইল", lat: 24.2513, lng: 89.9187 },
    ],
  },
  {
    name: "Chattogram",
    bn: "চট্টগ্রাম",
    lat: 22.3569,
    lng: 91.7832,
    districts: [
      { name: "Chattogram", bn: "চট্টগ্রাম", lat: 22.3569, lng: 91.7832 },
      { name: "Bandarban", bn: "বান্দরবান", lat: 22.1953, lng: 92.2181 },
      { name: "Brahmanbaria", bn: "ব্রাহ্মণবাড়িয়া", lat: 23.9563, lng: 91.1112 },
      { name: "Chandpur", bn: "চাঁদপুর", lat: 23.2333, lng: 90.6711 },
      { name: "Cumilla", bn: "কুমিল্লা", lat: 23.4607, lng: 91.1809 },
      { name: "Cox's Bazar", bn: "কক্সবাজার", lat: 21.4272, lng: 92.0058 },
      { name: "Feni", bn: "ফেনী", lat: 23.0159, lng: 91.3957 },
      { name: "Khagrachhari", bn: "খাগড়াছড়ি", lat: 23.1193, lng: 91.9847 },
      { name: "Lakshmipur", bn: "লক্ষ্মীপুর", lat: 22.9430, lng: 90.8292 },
      { name: "Noakhali", bn: "নোয়াখালী", lat: 22.8696, lng: 91.0993 },
      { name: "Rangamati", bn: "রাঙ্গামাটি", lat: 22.6474, lng: 92.1626 },
    ],
  },
  {
    name: "Rajshahi",
    bn: "রাজশাহী",
    lat: 24.3745,
    lng: 88.6042,
    districts: [
      { name: "Rajshahi", bn: "রাজশাহী", lat: 24.3745, lng: 88.6042 },
      { name: "Bogura", bn: "বগুড়া", lat: 24.8436, lng: 89.3727 },
      { name: "Chapainawabganj", bn: "চাঁপাইনবাবগঞ্জ", lat: 24.6139, lng: 88.2667 },
      { name: "Joypurhat", bn: "জয়পুরহাট", lat: 25.1025, lng: 89.0299 },
      { name: "Naogaon", bn: "নওগাঁ", lat: 24.8116, lng: 88.9411 },
      { name: "Natore", bn: "নাটোর", lat: 24.4154, lng: 89.0299 },
      { name: "Pabna", bn: "পাবনা", lat: 24.0032, lng: 89.2411 },
      { name: "Sirajganj", bn: "সিরাজগঞ্জ", lat: 24.4500, lng: 89.7050 },
    ],
  },
  {
    name: "Khulna",
    bn: "খুলনা",
    lat: 22.8170,
    lng: 89.5667,
    districts: [
      { name: "Khulna", bn: "খুলনা", lat: 22.8170, lng: 89.5667 },
      { name: "Bagerhat", bn: "বাগেরহাট", lat: 22.6516, lng: 89.7852 },
      { name: "Chuadanga", bn: "চুয়াডাঙ্গা", lat: 23.6432, lng: 88.8555 },
      { name: "Jashore", bn: "যশোর", lat: 23.1634, lng: 89.2076 },
      { name: "Jhenaidah", bn: "ঝিনাইদহ", lat: 23.5450, lng: 89.1726 },
      { name: "Kushtia", bn: "কুষ্টিয়া", lat: 23.9010, lng: 89.1210 },
      { name: "Magura", bn: "মাগুরা", lat: 23.4853, lng: 89.4295 },
      { name: "Meherpur", bn: "মেহেরপুর", lat: 23.7737, lng: 88.6593 },
      { name: "Narail", bn: "নড়াইল", lat: 23.1634, lng: 89.4767 },
      { name: "Satkhira", bn: "সাতক্ষীরা", lat: 22.7125, lng: 89.0750 },
    ],
  },
  {
    name: "Barishal",
    bn: "বরিশাল",
    lat: 22.7007,
    lng: 90.3612,
    districts: [
      { name: "Barishal", bn: "বরিশাল", lat: 22.7007, lng: 90.3612 },
      { name: "Barguna", bn: "বরগুনা", lat: 22.1493, lng: 90.1297 },
      { name: "Bhola", bn: "ভোলা", lat: 22.6885, lng: 90.6482 },
      { name: "Jhalokathi", bn: "ঝালকাঠি", lat: 22.6421, lng: 90.2002 },
      { name: "Patuakhali", bn: "পটুয়াখালী", lat: 22.3562, lng: 90.3291 },
      { name: "Pirojpur", bn: "পিরোজপুর", lat: 22.5781, lng: 89.9985 },
    ],
  },
  {
    name: "Sylhet",
    bn: "সিলেট",
    lat: 24.9017,
    lng: 91.8706,
    districts: [
      { name: "Sylhet", bn: "সিলেট", lat: 24.9017, lng: 91.8706 },
      { name: "Habiganj", bn: "হবিগঞ্জ", lat: 24.3785, lng: 91.4125 },
      { name: "Moulvibazar", bn: "মৌলভীবাজার", lat: 24.4864, lng: 91.7602 },
      { name: "Sunamganj", bn: "সুনামগঞ্জ", lat: 25.0653, lng: 91.3784 },
    ],
  },
  {
    name: "Rangpur",
    bn: "রংপুর",
    lat: 25.7439,
    lng: 89.2777,
    districts: [
      { name: "Rangpur", bn: "রংপুর", lat: 25.7439, lng: 89.2777 },
      { name: "Dinajpur", bn: "দিনাজপুর", lat: 25.6273, lng: 88.6333 },
      { name: "Gaibandha", bn: "গাইবান্ধা", lat: 25.3288, lng: 89.5440 },
      { name: "Kurigram", bn: "কুড়িগ্রাম", lat: 25.8072, lng: 89.6417 },
      { name: "Lalmonirhat", bn: "লালমনিরহাট", lat: 25.9927, lng: 89.2833 },
      { name: "Nilphamari", bn: "নীলফামারী", lat: 25.8560, lng: 88.9022 },
      { name: "Panchagarh", bn: "পঞ্চগড়", lat: 26.3420, lng: 88.5617 },
      { name: "Thakurgaon", bn: "ঠাকুরগাঁও", lat: 26.0316, lng: 88.4663 },
    ],
  },
  {
    name: "Mymensingh",
    bn: "ময়মনসিংহ",
    lat: 24.7471,
    lng: 90.4203,
    districts: [
      { name: "Mymensingh", bn: "ময়মনসিংহ", lat: 24.7471, lng: 90.4203 },
      { name: "Jamalpur", bn: "জামালপুর", lat: 24.9246, lng: 89.9472 },
      { name: "Netrokona", bn: "নেত্রকোণা", lat: 24.8839, lng: 90.7243 },
      { name: "Sherpur", bn: "শেরপুর", lat: 25.0183, lng: 90.1220 },
    ],
  },
];

// Flat list of every district with its division for easy lookup.
export const DISTRICTS = DIVISIONS.flatMap((div) =>
  div.districts.map((d) => ({ ...d, division: div.name, divisionBn: div.bn }))
);

export function divisionNames() {
  return DIVISIONS.map((d) => d.name);
}

export function districtNames(division) {
  const div = DIVISIONS.find((d) => d.name === division);
  if (!div) return [];
  return div.districts.map((d) => d.name);
}

export function districtInfo(district) {
  return DISTRICTS.find((d) => d.name === district) || null;
}

export function divisionCenter(division) {
  const div = DIVISIONS.find((d) => d.name === division);
  return div ? { lat: div.lat, lng: div.lng } : null;
}

// The scraper category values (wide, also includes Dhaka-only list removal).
export const OFFER_CATEGORIES = [
  "Restaurant",
  "Fashion & Clothing",
  "Bank Card Offers",
  "Electronics",
  "Salon & Beauty",
  "Grocery",
  "Entertainment",
  "Travel & Hotels",
  "Mobile & Gadgets",
  "Health",
  "Education & Courses",
  "Online Shopping",
  "Mobile Wallet Cashback",
];