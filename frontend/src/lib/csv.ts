// Small CSV reader for stock imports. Handles quoted fields, a UTF-8 BOM,
// and comma, semicolon or tab separators (Excel uses ";" in some regions).

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length - 1] as const);
  const delimiter = counts.sort((a, b) => b[1] - a[1])[0][1] > 0 ? counts[0][0] : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export type StockField = "name" | "sku" | "quantity" | "purchasePrice" | "sellingPrice" | "minStockLevel";

// Accepted column names (English and Swahili), compared without spaces,
// dashes, underscores or case.
const HEADER_ALIASES: Record<StockField, string[]> = {
  name: ["name", "product", "productname", "item", "jina", "bidhaa", "jinalabidhaa"],
  sku: ["sku", "code", "itemcode", "barcode", "msimbo", "namba"],
  quantity: ["quantity", "qty", "stock", "units", "idadi", "kiasi", "stoo"],
  purchasePrice: ["purchaseprice", "costprice", "cost", "buyingprice", "unitcost", "beiyakununua", "beikununua", "gharama"],
  sellingPrice: ["sellingprice", "price", "saleprice", "retailprice", "beiyakuuza", "beikuuza", "bei"],
  minStockLevel: ["minstock", "minstocklevel", "minimum", "reorderlevel", "kiwangochachini", "chini"],
};

const norm = (s: string) => s.toLowerCase().replace(/[\s_\-.()]/g, "");

export function mapHeaders(header: string[]) {
  const map: Partial<Record<StockField, number>> = {};
  header.forEach((h, i) => {
    const key = norm(h);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [StockField, string[]][]) {
      if (map[field] === undefined && aliases.includes(key)) map[field] = i;
    }
  });
  return map;
}

// "12,000" or "12 000" -> "12000"; leaves empty as "".
const cleanNumber = (v: string) => v.replace(/[\s,]/g, "").replace(/^tsh/i, "");

export function rowsToStockRows(rows: string[][]) {
  const [header, ...body] = rows;
  const map = mapHeaders(header ?? []);
  const get = (r: string[], f: StockField) => (map[f] === undefined ? "" : (r[map[f]!] ?? "").trim());
  return {
    map,
    rows: body.map((r) => ({
      name: get(r, "name"),
      sku: get(r, "sku"),
      quantity: cleanNumber(get(r, "quantity")) || "0",
      purchasePrice: cleanNumber(get(r, "purchasePrice")),
      sellingPrice: cleanNumber(get(r, "sellingPrice")),
      minStockLevel: cleanNumber(get(r, "minStockLevel")),
    })),
  };
}

function csvCell(v: string | number | null | undefined) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadCsv(rows: (string | number | null | undefined)[][], filename: string) {
  // BOM so Excel opens UTF-8 names correctly.
  downloadBlob(new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" }), filename);
}

export const STOCK_CSV_HEADER = ["name", "sku", "quantity", "purchase_price", "selling_price", "min_stock"];
