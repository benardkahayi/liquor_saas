import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { money } from "../lib/money";
import { useLanguage } from "../context/LanguageContext";
import { Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance?: string | number;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const EMPTY_FORM = { name: "", phone: "", email: "", address: "" };

export function SuppliersPage() {
  const { t } = useLanguage();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(null);

  function load() {
    setIsLoading(true);
    api
      .get("/suppliers", { params: { page, pageSize: 20, search: search || undefined } })
      .then((res) => {
        setSuppliers(res.data.items);
        setPagination(res.data.pagination);
        setError(null);
      })
      .catch((err) => setError(extractErrorMessage(err, t("suppliers.error.load", "Failed to load suppliers"))))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [page, search]);

  async function handleDelete(supplier: Supplier) {
    if (!confirm(`${t("common.deleteConfirm", "Delete")} "${supplier.name}"?`)) return;
    try {
      await api.delete(`/suppliers/${supplier.id}`);
      load();
    } catch (err) {
      setError(extractErrorMessage(err, t("suppliers.error.delete", "Failed to delete supplier")));
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("suppliers.title", "Suppliers")}</h1>
        <button onClick={() => setIsCreating(true)} className="btn-primary px-4 py-2 text-sm">
          {t("suppliers.add", "Add Supplier")}
        </button>
      </div>

      <ErrorBanner message={error} />

      <input
        type="text"
        placeholder={t("suppliers.search", "Search suppliers...")}
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        className="input mb-4"
      />

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-2 font-medium">{t("customers.col.name", "Name")}</th>
              <th className="px-4 py-2 font-medium">{t("customers.col.phone", "Phone")}</th>
              <th className="px-4 py-2 font-medium">{t("customers.col.email", "Email")}</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  {t("common.loading", "Loading...")}
                </td>
              </tr>
            )}
            {!isLoading && suppliers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  {t("suppliers.empty", "No suppliers found.")}
                </td>
              </tr>
            )}
            {suppliers.map((supplier) => (
              <tr key={supplier.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 text-gray-900">{supplier.name}</td>
                <td className="px-4 py-2 text-gray-600">{supplier.phone ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{supplier.email ?? "—"}</td>
                <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                  <button onClick={() => setPayingSupplier(supplier)} className="text-green-600 hover:underline">
                    {t("suppliers.recordPayment", "Record Payment")}
                  </button>
                  <button onClick={() => setEditing(supplier)} className="text-blue-600 hover:underline">
                    {t("common.edit", "Edit")}
                  </button>
                  <button onClick={() => handleDelete(supplier)} className="text-red-600 hover:underline">
                    {t("common.delete", "Delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}

      {(isCreating || editing) && (
        <SupplierFormModal
          supplier={editing}
          onClose={() => {
            setIsCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setIsCreating(false);
            setEditing(null);
            load();
          }}
        />
      )}

      {payingSupplier && (
        <RecordPaymentModal
          supplier={payingSupplier}
          onClose={() => setPayingSupplier(null)}
          onSaved={() => {
            setPayingSupplier(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function SupplierFormModal({
  supplier,
  onClose,
  onSaved,
}: {
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState(
    supplier
      ? {
          name: supplier.name,
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
        }
      : EMPTY_FORM
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload = {
      name: form.name,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
    };

    try {
      if (supplier) {
        await api.put(`/suppliers/${supplier.id}`, payload);
      } else {
        await api.post("/suppliers", payload);
      }
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err, t("suppliers.error.save", "Failed to save supplier")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title={supplier ? t("suppliers.editTitle", "Edit Supplier") : t("suppliers.addTitle", "Add Supplier")}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("customers.col.name", "Name")}</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("customers.col.phone", "Phone")}</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("customers.col.email", "Email")}</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("customers.field.address", "Address")}</label>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            {t("common.cancel", "Cancel")}
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary px-4 py-2 text-sm">
            {isSubmitting ? t("common.saving", "Saving...") : t("common.save", "Save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RecordPaymentModal({
  supplier,
  onClose,
  onSaved,
}: {
  supplier: Supplier;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.post(`/suppliers/${supplier.id}/payments`, { amount: Number(amount) });
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err, t("suppliers.error.payment", "Failed to record payment")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={`${t("suppliers.recordPayment", "Record Payment")} — ${supplier.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("suppliers.amount", "Amount")}</label>
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input"
          />
          {supplier.balance !== undefined && (
            <p className="text-xs text-gray-400 mt-1">
              {t("suppliers.currentBalance", "Current balance")}: {money(supplier.balance)}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            {t("common.cancel", "Cancel")}
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary px-4 py-2 text-sm">
            {isSubmitting ? t("common.saving", "Saving...") : t("suppliers.recordPayment", "Record Payment")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
