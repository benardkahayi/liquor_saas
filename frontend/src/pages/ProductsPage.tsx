import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { money, toNum } from "../lib/money";
import { useLanguage } from "../context/LanguageContext";
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
  const { t } = useLanguage();
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
      .catch((err) => setError(extractErrorMessage(err, t("products.error.load", "Failed to load products"))))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadProducts, [page, search, lowStockOnly]);

  async function handleDelete(product: Product) {
    if (!confirm(`${t("common.deleteConfirm", "Delete")} "${product.name}"?`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      loadProducts();
    } catch (err) {
      setError(extractErrorMessage(err, t("products.error.delete", "Failed to delete product")));
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("products.title", "Products")}</h1>
        <button onClick={() => setIsCreating(true)} className="btn-primary px-4 py-2 text-sm">
          {t("products.add", "Add Product")}
        </button>
      </div>

      <ErrorBanner message={error} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder={t("products.search", "Search products...")}
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="min-w-0 flex-1 basis-56 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          {t("products.lowStockOnly", "Low stock only")}
        </label>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-2 font-medium">{t("products.col.name", "Name")}</th>
              <th className="px-4 py-2 font-medium">{t("products.col.sku", "SKU")}</th>
              <th className="px-4 py-2 font-medium">{t("products.col.purchase", "Purchase")}</th>
              <th className="px-4 py-2 font-medium">{t("products.col.selling", "Selling")}</th>
              <th className="px-4 py-2 font-medium">{t("products.col.stock", "Stock")}</th>
              <th className="px-4 py-2 font-medium">{t("products.col.supplier", "Supplier")}</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  {t("common.loading", "Loading...")}
                </td>
              </tr>
            )}
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  {t("products.empty", "No products found.")}
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
                        {product.stockQuantity} / {t("products.min", "min")} {product.minStockLevel}
                      </span>
                    ) : (
                      <span>
                        {product.stockQuantity} / {t("products.min", "min")} {product.minStockLevel}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{product.supplier?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => setEditingProduct(product)} className="text-blue-600 hover:underline">
                      {t("common.edit", "Edit")}
                    </button>
                    <button onClick={() => handleDelete(product)} className="text-red-600 hover:underline">
                      {t("common.delete", "Delete")}
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
  const { t } = useLanguage();
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
      // Stock is only set when creating. After that it changes through sales
      // and Inventory adjustments, so every change is recorded in history.
      ...(product ? {} : { stockQuantity: Number(form.stockQuantity) }),
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
      setError(extractErrorMessage(err, t("products.error.save", "Failed to save product")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={product ? t("products.editTitle", "Edit Product") : t("products.addTitle", "Add Product")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        <Field label={t("products.field.name", "Name")} required>
          <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="input" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("products.field.brand", "Brand")}>
            <input value={form.brand} onChange={(e) => update("brand", e.target.value)} className="input" />
          </Field>
          <Field label={t("products.field.sku", "SKU")}>
            <input value={form.sku} onChange={(e) => update("sku", e.target.value)} className="input" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("products.field.purchasePrice", "Purchase Price")} required>
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
          <Field label={t("products.field.sellingPrice", "Selling Price")} required>
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
          <Field label={t("products.field.stockQuantity", "Stock Quantity")}>
            <input
              type="number"
              min="0"
              value={form.stockQuantity}
              onChange={(e) => update("stockQuantity", e.target.value)}
              className="input disabled:bg-gray-100 disabled:text-gray-500"
              disabled={!!product}
            />
            {product && (
              <p className="text-xs text-gray-500 mt-1">
                {t("products.stockViaInventory", "Use Inventory to adjust stock")}
              </p>
            )}
          </Field>
          <Field label={t("products.field.minStockLevel", "Min Stock Level")}>
            <input
              type="number"
              min="0"
              value={form.minStockLevel}
              onChange={(e) => update("minStockLevel", e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <Field label={t("products.field.supplier", "Supplier")}>
          <select value={form.supplierId} onChange={(e) => update("supplierId", e.target.value)} className="input">
            <option value="">{t("common.none", "None")}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("products.field.imageUrl", "Image URL")}>
          <input value={form.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} className="input" />
        </Field>

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
