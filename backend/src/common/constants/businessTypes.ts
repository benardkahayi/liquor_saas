// Stored in tenants.industry. "restaurant" switches the app to the
// restaurant menu and dashboard; every other type uses the shop screens.
export const BUSINESS_TYPES = [
  "restaurant",
  "liquor_store",
  "retail",
  "pharmacy",
  "salon",
  "fish",
  "other",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];
