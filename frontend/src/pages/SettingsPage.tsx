import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { useTenant } from "../context/TenantContext";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";

interface TenantSettings {
  businessName: string;
  logoUrl: string;
  phone: string;
  address: string;
  currency: string;
  primaryColor: string;
  receiptFooter: string;
}

const EMPTY: TenantSettings = {
  businessName: "",
  logoUrl: "",
  phone: "",
  address: "",
  currency: "",
  primaryColor: "",
  receiptFooter: "",
};

export function SettingsPage() {
  const { tenant, isLoading: isTenantLoading, error: tenantError, refetch } = useTenant();
  const [form, setForm] = useState<TenantSettings>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setForm({
      businessName: tenant.name ?? "",
      logoUrl: tenant.settings?.logoUrl ?? "",
      phone: tenant.settings?.phone ?? "",
      address: tenant.settings?.address ?? "",
      currency: tenant.settings?.currency ?? "",
      primaryColor: tenant.settings?.primaryColor ?? "",
      receiptFooter: tenant.settings?.receiptFooter ?? "",
    });
  }, [tenant]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await api.put("/tenants/settings", {
        businessName: form.businessName || undefined,
        logoUrl: form.logoUrl || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        currency: form.currency || undefined,
        primaryColor: form.primaryColor || undefined,
        receiptFooter: form.receiptFooter || undefined,
      });
      refetch();
      setSuccessMessage("Settings saved.");
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to save settings"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!tenant) {
    return (
      <div>
        {isTenantLoading && <p className="text-gray-400">Loading...</p>}
        <ErrorBanner message={tenantError} />
      </div>
    );
  }

  const subscription = tenant.subscription;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <ErrorBanner message={error} />
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-2 mb-4">
          {successMessage}
        </div>
      )}

      {subscription && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Subscription</h2>
            <span className="badge bg-blue-100 text-blue-700">{subscription.plan}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Status</p>
              <p className="text-gray-900">{subscription.status}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Seats</p>
              <p className="text-gray-900">{subscription.seatLimit}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Product Limit</p>
              <p className="text-gray-900">{subscription.productLimit}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Renews</p>
              <p className="text-gray-900">
                {subscription.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 card p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
          <input
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
          <input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} className="input" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency (3-letter code)</label>
            <input
              maxLength={3}
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              placeholder="TZS"
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
          <input
            type="color"
            value={form.primaryColor || "#2563eb"}
            onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
            className="h-10 w-20 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Footer</label>
          <textarea
            value={form.receiptFooter}
            onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
            className="input"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary px-4 py-2 text-sm"
        >
          {isSubmitting ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
