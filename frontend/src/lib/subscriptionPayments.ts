// How a business paid for its plan. Values match the backend enum.
export type PaymentMethod =
  | "MPESA"
  | "MIXX_BY_YAS"
  | "AIRTEL_MONEY"
  | "HALOPESA"
  | "BANK"
  | "CASH"
  | "OTHER";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "MPESA", label: "M-Pesa" },
  { value: "MIXX_BY_YAS", label: "Mixx by Yas (Tigo Pesa)" },
  { value: "AIRTEL_MONEY", label: "Airtel Money" },
  { value: "HALOPESA", label: "HaloPesa" },
  { value: "BANK", label: "Bank" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" },
];

// Mobile money and bank always give a transaction ID; cash doesn't.
export const NEEDS_REFERENCE: ReadonlySet<PaymentMethod> = new Set([
  "MPESA",
  "MIXX_BY_YAS",
  "AIRTEL_MONEY",
  "HALOPESA",
  "BANK",
]);

export function methodLabel(m: string): string {
  return PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m;
}

export interface SubscriptionPayment {
  id: string;
  tenantId: string;
  plan: "FREE" | "STARTER" | "PRO";
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  note: string | null;
  paidAt: string;
  periodEnd: string | null;
  createdAt: string;
  tenant: { id: string; name: string };
}

export const PLAN_LABEL: Record<string, string> = { FREE: "Free", STARTER: "Starter", PRO: "Pro" };

// Today's date in East Africa Time, as yyyy-mm-dd for <input type="date">.
export function todayEAT(): string {
  return new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
}
