import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { money, toNum } from "../lib/money";
import { Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  brand: string | null;
  sku: string | null;
  barcode: string | null;
  purchasePrice: string | number;
  sellingPrice: string | number;
  stockQuantity: number;
  minStockLevel: number;
  imageUrl: string | null;
  supplierId: string | null;
  supplier: Supplier | null;
  status: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ProductFormState {
  name: string;
  brand: string;
  sku: string;
  barcode: string;
  purchasePrice: string;
  sellingPrice: string;
  stockQuantity: string;
  minStockLevel: string;
  imageUrl: string;
  supplierId: string;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  brand: "",
  sku: "",
  barcode: "",
  purchasePrice: "",
  sellingPrice: "",
  stockQuantity: "0",
  minStockLevel: "5",
  imageUrl: "",
  supplierId: "",
};

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  function loadProducts() {
    setIsLoading(true);
    api
      .get("/products", { params: { page, pageSize: 20, search: search || undefined, lowStockOnly: lowStockOnly || undefined } })
      .then((res) => {
        setProducts(res.data.items.filter((p: Product) => p.status !== "DISCONTINUED"));
        setPagination(res.data.pagination);
        setError(null);
      })
      .catch((err) => setError(extractErrorMessage(err, "Failed to load products")))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadProducts, [page, search, lowStockOnly]);

  async function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"?`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      loadProducts();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to delete product"));
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="btn-primary px-4 py-2 text-sm"
        >
          Add Product
        </button>
      </div>

      <ErrorBanner message={error} />

      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setPage(1);
              setLowStockOnly(e.target.checked);
            }}
          />
          Low stock only
        </label>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">SKU</th>
              <th className="px-4 py-2 font-medium">Purchase</th>
              <th className="px-4 py-2 font-medium">Selling</th>
              <th className="px-4 py-2 font-medium">Stock</th>
              <th className="px-4 py-2 font-medium">Supplier</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No products found.
                </td>
              </tr>
            )}
            {products.map((product) => {
              const isLow = product.stockQuantity <= product.minStockLevel;
              return (
                <tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 text-gray-900">
                    {product.name}
                    {product.brand && <span className="text-gray-400"> · {product.brand}</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{product.sku ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-600">{money(product.purchasePrice)}</td>
                  <td className="px-4 py-2 text-gray-600">{money(product.sellingPrice)}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {isLow ? (
                      <span className="badge bg-red-100 text-red-700">
                        {product.stockQuantity} / min {product.minStockLevel}
                      </span>
                    ) : (
                      <span>
                        {product.stockQuantity} / min {product.minStockLevel}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{product.supplier?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}

      {(isCreating || editingProduct) && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => {
            setIsCreating(false);
            setEditingProduct(null);
          }}
          onSaved={() => {
            setIsCreating(false);
            setEditingProduct(null);
            loadProducts();
          }}
        />
      )}
    </div>
  );
}

function ProductFormModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProductFormState>(
    product
      ? {
          name: product.name,
          brand: product.brand ?? "",
          sku: product.sku ?? "",
          barcode: product.barcode ?? "",
          purchasePrice: String(toNum(product.purchasePrice)),
          sellingPrice: String(toNum(product.sellingPrice)),
          stockQuantity: String(product.stockQuantity),
          minStockLevel: String(product.minStockLevel),
          imageUrl: product.imageUrl ?? "",
          supplierId: product.supplierId ?? "",
        }
      : EMPTY_FORM
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api
      .get("/suppliers", { params: { page: 1, pageSize: 100 } })
      .then((res) => setSuppliers(res.data.items))
      .catch(() => setSuppliers([]));
  }, []);

  function update<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload = {
      name: form.name,
      brand: form.brand || undefined,
      sku: form.sku || undefined,
      barcode: form.barcode || undefined,
      purchasePrice: Number(form.purchasePrice),
      sellingPrice: Number(form.sellingPrice),
      stockQuantity: Number(form.stockQuantity),
      minStockLevel: Number(form.minStockLevel),
      imageUrl: form.imageUrl || undefined,
      supplierId: form.supplierId || undefined,
    };

    try {
      if (product) {
        await api.put(`/products/${product.id}`, payload);
      } else {
        await api.post("/products", payload);
      }
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to save product"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={product ? "Edit Product" : "Add Product"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        <Field label="Name" required>
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Brand">
            <input value={form.brand} onChange={(e) => update("brand", e.target.value)} className="input" />
          </Field>
          <Field label="SKU">
            <input value={form.sku} onChange={(e) => update("sku", e.target.value)} className="input" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Purchase Price" required>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={form.purchasePrice}
              onChange={(e) => update("purchasePrice", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Selling Price" required>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={form.sellingPrice}
              onChange={(e) => update("sellingPrice", e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Stock Quantity">
            <input
              type="number"
              min="0"
              value={form.stockQuantity}
              onChange={(e) => update("stockQuantity", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Min Stock Level">
            <input
              type="number"
              min="0"
              value={form.minStockLevel}
              onChange={(e) => update("minStockLevel", e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <Field label="Supplier">
          <select
            value={form.supplierId}
            onChange={(e) => update("supplierId", e.target.value)}
            className="input"
          >
            <option value="">None</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Image URL">
          <input value={form.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} className="input" />
        </Field>

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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
