# OfferMap BD — Launch Pack

## Live URL
https://offermap-bd.vercel.app/

## Ready-to-post share messages

### Facebook post (English)
Discover the best discounts and deals near you across Bangladesh! 🎯
OfferMap BD helps you find restaurant, fashion, electronics, grocery and more offers around your neighbourhood — location-aware, free, and always up to date.

🔗 https://offermap-bd.vercel.app/
#OfferMapBD #Bangladesh #Deals #Discounts

### Facebook post (Bangla)
আপনার gsbangla হ récupérer প্রস্তুত! 🎯
অফারম্যাপ বিডির মাধ্যমে আপনার পাশের রেস্টুরেন্ট, ফ্যাশন, ইলেকট্রনিক্স, মুদি ও আরওعديد অফার খুঁজে পান। লোকেশন-অ্যাওয়ার, বিনামূল্য ও সবসময় আপডেটেড।

🔗 https://offermap-bd.vercel.app/
#অফারম্যাপবিডি #বাংলাদেশ #ডিল #ডিসকাউন্ট

### WhatsApp message (English)
Hey! Check out OfferMap BD — find the best discounts and deals near you across Bangladesh. Restaurants, fashion, electronics, groceries and more. Free and location-aware.

https://offermap-bd.vercel.app/

### WhatsApp message (Bangla)
নমস্কার! আপনার gsbangla ಹ offering-gers হ roots- 될। অফারম্যাপ বিডিতে বাংলাদেশজুড়ে পাশের সেরা ডিসকাউন্ট ও ডিল খুঁজে পান। রেস্টুরেন্ট, ফ্যাশন, ইলেকট্রনিক্স, মুদি ও আরও। বিনামূল্য ও লোকেশন-অ্যাওয়ার।

https://offermap-bd.vercel.app/

### Message for shop owners (English)
Own a shop? List your offer for free on OfferMap BD and reach deal-seeking customers across Bangladesh. It takes under a minute to add your discount.

🔗 https://offermap-bd.vercel.app/add

### Message for shop owners (Bangla)
দোকান আছে? আপনার অফার বিনামূল্যে অফারম্যাপ বিডিতে তালিকাভুক্ত করুন এবং বাংলাদেশজুড়ে ডিলপ্রেমী গ্রাহকদের কাছে পৌঁছান। আপনার ডিসকাউন্ট যোগ করা এক মিনিটের কম সময় নebe।

🔗 https://offermap-bd.vercel.app/add

## What to watch in the admin dashboard on launch day
- **Offers added today / live now** — should rise as shop owners submit via /add.
- **Pending** — offers awaiting your approval; approve or reject promptly.
- **Errors in the last 24h** — client errors reported from the site; investigate spikes.
- **Scrape health** — red warning if the last scrape run is older than 36h or failed.
- **Visitors (unique today / page views)** — traffic from Facebook groups and WhatsApp shares.

## Optional Vercel environment variables
| Variable | Purpose | Required? |
|---|---|---|
| NEXT_PUBLIC_CONTACT_EMAIL | Contact email shown on /contact and footer | Optional |
| NEXT_PUBLIC_FACEBOOK_URL | Facebook page link shown in footer | Optional |
| NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION | Google Search Console verification | Optional |
| NEXT_PUBLIC_ADS_ENABLED | Set to "true" to enable ads (for later) | Optional (later) |
| NEXT_PUBLIC_ADSENSE_CLIENT | AdSense publisher ID (for later) | Optional (later) |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL | Required |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase public anon key | Required |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key (server-only) | Required |
| ADMIN_PASSWORD | Admin dashboard password | Required |
| GEMINI_API_KEY | Google Gemini API key for photo scan | Optional |

## Verification
Run `npm run verify` to confirm build, e2e, clean tree, git push, deploy, ads-off, report API, RLS check, no secrets, manifest/OG tags, client-error endpoint, QA report (zero open P0/P1), Lighthouse scores (>= 85), and GitHub Actions health.
