import { usePharmacyData } from "../data/usePharmacyData";
import { useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, TrendingDown, ShoppingCart, ClipboardList, AlertTriangle, Clock, Zap, Package, BarChart3, ChevronRight, ArrowRight } from "lucide-react";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

const quickActions = [
  { label: "New Sale", icon: ShoppingCart, color: "#4f46e5", page: "dispensing" },
  { label: "Prescription Queue", icon: ClipboardList, color: "#16a34a", page: "prescriptions" },
  { label: "Verify Prescription", icon: Zap, color: "#7c3aed", page: "ocr" },
  { label: "Receive Stock", icon: Package, color: "#d906", page: "grn" },
  { label: "Check Stock", icon: AlertTriangle, color: "#dc2626", page: "expiry-low-stock" },
  { label: "Generate Report", icon: BarChart3, color: "#0284c7", page: "reports" },
];

const CHART_COLORS = { sales: "#4f46e5", transactions: "#16a34a" };

interface DashboardProps { onNavigate: (page: string) => void }

export default function Dashboard({ onNavigate }: DashboardProps) {
  const {  salesData, prescriptions, medicines, expiringMedicines  } = usePharmacyData();
  const [chartView, setChartView] = useState<"weekly" | "monthly">("weekly");
  const chartData = salesData || [];

  const kpis = [
    { title: "Today's Sales", value: `₹${(chartData[chartData.length-1]?.revenue || 0).toLocaleString()}`, change: "0%", up: true, sub: "vs yesterday ₹0", icon: ShoppingCart, color: "#4f46e5", bg: "#eff6ff" },
    { title: "Prescriptions Processed", value: prescriptions.length.toString(), change: "0%", up: true, sub: "vs yesterday 0", icon: ClipboardList, color: "#16a34a", bg: "#f0fdfa" },
    { title: "Low Stock Items", value: medicines.filter(m => m.stock < m.reorderLevel).length.toString(), change: "0", up: false, sub: "Requires attention", icon: AlertTriangle, color: "#d906", bg: "#fffbeb" },
    { title: "Expiring Soon", value: expiringMedicines.length.toString(), change: "0", up: false, sub: "Within 30 days", icon: Clock, color: "#dc2626", bg: "#fef2f2" },
  ];

  const stockDistribution = [
    { name: "In Stock", value: medicines.filter(m => m.stock >= m.reorderLevel).length, color: "#22c55e" },
    { name: "Low Stock", value: medicines.filter(m => m.stock > 0 && m.stock < m.reorderLevel).length, color: "#f59e0b" },
    { name: "Out of Stock", value: medicines.filter(m => m.stock === 0).length, color: "#ef4444" },
    { name: "Expiring Soon", value: expiringMedicines.length, color: "#f97316" },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Dashboard" }]}
        title="Pharmacy Dashboard"
        description={`Here's what's happening in your pharmacy today – ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => onNavigate("dispensing")} className="px-4 py-2 rounded-none text-white text-[13px] font-medium flex items-center gap-1.5" style={{ background: "#4f46e5" }}>
              <ShoppingCart size={14} /> New Sale
            </button>
            <button onClick={() => onNavigate("prescriptions")} className="px-4 py-2 rounded-none text-[13px] font-medium border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb] flex items-center gap-1.5 transition-colors">
              <ClipboardList size={14} /> Scan Prescription
            </button>
          </div>
        }
        onNavigate={onNavigate}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.title} className="bg-white rounded-none p-5 border border-[#e5e7eb] hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[12px] text-[#6b7280] font-medium">{kpi.title}</p>
                <p className="text-[26px] font-bold text-[#111827] mt-1 leading-none">{kpi.value}</p>
              </div>
              <div className="w-10 h-10 rounded-none flex items-center justify-center flex-shrink-0" style={{ background: kpi.bg }}>
                <kpi.icon size={18} style={{ color: kpi.color }} />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {kpi.up ? <TrendingUp size={13} className="text-emerald-500" /> : <TrendingDown size={13} className="text-red-500" />}
              <span className="text-[12px] font-semibold" style={{ color: kpi.up ? "#15803d" : "#b91c1c" }}>{kpi.change}</span>
              <span className="text-[12px] text-[#9ca3af]">{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-none border border-[#e5e7eb] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-[#111827]">Sales Overview</h2>
              <p className="text-[12px] text-[#6b7280]">Revenue and transaction trends</p>
            </div>
            <div className="flex rounded-none border border-[#e5e7eb] overflow-hidden text-[12px]">
              {(["weekly", "monthly"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setChartView(v)}
                  className="px-3 py-1.5 font-medium transition-colors"
                  style={{ background: chartView === v ? "#111827" : "#fff", color: chartView === v ? "#fff" : "#6b7280" }}
                >
                  {v === "weekly" ? "This Week" : "Monthly"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-[#f3f4f6]">
            <div><p className="text-[11px] text-[#6b7280] font-medium uppercase tracking-wide">Total Sales</p><p className="text-[18px] font-bold text-[#111827]">₹0</p></div>
            <div><p className="text-[11px] text-[#6b7280] font-medium uppercase tracking-wide">Avg / Day</p><p className="text-[18px] font-bold text-[#111827]">₹0</p></div>
            <div><p className="text-[11px] text-[#6b7280] font-medium uppercase tracking-wide">Transactions</p><p className="text-[18px] font-bold text-[#111827]">0</p></div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey={chartView === "weekly" ? "day" : "month"} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Sales"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <Area type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={2} fill="url(#salesGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stock Distribution */}
        <div className="bg-white rounded-none border border-[#e5e7eb] p-5">
          <h2 className="text-[15px] font-semibold text-[#111827] mb-1">Stock Summary</h2>
          <p className="text-[12px] text-[#6b7280] mb-4">Total: 0 medicines</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={stockDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {stockDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v: number, name: string) => [v, name]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {stockDistribution.map(d => (
              <div key={d.name} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-none" style={{ background: d.color }} />
                  <span className="text-[#6b7280]">{d.name}</span>
                </div>
                <span className="font-semibold text-[#111827]">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="bg-white rounded-none border border-[#e5e7eb] p-5">
          <h2 className="text-[15px] font-semibold text-[#111827] mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(a => (
              <button
                key={a.label}
                onClick={() => onNavigate(a.page)}
                className="flex flex-col items-center gap-2 p-3 rounded-none border border-[#e5e7eb] hover:border-[#4f46e5] hover:bg-[#f8faff] transition-all text-center group"
              >
                <div className="w-9 h-9 rounded-none flex items-center justify-center" style={{ background: `${a.color}15` }}>
                  <a.icon size={16} style={{ color: a.color }} />
                </div>
                <span className="text-[11px] font-medium text-[#374151] group-hover:text-[#4f46e5] transition-colors leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Prescription Queue */}
        <div className="lg:col-span-2 bg-white rounded-none border border-[#e5e7eb] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6]">
            <h2 className="text-[15px] font-semibold text-[#111827]">Prescription Queue</h2>
            <button onClick={() => onNavigate("prescriptions")} className="text-[12px] font-medium flex items-center gap-1" style={{ color: "#4f46e5" }}>
              View all <ArrowRight size={12} />
            </button>
          </div>
          <table>
            <thead><tr>
              <th>Prescription ID</th><th>Patient</th><th>Doctor</th><th>Items</th><th>Status</th><th>Time</th><th>Action</th>
            </tr></thead>
            <tbody>
              {prescriptions.slice(0, 5).map(rx => (
                <tr key={rx.id}>
                  <td className="font-mono text-[12px] text-[#4f46e5] font-medium">{rx.id}</td>
                  <td>
                    <p className="font-medium text-[#111827] text-[13px]">{rx.patient}</p>
                    <p className="text-[11px] text-[#9ca3af]">{rx.age}y · {rx.gender}</p>
                  </td>
                  <td className="text-[13px] text-[#374151]">{rx.doctor}</td>
                  <td className="text-[13px] font-medium text-center">{rx.items}</td>
                  <td><StatusBadge status={rx.status} size="sm" /></td>
                  <td className="text-[12px] text-[#9ca3af]">{rx.time}</td>
                  <td>
                    <button onClick={() => onNavigate("prescriptions")} className="text-[12px] font-medium px-2.5 py-1 rounded-none border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6] transition-colors">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock */}
        <div className="bg-white rounded-none border border-[#e5e7eb] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6]">
            <h2 className="text-[15px] font-semibold text-[#111827]">Low Stock Medicines</h2>
            <button onClick={() => onNavigate("expiry-low-stock")} className="text-[12px] font-medium" style={{ color: "#4f46e5" }}>View all</button>
          </div>
          <table>
            <thead><tr>
              <th>Medicine</th><th>Stock</th><th>Reorder Level</th><th>Action</th>
            </tr></thead>
            <tbody>
              {medicines.filter(m => m.stock < m.reorderLevel && m.stock > 0).slice(0, 5).map(m => (
                <tr key={m.id}>
                  <td>
                    <p className="font-medium text-[#111827] text-[13px]">{m.name}</p>
                    <p className="text-[11px] text-[#9ca3af]">{m.manufacturer}</p>
                  </td>
                  <td>
                    <span className="font-semibold text-[13px]" style={{ color: m.stock < 20 ? "#dc2626" : "#d906" }}>{m.stock}</span>
                  </td>
                  <td className="text-[13px] text-[#6b7280]">{m.reorderLevel}</td>
                  <td>
                    <button onClick={() => onNavigate("purchase-orders")} className="text-[11px] font-medium px-2 py-1 rounded" style={{ background: "#eff6ff", color: "#4f46e5" }}>
                      Order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Expiring Medicines */}
        <div className="bg-white rounded-none border border-[#e5e7eb] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6]">
            <h2 className="text-[15px] font-semibold text-[#111827]">Expiring Soon</h2>
            <button onClick={() => onNavigate("expiry-low-stock")} className="text-[12px] font-medium" style={{ color: "#4f46e5" }}>View all</button>
          </div>
          <table>
            <thead><tr>
              <th>Medicine</th><th>Batch</th><th>Expiry</th><th>Days Left</th><th>Qty</th>
            </tr></thead>
            <tbody>
              {expiringMedicines.map(m => {
                const urgency = m.daysLeft <= 15 ? "#dc2626" : m.daysLeft <= 30 ? "#d906" : "#6b7280";
                return (
                  <tr key={m.id}>
                    <td className="font-medium text-[13px] text-[#111827]">{m.medicine}</td>
                    <td className="font-mono text-[12px] text-[#6b7280]">{m.batch}</td>
                    <td className="text-[12px] text-[#6b7280]">{m.expiry}</td>
                    <td>
                      <span className="font-bold text-[13px]" style={{ color: urgency }}>{m.daysLeft}d</span>
                    </td>
                    <td className="text-[13px] text-[#374151]">{m.quantity}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
