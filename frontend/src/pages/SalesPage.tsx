import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { money, toNum } from "../lib/money";
import { Modal } from "../components/Modal";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  sellingPrice: string | number;
  stockQuantity: number;
}

interface Customer {
  id: string;
  fullName: string;
}

interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
}

type PaymentMethod = "CASH" | "CARD" | "MOBILE_MONEY" | "OTHER";

interface CompletedSale {
  id: string;
  subtotal: string | number;
  discount: string | number;
  total: string | number;
  items: { productId: string; quantity: number; unitPrice: string | number }[];
}

export function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);

  useEffect(() => {
    api
      .get("/products", { params: { page: 1, pageSize: 50, search: search || undefined } })
      .then((res) => setProducts(res.data.items))
      .catch(() => setProducts([]));
  }, [search]);

  useEffect(() => {
    api
      .get("/customers", { params: { page: 1, pageSize: 100 } })
      .then((res) => setCustomers(res.data.items))
      .catch(() => setCustomers([]));
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [cart]
  );
  const total = Math.max(0, subtotal - toNum(discount));

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        if (existing.quantity >= existing.maxStock) return prev;
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: toNum(product.sellingPrice),
          quantity: 1,
          maxStock: product.stockQuantity,
        },
      ];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, quantity } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  function resetSale() {
    setCart([]);
    setCustomerId("");
    setDiscount("0");
    setPaymentMethod("CASH");
    setError(null);
  }

  async function handleCheckout() {
    if (cart.length === 0) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await api.post("/sales", {
        customerId: customerId || undefined,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        discount: toNum(discount),
        payments: [{ method: paymentMethod, amount: total }],
      });
      setCompletedSale(res.data.data);
      resetSale();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to complete sale"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Sale</h1>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <input
            type="text"
            placeholder="Search products to add..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input mb-4"
          />
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stockQuantity === 0}
                className="text-left bg-white border border-gray-200 rounded-md p-3 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-medium text-gray-900">{product.name}</p>
                <p className="text-xs text-gray-500">
                  {money(product.sellingPrice)} · stock {product.stockQuantity}
                </p>
              </button>
            ))}
            {products.length === 0 && (
              <p className="text-gray-400 text-sm col-span-2">No products match your search.</p>
            )}
          </div>
        </div>

        <div className="card p-4 h-fit">
          <h2 className="font-semibold text-gray-900 mb-3">Cart</h2>

          {cart.length === 0 && <p className="text-sm text-gray-400">Cart is empty.</p>}

          <div className="space-y-3 mb-4">
            {cart.map((line) => (
              <div key={line.productId} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 truncate">{line.name}</p>
                  <p className="text-gray-400">{money(line.unitPrice)} each</p>
                </div>
                <input
                  type="number"
                  min={1}
                  max={line.maxStock}
                  value={line.quantity}
                  onChange={(e) => updateQuantity(line.productId, Number(e.target.value))}
                  className="w-14 border border-gray-300 rounded-md px-2 py-1 text-center mx-2"
                />
                <button onClick={() => removeLine(line.productId)} className="text-red-500 hover:underline">
                  &times;
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Customer (optional)</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input">
                <option value="">Walk-in customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Discount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="input"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isSubmitting}
              className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : "Complete Sale"}
            </button>
          </div>
        </div>
      </div>

      {completedSale && (
        <Modal title="Sale Complete" onClose={() => setCompletedSale(null)}>
          <div className="space-y-2 text-sm">
            <p className="text-gray-500">Receipt #{completedSale.id.slice(0, 8)}</p>
            {completedSale.items.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span>
                  {item.quantity} × {money(item.unitPrice)}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{money(completedSale.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span>{money(completedSale.discount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span>{money(completedSale.total)}</span>
            </div>
          </div>
          <button
            onClick={() => setCompletedSale(null)}
            className="w-full mt-4 bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700"
          >
            New Sale
          </button>
        </Modal>
      )}
    </div>
  );
}
