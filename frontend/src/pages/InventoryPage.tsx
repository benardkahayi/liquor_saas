import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  stockQuantity: number;
  minStockLevel: number;
}

interface InventoryTransaction {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  function loadLowStock() {
    setIsLoading(true);
    api
      .get("/products", { params: { page: 1, pageSize: 100, lowStockOnly: true } })
      .then((res) => {
        setProducts(res.data.items);
        setError(null);
      })
      .catch((err) => setError(extractErrorMessage(err, "Failed to load inventory")))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadLowStock, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <button
          onClick={() => setIsAdjusting(true)}
          className="btn-primary px-4 py-2 text-sm"
        >
          New Adjustment
        </button>
      </div>

      <ErrorBanner message={error} />

      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Low Stock</h2>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium">SKU</th>
              <th className="px-4 py-2 font-medium">Stock</th>
              <th className="px-4 py-2 font-medium">Min Level</th>
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
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No low-stock products. Everything looks good.
                </td>
              </tr>
            )}
            {products.map((product) => (
              <tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 text-gray-900">{product.name}</td>
                <td className="px-4 py-2 text-gray-600">{product.sku ?? "—"}</td>
                <td className="px-4 py-2">
                  <span className="badge bg-red-100 text-red-700">{product.stockQuantity}</span>
                </td>
                <td className="px-4 py-2 text-gray-600">{product.minStockLevel}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => setHistoryProduct(product)}
                    className="text-blue-600 hover:underline"
                  >
                    View History
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdjusting && (
        <AdjustmentModal
          onClose={() => setIsAdjusting(false)}
          onSaved={() => {
            setIsAdjusting(false);
            loadLowStock();
          }}
        />
      )}

      {historyProduct && (
        <HistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} />
      )}
    </div>
  );
}

function AdjustmentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api
      .get("/products", { params: { page: 1, pageSize: 200 } })
      .then((res) => setProducts(res.data.items))
      .catch(() => setProducts([]));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.post("/inventory/adjustments", {
        productId,
        quantity: Number(quantity),
        reason,
      });
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to record adjustment"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="New Inventory Adjustment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
          <select required value={productId} onChange={(e) => setProductId(e.target.value)} className="input">
            <option value="">Select a product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (current: {p.stockQuantity})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity <span className="text-gray-400">(use a negative number to remove stock)</span>
          </label>
          <input
            required
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
          <input
            required
            minLength={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Damaged stock, stock count correction"
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
            {isSubmitting ? "Saving..." : "Save Adjustment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function HistoryModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [items, setItems] = useState<InventoryTransaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get(`/inventory/products/${product.id}/history`, { params: { page, pageSize: 10 } })
      .then((res) => {
        setItems(res.data.items);
        setPagination(res.data.pagination);
        setError(null);
      })
      .catch((err) => setError(extractErrorMessage(err, "Failed to load history")));
  }, [page, product.id]);

  return (
    <Modal title={`History — ${product.name}`} onClose={onClose}>
      <ErrorBanner message={error} />
      <div className="space-y-2">
        {items.length === 0 && <p className="text-gray-400 text-sm">No transactions yet.</p>}
        {items.map((tx) => (
          <div key={tx.id} className="flex justify-between text-sm border-b border-gray-100 pb-2">
            <div>
              <p className="text-gray-900">{tx.reason ?? tx.type}</p>
              <p className="text-gray-400 text-xs">{new Date(tx.createdAt).toLocaleString()}</p>
            </div>
            <span className={tx.quantity < 0 ? "text-red-600" : "text-green-600"}>
              {tx.quantity > 0 ? "+" : ""}
              {tx.quantity}
            </span>
          </div>
        ))}
      </div>
      {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
    </Modal>
  );
}
