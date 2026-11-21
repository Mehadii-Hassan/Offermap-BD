// Shared offer-filter logic (BATCH K6): single source of truth for the offer
// predicates behind the home feed filters and the filter panel "Apply (N)"
// count. Plain functions only, no React, safe to import anywhere.
export const DEFAULT_FILTERS = {
  category: "All",
  division: "All",
  district: "All",
  payment: "Any",
  radius: "Any",
  sort: "nearest",
};

// Does this offer pass the given category / division / district / payment
// filters? `nationwide` offers are exempt from division/district scoping.
export function offersMatchFilters(
  o,
  { category, division, district, payment } = {}
) {
  if (category && category !== "All" && o.category !== category) return false;
  if (division && division !== "All" && o.nationwide !== true && o.division !== division)
    return false;
  if (district && district !== "All" && o.nationwide !== true && o.district !== district)
    return false;
  if (payment && payment !== "Any" && o.paymentMethod !== payment) return false;
  return true;
}

// How many offers currently match the given filters.
export function countOffers(
  offers,
  { category, division, district, payment } = {}
) {
  return offers.filter((o) => offersMatchFilters(o, { category, division, district, payment })).length;
}
