import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";

interface Customer {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const EMPTY_FORM = { fullName: "", email: "", phone: "", address: "" };

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  function load() {
    setIsLoading(true);
    api
      .get("/customers", { params: { page, pageSize: 20, search: search || undefined } })
      .then((res) => {
        setCustomers(res.data.items);
        setPagination(res.data.pagination);
        setError(null);
      })
      .catch((err) => setError(extractErrorMessage(err, "Failed to load customers")))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [page, search]);

  async function handleDelete(customer: Customer) {
    if (!confirm(`Delete "${customer.fullName}"?`)) return;
    try {
      await api.delete(`/customers/${customer.id}`);
      load();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to delete customer"));
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="btn-primary px-4 py-2 text-sm"
        >
          Add Customer
        </button>
      </div>

      <ErrorBanner message={error} />

      <input
        type="text"
        placeholder="Search customers..."
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        className="input mb-4"
      />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && customers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No customers found.
                </td>
              </tr>
            )}
            {customers.map((customer) => (
              <tr key={customer.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 text-gray-900">{customer.fullName}</td>
                <td className="px-4 py-2 text-gray-600">{customer.email ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{customer.phone ?? "—"}</td>
                <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                  <button onClick={() => setEditing(customer)} className="text-blue-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(customer)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}

      {(isCreating || editing) && (
        <CustomerFormModal
          customer={editing}
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
    </div>
  );
}

function CustomerFormModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(
    customer
      ? {
          fullName: customer.fullName,
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          address: customer.address ?? "",
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
      fullName: form.fullName,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
    };

    try {
      if (customer) {
        await api.put(`/customers/${customer.id}`, payload);
      } else {
        await api.post("/customers", payload);
      }
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to save customer"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={customer ? "Edit Customer" : "Add Customer"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+255700000000"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="input"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary px-4 py-2 text-sm"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
