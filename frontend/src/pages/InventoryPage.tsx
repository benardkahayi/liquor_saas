import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { PackagePlus, Upload, SlidersHorizontal, Search, FileDown } from "lucide-react";
import { api } from "../api/client";
import { useLanguage } from "../context/LanguageContext";
import { Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";
import { money, toNum } from "../lib/money";
import { parseCsv, rowsToStockRows, downloadCsv, STOCK_CSV_HEADER } from "../lib/csv";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  stockQuantity: number;
  minStockLevel: number;
  purchasePrice: string | number;
  sellingPrice: string | number;
}

interface InventoryTransaction {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  createdAt: string;
  product?: { id: string; name: string; sku: string | null; purchasePrice: string | number };
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

type Tab = "stock" | "received";

export function InventoryPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("stock");
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [valuation, setValuation] = useState<{ costValue: number; retailValue: number } | null>(null);
  const [lowCount, setLowCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [receiveFor, setReceiveFor] = useState<Product | "pick" | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(true);
      api
        .get("/products", {
          params: { page, pageSize: 25, search: search.trim() || undefined, lowStockOnly: lowOnly || undefined },
        })
        .then((res) => {
          setProducts(res.data.items);
          setPagination(res.data.pagination);
          setError(null);
        })
        .catch((err) => setError(extractErrorMessage(err, t("inventory.error.load", "Failed to load stock"))))
        .finally(() => setIsLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [page, search, lowOnly, reloadKey, t]);

  useEffect(() => {
    api
      .get("/reports/inventory-valuation")
      .then((res) => setValuation(res.data.data))
      .catch(() => setValuation(null));
    api
      .get("/reports/low-stock")
      .then((res) => setLowCount((res.data.data ?? []).length))
      .catch(() => setLowCount(null));
  }, [reloadKey]);

  function afterSave(message: string) {
    setNotice(message);
    reload();
    setTimeout(() => setNotice(null), 5000);
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("inventory.title", "Stock")}</h1>
          <p className="text-sm text-gray-500">{t("inventory.subtitle", "Receive deliveries, import from CSV and keep counts right.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setReceiveFor("pick")} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
            <PackagePlus size={16} /> {t("inventory.receive", "Receive stock")}
          </button>
          <button
            onClick={() => setIsImporting(true)}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <Upload size={16} /> {t("inventory.importCsv", "Import CSV")}
          </button>
          <button
            onClick={() => setIsAdjusting(true)}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <SlidersHorizontal size={16} /> {t("inventory.adjust", "Adjust")}
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />
      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label={t("inventory.stat.products", "Products")} value={pagination && !search && !lowOnly ? String(pagination.total) : "—"} />
        <Stat label={t("inventory.stat.cost", "Stock value (cost)")} value={valuation ? money(valuation.costValue) : "—"} />
        <Stat label={t("inventory.stat.retail", "Stock value (selling)")} value={valuation ? money(valuation.retailValue) : "—"} />
        <Stat
          label={t("inventory.stat.low", "Running low")}
          value={lowCount === null ? "—" : String(lowCount)}
          tone={lowCount ? "warn" : undefined}
          onClick={() => {
            setTab("stock");
            setLowOnly(true);
            setPage(1);
          }}
        />
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {(
          [
            ["stock", t("inventory.tab.stock", "Stock list")],
            ["received", t("inventory.tab.received", "Received stock")],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 ${
              tab === key ? "border-amber-500 text-gray-900 font-semibold" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "stock" ? (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t("inventory.search", "Search products")}
                className="input pl-9"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={lowOnly}
                onChange={(e) => {
                  setLowOnly(e.target.checked);
                  setPage(1);
                }}
              />
              {t("inventory.lowOnly", "Only running low")}
            </label>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left text-xs">
                <tr>
                  <th className="px-4 py-2 font-medium">{t("inventory.col.product", "Product")}</th>
                  <th className="px-4 py-2 font-medium text-right">{t("products.col.stock", "Stock")}</th>
                  <th className="px-4 py-2 font-medium text-right">{t("inventory.col.minLevel", "Min level")}</th>
                  <th className="px-4 py-2 font-medium text-right">{t("inventory.col.cost", "Buying price")}</th>
                  <th className="px-4 py-2 font-medium text-right">{t("inventory.col.value", "Value")}</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                      {t("common.loading", "Loading...")}
                    </td>
                  </tr>
                )}
                {!isLoading && products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                      {lowOnly
                        ? t("inventory.empty", "No low-stock products. Everything looks good.")
                        : t("inventory.noProducts", "No products found. Add products or import a CSV file.")}
                    </td>
                  </tr>
                )}
                {products.map((p) => {
                  const low = p.stockQuantity <= p.minStockLevel;
                  return (
                    <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <p className="text-gray-900">{p.name}</p>
                        {p.sku && <p className="text-xs text-gray-400">{p.sku}</p>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={`badge ${low ? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {p.stockQuantity}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">{p.minStockLevel}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{money(p.purchasePrice)}</td>
                      <td className="px-4 py-2 text-right text-gray-900">
                        {money(toNum(p.purchasePrice) * Math.max(p.stockQuantity, 0))}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button onClick={() => setReceiveFor(p)} className="text-amber-700 hover:underline mr-3">
                          {t("inventory.receiveShort", "Receive")}
                        </button>
                        <button onClick={() => setHistoryProduct(p)} className="text-blue-600 hover:underline">
                          {t("inventory.viewHistory", "History")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
        </>
      ) : (
        <ReceivedList reloadKey={reloadKey} />
      )}

      {receiveFor && (
        <ReceiveModal
          initial={receiveFor === "pick" ? null : receiveFor}
          onClose={() => setReceiveFor(null)}
          onSaved={(msg) => {
            setReceiveFor(null);
            afterSave(msg);
          }}
        />
      )}

      {isImporting && (
        <ImportModal
          onClose={() => setIsImporting(false)}
          onSaved={(msg) => {
            setIsImporting(false);
            afterSave(msg);
          }}
        />
      )}

      {isAdjusting && (
        <AdjustmentModal
          onClose={() => setIsAdjusting(false)}
          onSaved={() => {
            setIsAdjusting(false);
            afterSave(t("inventory.adjustSaved", "Adjustment saved."));
          }}
        />
      )}

      {historyProduct && <HistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} />}
    </div>
  );
}

function Stat({ label, value, tone, onClick }: { label: string; value: string; tone?: "warn"; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`card p-4 text-left ${onClick ? "hover:bg-gray-50" : ""} ${tone === "warn" ? "border-l-4 border-l-red-400" : ""}`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold mt-1 ${tone === "warn" ? "text-red-600" : "text-gray-900"}`}>{value}</p>
    </Tag>
  );
}

function ReceivedList({ reloadKey }: { reloadKey: number }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<InventoryTransaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/inventory/stock-in", { params: { page, pageSize: 20 } })
      .then((res) => {
        setItems(res.data.items);
        setPagination(res.data.pagination);
        setError(null);
      })
      .catch((err) => setError(extractErrorMessage(err, t("inventory.error.received", "Failed to load received stock"))))
      .finally(() => setLoading(false));
  }, [page, reloadKey, t]);

  return (
    <>
      <ErrorBanner message={error} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left text-xs">
            <tr>
              <th className="px-4 py-2 font-medium">{t("inventory.col.date", "Date")}</th>
              <th className="px-4 py-2 font-medium">{t("inventory.col.product", "Product")}</th>
              <th className="px-4 py-2 font-medium text-right">{t("inventory.quantity", "Quantity")}</th>
              <th className="px-4 py-2 font-medium">{t("inventory.note", "Note")}</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  {t("inventory.noReceived", "No stock received yet. Use “Receive stock” or import a CSV file.")}
                </td>
              </tr>
            )}
            {items.map((tx) => (
              <tr key={tx.id} className="border-t border-gray-100">
                <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{new Date(tx.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2 text-gray-900">{tx.product?.name ?? "—"}</td>
                <td className="px-4 py-2 text-right text-emerald-700 font-medium">+{tx.quantity}</td>
                <td className="px-4 py-2 text-gray-600">{tx.reason ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
    </>
  );
}

// Type-to-search product picker (the products list is paginated, so a plain
// <select> would miss products beyond the first page).
function ProductPicker({ value, onChange }: { value: Product | null; onChange: (p: Product | null) => void }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      api
        .get("/products", { params: { page: 1, pageSize: 20, search: query.trim() || undefined } })
        .then((res) => setResults(res.data.items))
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={t("inventory.selectProduct", "Search and choose a product")}
        className="input"
        required
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(p);
                  setQuery(p.name);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between gap-3"
              >
                <span className="text-gray-900">{p.name}</span>
                <span className="text-gray-400 whitespace-nowrap">
                  {t("inventory.current", "in stock")}: {p.stockQuantity}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReceiveModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Product | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useLanguage();
  const [product, setProduct] = useState<Product | null>(initial);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState(initial ? String(toNum(initial.purchasePrice)) : "");
  const [sellingPrice, setSellingPrice] = useState(initial ? String(toNum(initial.sellingPrice)) : "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function pick(p: Product | null) {
    setProduct(p);
    if (p) {
      setUnitCost(String(toNum(p.purchasePrice)));
      setSellingPrice(String(toNum(p.sellingPrice)));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!product) {
      setError(t("inventory.pickProduct", "Choose a product from the list."));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const qty = Number(quantity);
      const res = await api.post("/inventory/stock-in", {
        productId: product.id,
        quantity: qty,
        unitCost: unitCost === "" ? undefined : Number(unitCost),
        sellingPrice: sellingPrice === "" ? undefined : Number(sellingPrice),
        note: note.trim() || undefined,
      });
      onSaved(
        t("inventory.receivedMsg", "Received {qty} × {name}. Stock is now {stock}.")
          .replace("{qty}", String(qty))
          .replace("{name}", product.name)
          .replace("{stock}", String(res.data.data.newStockQuantity))
      );
    } catch (err) {
      setError(extractErrorMessage(err, t("inventory.error.receive", "Failed to receive stock")));
    } finally {
      setSaving(false);
    }
  }

  const total = Number(quantity || 0) * Number(unitCost || 0);

  return (
    <Modal title={t("inventory.receive", "Receive stock")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("inventory.col.product", "Product")}</label>
          <ProductPicker value={product} onChange={pick} />
          {product && (
            <p className="text-xs text-gray-500 mt-1">
              {t("inventory.current", "in stock")}: {product.stockQuantity}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("inventory.qtyReceived", "Quantity received")}</label>
            <input required type="number" min={1} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("inventory.unitCost", "Buying price (each)")}</label>
            <input type="number" min={0} step="any" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("inventory.sellPrice", "Selling price")}</label>
            <input type="number" min={0} step="any" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="input" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("inventory.note", "Note")}</label>
          <input
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("inventory.notePlaceholder", "e.g. Delivery from supplier, invoice 123")}
            className="input"
          />
        </div>
        {total > 0 && (
          <p className="text-sm text-gray-600">
            {t("inventory.deliveryCost", "Delivery cost")}: <span className="font-semibold text-gray-900">{money(total)}</span>
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            {t("common.cancel", "Cancel")}
          </button>
          <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm">
            {saving ? t("common.saving", "Saving...") : t("inventory.saveReceive", "Add to stock")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface ImportRow {
  line: number;
  name: string;
  sku: string | null;
  quantity: number;
  action: "add" | "create" | "skip" | "error";
  currentStock?: number;
  newStock?: number;
  message?: string;
}

interface ImportResult {
  applied: boolean;
  summary: { rows: number; add: number; create: number; skip: number; errors: number; units: number };
  rows: ImportRow[];
}

function ImportModal({ onClose, onSaved }: { onClose: () => void; onSaved: (message: string) => void }) {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [createMissing, setCreateMissing] = useState(true);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function runPreview(data: Record<string, string>[], create: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post("/inventory/import", { rows: data, createMissing: create, dryRun: true });
      setPreview(res.data.data);
    } catch (err) {
      setPreview(null);
      setError(extractErrorMessage(err, t("inventory.error.import", "Could not check the file")));
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    setError(null);
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setError(t("inventory.csvOnly", "Choose a .csv file. In Excel use File → Save As → CSV."));
      setRows(null);
      return;
    }
    const text = await file.text();
    const parsed = rowsToStockRows(parseCsv(text));
    if (parsed.map.quantity === undefined || (parsed.map.name === undefined && parsed.map.sku === undefined)) {
      setError(
        t(
          "inventory.csvHeaders",
          "The first row must have column names. Needed: name (or sku) and quantity. Download the template to see the format."
        )
      );
      setRows(null);
      return;
    }
    if (parsed.rows.length === 0) {
      setError(t("inventory.csvEmpty", "The file has no product rows."));
      setRows(null);
      return;
    }
    setRows(parsed.rows);
    runPreview(parsed.rows, createMissing);
  }

  async function apply() {
    if (!rows) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post("/inventory/import", { rows, createMissing, dryRun: false });
      const result: ImportResult = res.data.data;
      if (!result.applied) {
        setPreview(result);
        return;
      }
      onSaved(
        t("inventory.importedMsg", "Import done: {units} units added, {create} new products.")
          .replace("{units}", String(result.summary.units))
          .replace("{create}", String(result.summary.create))
      );
    } catch (err) {
      setError(extractErrorMessage(err, t("inventory.error.importSave", "Import failed. Nothing was saved.")));
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    downloadCsv(
      [
        STOCK_CSV_HEADER,
        ["Konyagi 750ml", "KON-750", 24, 9000, 12000, 6],
        ["Serengeti Lager 500ml", "", 48, 1800, 2500, 24],
      ],
      "stock-template.csv"
    );
  }

  async function downloadMyProducts() {
    setExporting(true);
    try {
      const all: Product[] = [];
      for (let page = 1; page <= 50; page++) {
        const res = await api.get("/products", { params: { page, pageSize: 100 } });
        all.push(...res.data.items);
        if (page >= res.data.pagination.totalPages) break;
      }
      downloadCsv(
        [STOCK_CSV_HEADER, ...all.map((p) => [p.name, p.sku ?? "", "", toNum(p.purchasePrice), toNum(p.sellingPrice), p.minStockLevel])],
        "my-products.csv"
      );
    } catch (err) {
      setError(extractErrorMessage(err, t("inventory.error.export", "Could not download your products")));
    } finally {
      setExporting(false);
    }
  }

  const badge = (r: ImportRow) => {
    const map = {
      add: ["bg-emerald-50 text-emerald-700", t("inventory.act.add", "Add stock")],
      create: ["bg-blue-50 text-blue-700", t("inventory.act.create", "New product")],
      skip: ["bg-gray-100 text-gray-600", t("inventory.act.skip", "Skip")],
      error: ["bg-red-100 text-red-700", t("inventory.act.error", "Fix")],
    } as const;
    const [cls, label] = map[r.action];
    return <span className={`badge ${cls}`}>{label}</span>;
  };

  return (
    <Modal title={t("inventory.importCsv", "Import stock from CSV")} onClose={onClose} wide>
      <div className="space-y-4">
        <ErrorBanner message={error} />

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 space-y-2">
          <p>
            {t(
              "inventory.csvHelp",
              "Columns: name, sku, quantity, purchase_price, selling_price, min_stock. Products are matched by SKU, then by name. Quantity is added to current stock."
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1 text-amber-700 hover:underline">
              <FileDown size={14} /> {t("inventory.template", "Download template")}
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={downloadMyProducts}
              disabled={exporting}
              className="inline-flex items-center gap-1 text-amber-700 hover:underline disabled:opacity-50"
            >
              <FileDown size={14} /> {exporting ? t("common.loading", "Loading...") : t("inventory.myProducts", "Download my products to fill in")}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv,text/csv,.txt" onChange={handleFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <Upload size={16} /> {fileName ? t("inventory.chooseOther", "Choose another file") : t("inventory.chooseFile", "Choose CSV file")}
          </button>
          {fileName && <span className="text-sm text-gray-600 truncate max-w-[220px]">{fileName}</span>}
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 ml-auto">
            <input
              type="checkbox"
              checked={createMissing}
              onChange={(e) => {
                setCreateMissing(e.target.checked);
                if (rows) runPreview(rows, e.target.checked);
              }}
            />
            {t("inventory.createMissing", "Create products that don't exist yet")}
          </label>
        </div>

        {busy && !preview && <p className="text-sm text-gray-500">{t("inventory.checking", "Checking the file...")}</p>}

        {preview && (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="badge bg-emerald-50 text-emerald-700">
                {preview.summary.add} {t("inventory.sum.add", "to add")}
              </span>
              <span className="badge bg-blue-50 text-blue-700">
                {preview.summary.create} {t("inventory.sum.create", "new")}
              </span>
              {preview.summary.skip > 0 && (
                <span className="badge bg-gray-100 text-gray-600">
                  {preview.summary.skip} {t("inventory.sum.skip", "skipped")}
                </span>
              )}
              {preview.summary.errors > 0 && (
                <span className="badge bg-red-100 text-red-700">
                  {preview.summary.errors} {t("inventory.sum.errors", "need fixing")}
                </span>
              )}
              <span className="text-gray-600 ml-auto">
                {t("inventory.sum.units", "Units to add")}: <b>{preview.summary.units}</b>
              </span>
            </div>

            {preview.summary.errors > 0 && (
              <p className="text-sm text-red-700">
                {t("inventory.fixFirst", "Fix the rows marked “Fix” in your file and choose it again. Nothing is saved until every row is OK.")}
              </p>
            )}

            <div className="border border-gray-200 rounded-lg overflow-auto max-h-80">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-gray-50 text-gray-500 text-left text-xs sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("inventory.col.line", "Row")}</th>
                    <th className="px-3 py-2 font-medium">{t("inventory.col.product", "Product")}</th>
                    <th className="px-3 py-2 font-medium text-right">{t("inventory.quantity", "Quantity")}</th>
                    <th className="px-3 py-2 font-medium text-right">{t("inventory.col.after", "Stock after")}</th>
                    <th className="px-3 py-2 font-medium">{t("inventory.col.status", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...preview.rows]
                    .sort((a, b) => Number(b.action === "error") - Number(a.action === "error"))
                    .map((r) => (
                      <tr key={r.line} className={`border-t border-gray-100 ${r.action === "error" ? "bg-red-50/50" : ""}`}>
                        <td className="px-3 py-2 text-gray-400">{r.line}</td>
                        <td className="px-3 py-2 text-gray-900">
                          {r.name || r.sku || "—"}
                          {r.message && <p className="text-xs text-red-600">{r.message}</p>}
                        </td>
                        <td className="px-3 py-2 text-right">{r.action === "error" ? "—" : `+${r.quantity}`}</td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          {r.newStock !== undefined ? `${r.currentStock} → ${r.newStock}` : "—"}
                        </td>
                        <td className="px-3 py-2">{badge(r)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            {t("common.cancel", "Cancel")}
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={busy || !preview || preview.summary.errors > 0 || preview.summary.add + preview.summary.create === 0}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {busy && preview ? t("common.saving", "Saving...") : t("inventory.confirmImport", "Save to stock")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AdjustmentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!product) {
      setError(t("inventory.pickProduct", "Choose a product from the list."));
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      await api.post("/inventory/adjustments", {
        productId: product.id,
        quantity: Number(quantity),
        reason,
      });
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err, t("inventory.error.adjust", "Failed to record adjustment")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={t("inventory.newAdjustment", "Stock adjustment")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("inventory.col.product", "Product")}</label>
          <ProductPicker value={product} onChange={setProduct} />
          {product && (
            <p className="text-xs text-gray-500 mt-1">
              {t("inventory.current", "in stock")}: {product.stockQuantity}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("inventory.quantity", "Quantity")}{" "}
            <span className="text-gray-400">({t("inventory.quantityHint", "use a negative number to remove stock")})</span>
          </label>
          <input required type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("inventory.reason", "Reason")}</label>
          <input
            required
            minLength={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("inventory.reasonPlaceholder", "e.g. Damaged stock, stock count correction")}
            className="input"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            {t("common.cancel", "Cancel")}
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary px-4 py-2 text-sm">
            {isSubmitting ? t("common.saving", "Saving...") : t("inventory.saveAdjustment", "Save Adjustment")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const TX_LABEL: Record<string, [string, string]> = {
  PURCHASE_IN: ["inventory.tx.in", "Received"],
  SALE_OUT: ["inventory.tx.sale", "Sale"],
  ADJUSTMENT: ["inventory.tx.adjust", "Adjustment"],
  RETURN: ["inventory.tx.return", "Return"],
};

function HistoryModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { t } = useLanguage();
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
      .catch((err) => setError(extractErrorMessage(err, t("inventory.error.history", "Failed to load history"))));
  }, [page, product.id, t]);

  return (
    <Modal title={`${t("inventory.history", "History")} — ${product.name}`} onClose={onClose}>
      <ErrorBanner message={error} />
      <div className="space-y-2">
        {items.length === 0 && <p className="text-gray-400 text-sm">{t("inventory.noTransactions", "No transactions yet.")}</p>}
        {items.map((tx) => {
          const [key, fallback] = TX_LABEL[tx.type] ?? [tx.type, tx.type];
          return (
            <div key={tx.id} className="flex justify-between text-sm border-b border-gray-100 pb-2">
              <div>
                <p className="text-gray-900">
                  {t(key, fallback)}
                  {tx.reason ? <span className="text-gray-500"> · {tx.reason}</span> : null}
                </p>
                <p className="text-gray-400 text-xs">{new Date(tx.createdAt).toLocaleString()}</p>
              </div>
              <span className={tx.quantity < 0 ? "text-red-600" : "text-green-600"}>
                {tx.quantity > 0 ? "+" : ""}
                {tx.quantity}
              </span>
            </div>
          );
        })}
      </div>
      {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
    </Modal>
  );
}
