import { BriefcaseBusiness, LayoutDashboard, Package, ShoppingCart, Users } from "lucide-react";

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Products", icon: Package, active: false },
  { label: "Sales", icon: ShoppingCart, active: false },
  { label: "Customers", icon: Users, active: false },
];

const STATS = [
  { label: "Today's Sales", value: "Tsh 842,000" },
  { label: "Today's Profit", value: "Tsh 268,000" },
  { label: "Total Products", value: "134" },
  { label: "Low Stock", value: "6" },
];

const RECENT = [
  { name: "Konyagi 750ml", qty: "12 sold", amount: "Tsh 96,000" },
  { name: "Serengeti Lager", qty: "8 sold", amount: "Tsh 40,000" },
  { name: "Kilimanjaro Water", qty: "20 sold", amount: "Tsh 20,000" },
];

export function ProductPreview() {
  return (
    <div className="rounded-xl border border-gray-200 shadow-xl bg-white overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-300" />
      </div>

      <div className="flex" style={{ minHeight: 320 }}>
        <div className="w-32 shrink-0 border-r border-gray-100 p-3 bg-white">
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center text-white">
              <BriefcaseBusiness size={12} />
            </div>
            <span className="text-[11px] font-semibold text-gray-900">Joe's Store</span>
          </div>
          <div className="flex flex-col gap-1">
            {NAV.map(({ label, icon: Icon, active }) => (
              <div
                key={label}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                  active ? "bg-blue-600 text-white font-medium" : "text-gray-500"
                }`}
              >
                <Icon size={12} className={active ? "text-white" : "text-gray-400"} />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 p-4 bg-gray-50">
          <p className="text-[13px] font-semibold text-gray-900 mb-3">Dashboard</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-2.5">
                <p className="text-[9px] text-gray-400 uppercase tracking-wide">{s.label}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">
              Recent Sales
            </p>
            <div className="space-y-1.5">
              {RECENT.map((r) => (
                <div key={r.name} className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-700">{r.name}</span>
                  <span className="text-gray-400">{r.qty}</span>
                  <span className="text-gray-900 font-medium">{r.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
