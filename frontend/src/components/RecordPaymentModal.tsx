import { useState, type FormEvent } from "react";
import { api } from "../api/client";
import { money } from "../lib/money";
import { useLanguage } from "../context/LanguageContext";
import { Modal } from "./Modal";
import { ErrorBanner, extractErrorMessage } from "./ErrorBanner";
import {
  NEEDS_REFERENCE,
  PAYMENT_METHODS,
  PLAN_LABEL,
  todayEAT,
  type PaymentMethod,
} from "../lib/subscriptionPayments";

type PlanName = "FREE" | "STARTER" | "PRO";

interface Props {
  tenantId: string;
  businessName: string;
  currentPlan: PlanName;
  plan: Exclude<PlanName, "FREE">;
  // Monthly price for this business; null while its price isn't set yet.
  priceTzs: number | null;
  onClose: () => void;
  onSaved: () => void;
}

// Save the money a business paid, and switch its plan on (or add 30 days).
export function RecordPaymentModal({ tenantId, businessName, currentPlan, plan, priceTzs, onClose, onSaved }: Props) {
  const { t } = useLanguage();
  const renewing = plan === currentPlan;
  const [amount, setAmount] = useState(priceTzs ? String(priceTzs) : "");
  const [method, setMethod] = useState<PaymentMethod>("MPESA");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(todayEAT());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const needsRef = NEEDS_REFERENCE.has(method);
  const planLabel = PLAN_LABEL[plan];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // Payments recorded for today keep the current time; earlier days are
      // saved at midday EAT so they land on the right day.
      const paidAt = paidOn === todayEAT() ? undefined : new Date(`${paidOn}T12:00:00+03:00`).toISOString();
      await api.put(`/superadmin/tenants/${tenantId}/plan`, {
        plan,
        payment: {
          amount: Number(amount),
          method,
          reference: reference.trim() || undefined,
          note: note.trim() || undefined,
          paidAt,
        },
      });
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err, t("superadmin.pay.error", "Could not save the payment")));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={renewing ? t("superadmin.pay.titleRenew", "Record a renewal") : t("superadmin.pay.title", "Record payment")}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{businessName}</span>
          {" · "}
          {renewing
            ? t("superadmin.pay.renewNote", "{p}: adds 30 days on top of the time left.").replace("{p}", planLabel)
            : t("superadmin.pay.switchNote", "Switches on {p} for 30 days.").replace("{p}", planLabel)}
        </p>

        <ErrorBanner message={error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pay-amount" className="mb-1 block text-sm font-medium text-gray-700">
              {t("superadmin.pay.amount", "Amount received (TSh)")}
            </label>
            <input
              id="pay-amount"
              required
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
            />
            <p className="mt-1 text-xs text-gray-500">
              {priceTzs !== null
                ? `${t("superadmin.pay.price", "Plan price")}: ${money(priceTzs)}`
                : t("superadmin.pay.noPrice", "No price set for this business type yet — enter what you agreed.")}
            </p>
          </div>
          <div>
            <label htmlFor="pay-method" className="mb-1 block text-sm font-medium text-gray-700">
              {t("superadmin.pay.method", "Paid with")}
            </label>
            <select
              id="pay-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="input bg-white"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="pay-ref" className="mb-1 block text-sm font-medium text-gray-700">
            {t("superadmin.pay.reference", "Transaction ID")}
            {!needsRef && <span className="font-normal text-gray-400"> ({t("common.optional", "optional")})</span>}
          </label>
          <input
            id="pay-ref"
            required={needsRef}
            maxLength={80}
            autoComplete="off"
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            className="input font-mono"
          />
          <p className="mt-1 text-xs text-gray-500">
            {t("superadmin.pay.referenceHelp", "From the payment SMS or bank slip. The same ID can't be saved twice.")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pay-date" className="mb-1 block text-sm font-medium text-gray-700">
              {t("superadmin.pay.date", "Date paid")}
            </label>
            <input
              id="pay-date"
              required
              type="date"
              max={todayEAT()}
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="pay-note" className="mb-1 block text-sm font-medium text-gray-700">
              {t("superadmin.pay.note", "Note")} <span className="font-normal text-gray-400">({t("common.optional", "optional")})</span>
            </label>
            <input id="pay-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className="input" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            {t("common.cancel", "Cancel")}
          </button>
          <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm">
            {saving
              ? t("common.saving", "Saving...")
              : renewing
                ? t("superadmin.pay.saveRenew", "Save and add 30 days")
                : t("superadmin.pay.save", "Save and switch on {p}").replace("{p}", planLabel)}
          </button>
        </div>
      </form>
    </Modal>
  );
}
