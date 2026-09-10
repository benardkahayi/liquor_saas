import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { money } from "../lib/money";
import { Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";

interface Expense {
  id: string;
  category: string;
  amount: string | number;
  description: string | null;
  date: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const EMPTY_FORM = { category: "", amount: "", description: "", date: "" };

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  function load() {
    setIsLoading(true);
    api
      .get("/expenses", { params: { page, pageSize: 20, category: category || undefined } })
      .then((res) => {
        setExpenses(res.data.items);
        setPagination(res.data.pagination);
        setError(null);
      })
      .catch((err) => setError(extractErrorMessage(err, "Failed to load expenses")))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [page, category]);

  async function handleDelete(expense: Expense) {
    if (!confirm(`Delete this ${expense.category} expense?`)) return;
    try {
      await api.delete(`/expenses/${expense.id}`);
      load();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to delete expense"));
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="btn-primary px-4 py-2 text-sm"
        >
          Add Expense
        </button>
      </div>

      <ErrorBanner message={error} />

      <input
        type="text"
        placeholder="Filter by category..."
        value={category}
        onChange={(e) => {
          setPage(1);
          setCategory(e.target.value);
        }}
        className="input mb-4"
      />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No expenses found.
                </td>
              </tr>
            )}
            {expenses.map((expense) => (
              <tr key={expense.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 text-gray-600">{new Date(expense.date).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-gray-900">{expense.category}</td>
                <td className="px-4 py-2 text-gray-600">{expense.description ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{money(expense.amount)}</td>
                <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                  <button onClick={() => setEditing(expense)} className="text-blue-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(expense)} className="text-red-600 hover:underline">
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
        <ExpenseFormModal
          expense={editing}
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

function ExpenseFormModal({
  expense,
  onClose,
  onSaved,
}: {
  expense: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(
    expense
      ? {
          category: expense.category,
          amount: String(expense.amount),
          description: expense.description ?? "",
          date: expense.date ? expense.date.slice(0, 10) : "",
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
      category: form.category,
      amount: Number(form.amount),
      description: form.description || undefined,
      date: form.date || undefined,
    };

    try {
      if (expense) {
        await api.put(`/expenses/${expense.id}`, payload);
      } else {
        await api.post("/expenses", payload);
      }
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to save expense"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={expense ? "Edit Expense" : "Add Expense"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <input
            required
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="e.g. Rent, Utilities, Transport"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
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
