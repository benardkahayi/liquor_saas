// Must match BUSINESS_TYPES in backend/src/common/constants/businessTypes.ts.
export const BUSINESS_TYPES = [
  { value: "restaurant", labelKey: "btype.restaurant", label: "Restaurant / Food" },
  { value: "liquor_store", labelKey: "btype.liquor", label: "Liquor store / Bar" },
  { value: "retail", labelKey: "btype.retail", label: "Shop / Retail" },
  { value: "pharmacy", labelKey: "btype.pharmacy", label: "Pharmacy" },
  { value: "salon", labelKey: "btype.salon", label: "Salon / Barber" },
  { value: "fish", labelKey: "btype.fish", label: "Fish / Food supplies" },
  { value: "other", labelKey: "btype.other", label: "Other business" },
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number]["value"];

export function isRestaurant(industry: string | null | undefined) {
  return industry === "restaurant";
}
