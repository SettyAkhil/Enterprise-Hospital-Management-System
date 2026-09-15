import { usePharmacyData } from "../data/usePharmacyData";
import { useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, TrendingDown, ShoppingCart, ClipboardList, AlertTriangle, Clock, Zap, Package, BarChart3, ChevronRight, ArrowRight } from "lucide-react";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

const quickActions = [
  { label: "New Sale", icon: ShoppingCart, color: "#1B4FD8", page: "dispensing" },
  { label: "Prescription Queue", icon: ClipboardList, color: "#16a34a", page: "prescriptions" },
  { label: "Verify Prescription", icon: Zap, color: "#7c3aed", page: "ocr" },
  { label: "Receive Stock", icon: Package, color: "#d906", page: "grn" },
  { label: "Check Stock", icon: AlertTriangle, color: "#dc2626", page: "expiry-low-stock" },
  { label: "Generate Report", icon: BarChart3, color: "#0284c7", page: "reports" },
];

const CHART_COLORS = { sales: "#1B4FD8", transactions: "#16a34a" };

interface DashboardProps { onNavigate: (page: string) => void }

export default function Dashboard({ onNavigate }: DashboardProps) {
  const {  salesData, prescriptions, medicines, expiringMedicines  } = usePharmacyData();
  const [chartView, setChartView] = useState<"weekly" | "monthly">("weekly");
  const chartData = salesData || [];

  const kpis = [
    { title: "Today's Sales", value: `₹${(chartData[chartData.length-1]?.revenue || 0).toLocaleString()}`, change: "0%", up: true, sub: "vs yesterday ₹0", icon: ShoppingCart, color: "#1B4FD8", bg: "#E8EDF5" },
    { title: "Prescriptions Processed", value: prescriptions.length.toString(), change: "0%", up: true, sub: "vs yesterday 0", icon: ClipboardList, color: "#16a34a", bg: "#DCFCE7" },
    { title: "Low Stock Items", value: medicines.filter(m => m.stock < m.reorderLevel).length.toString(), change: "0", up: false, sub: "Requires attention", icon: AlertTriangle, color: "#d906", bg: "#FEF3C7" },
    { title: "Expiring Soon", value: expiringMedicines.length.toString(), change: "0", up: false, sub: "Within 30 days", icon: Clock, color: "#dc2626", bg: "#FEE2E2" },
  ];

  const stockDistribution = [
    { name: "In Stock", value: medicines.filter(m => m.stock >= m.reorderLevel).length, color: "#16A34A" },
    { name: "Low Stock", value: medicines.filter(m => m.stock > 0 && m.stock < m.reorderLevel).length, color: "#f59e0b" },
    { name: "Out of Stock", value: medicines.filter(m => m.stock === 0).length, color: "#ef4444" },
    { name: "Expiring Soon", value: expiringMedicines.length, color: "#D97706" },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Dashboard" }]}
        title="Pharmacy Dashboard"
        description={`Here's what's happening in your pharmacy today – ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => onNavigate("dispensing")} className="px-4 py-2 rounded text-white text-[13px] font-medium flex items-center gap-1.5" style={{ background: "#1B4FD8" }}>
              <ShoppingCart size={14} /> New Sale
            </button>
            <button onClick={() => onNavigate("prescriptions")} className="px-4 py-2 rounded text-[13px] font-medium border border-[#DDE2EC] bg-white text-[#334155] hover:bg-[#F5F7FA] flex items-center gap-1.5 transition-colors">
              <ClipboardList size={14} /> Scan Prescription
            </button>
          </div>
        }
        onNavigate={onNavigate}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.title} className="bg-white rounded p-5 border border-[#DDE2EC] hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[12px] text-[#64748B] font-medium">{kpi.title}</p>
                <p className="text-[26px] font-bold text-[#0F1624] mt-1 leading-none">{kpi.value}</p>
              </div>
              <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ background: kpi.bg }}>
                <kpi.icon size={18} style={{ color: kpi.color }} />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {kpi.up ? <TrendingUp size={13} className="text-emerald-500" /> : <TrendingDown size={13} className="text-red-500" />}
              <span className="text-[12px] font-semibold" style={{ color: kpi.up ? "#15803d" : "#b91c1c" }}>{kpi.change}</span>
              <span className="text-[12px] text-[#94A3B8]">{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded border border-[#DDE2EC] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-[#0F1624]">Sales Overview</h2>
              <p className="text-[12px] text-[#64748B]">Revenue and transaction trends</p>
            </div>
            <div className="flex rounded border border-[#DDE2EC] overflow-hidden text-[12px]">
              {(["weekly", "monthly"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setChartView(v)}
                  className="px-3 py-1.5 font-medium transition-colors"
                  style={{ background: chartView === v ? "#0F1624" : "#fff", color: chartView === v ? "#fff" : "#64748B" }}
                >
                  {v === "weekly" ? "This Week" : "Monthly"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-[#F0F2F5]">
            <div><p className="text-[11px] text-[#64748B] font-medium uppercase tracking-wide">Total Sales</p><p className="text-[18px] font-bold text-[#0F1624]">₹0</p></div>
            <div><p className="text-[11px] text-[#64748B] font-medium uppercase tracking-wide">Avg / Day</p><p className="text-[18px] font-bold text-[#0F1624]">₹0</p></div>
            <div><p className="text-[11px] text-[#64748B] font-medium uppercase tracking-wide">Transactions</p><p className="text-[18px] font-bold text-[#0F1624]">0</p></div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B4FD8" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#1B4FD8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
              <XAxis dataKey={chartView === "weekly" ? "day" : "month"} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, "Sales"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #DDE2EC" }} />
              <Area type="monotone" dataKey="sales" stroke="#1B4FD8" strokeWidth={2} fill="url(#salesGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stock Distribution */}
        <div className="bg-white rounded border border-[#DDE2EC] p-5">
          <h2 className="text-[15px] font-semibold text-[#0F1624] mb-1">Stock Summary</h2>
          <p className="text-[12px] text-[#64748B] mb-4">Total: 0 medicines</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={stockDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {stockDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v, name) => [v as number, name as string]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {stockDistribution.map(d => (
              <div key={d.name} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded" style={{ background: d.color }} />
                  <span className="text-[#64748B]">{d.name}</span>
                </div>
                <span className="font-semibold text-[#0F1624]">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="bg-white rounded border border-[#DDE2EC] p-5">
          <h2 className="text-[15px] font-semibold text-[#0F1624] mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(a => (
              <button
                key={a.label}
                onClick={() => onNavigate(a.page)}
                className="flex flex-col items-center gap-2 p-3 rounded border border-[#DDE2EC] hover:border-[#1B4FD8] hover:bg-[#F5F7FA] transition-all text-center group"
              >
                <div className="w-9 h-9 rounded flex items-center justify-center" style={{ background: `${a.color}15` }}>
                  <a.icon size={16} style={{ color: a.color }} />
                </div>
                <span className="text-[11px] font-medium text-[#334155] group-hover:text-[#1B4FD8] transition-colors leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Prescription Queue */}
        <div className="lg:col-span-2 bg-white rounded border border-[#DDE2EC] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F2F5]">
            <h2 className="text-[15px] font-semibold text-[#0F1624]">Prescription Queue</h2>
            <button onClick={() => onNavigate("prescriptions")} className="text-[12px] font-medium flex items-center gap-1" style={{ color: "#1B4FD8" }}>
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
                  <td className="font-mono text-[12px] text-[#1B4FD8] font-medium">{rx.id}</td>
                  <td>
                    <p className="font-medium text-[#0F1624] text-[13px]">{rx.patient}</p>
                    <p className="text-[11px] text-[#94A3B8]">{rx.age}y · {rx.gender}</p>
                  </td>
                  <td className="text-[13px] text-[#334155]">{rx.doctor}</td>
                  <td className="text-[13px] font-medium text-center">{rx.items}</td>
                  <td><StatusBadge status={rx.status} size="sm" /></td>
                  <td className="text-[12px] text-[#94A3B8]">{rx.time}</td>
                  <td>
                    <button onClick={() => onNavigate("prescriptions")} className="text-[12px] font-medium px-2.5 py-1 rounded border border-[#DDE2EC] text-[#334155] hover:bg-[#F0F2F5] transition-colors">
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
        <div className="bg-white rounded border border-[#DDE2EC] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F2F5]">
            <h2 className="text-[15px] font-semibold text-[#0F1624]">Low Stock Medicines</h2>
            <button onClick={() => onNavigate("expiry-low-stock")} className="text-[12px] font-medium" style={{ color: "#1B4FD8" }}>View all</button>
          </div>
          <table>
            <thead><tr>
              <th>Medicine</th><th>Stock</th><th>Reorder Level</th><th>Action</th>
            </tr></thead>
            <tbody>
              {medicines.filter(m => m.stock < m.reorderLevel && m.stock > 0).slice(0, 5).map(m => (
                <tr key={m.id}>
                  <td>
                    <p className="font-medium text-[#0F1624] text-[13px]">{m.name}</p>
                    <p className="text-[11px] text-[#94A3B8]">{m.manufacturer}</p>
                  </td>
                  <td>
                    <span className="font-semibold text-[13px]" style={{ color: m.stock < 20 ? "#dc2626" : "#d906" }}>{m.stock}</span>
                  </td>
                  <td className="text-[13px] text-[#64748B]">{m.reorderLevel}</td>
                  <td>
                    <button onClick={() => onNavigate("purchase-orders")} className="text-[11px] font-medium px-2 py-1 rounded" style={{ background: "#E8EDF5", color: "#1B4FD8" }}>
                      Order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Expiring Medicines */}
        <div className="bg-white rounded border border-[#DDE2EC] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F2F5]">
            <h2 className="text-[15px] font-semibold text-[#0F1624]">Expiring Soon</h2>
            <button onClick={() => onNavigate("expiry-low-stock")} className="text-[12px] font-medium" style={{ color: "#1B4FD8" }}>View all</button>
          </div>
          <table>
            <thead><tr>
              <th>Medicine</th><th>Batch</th><th>Expiry</th><th>Days Left</th><th>Qty</th>
            </tr></thead>
            <tbody>
              {expiringMedicines.map(m => {
                const urgency = m.daysLeft <= 15 ? "#dc2626" : m.daysLeft <= 30 ? "#d906" : "#64748B";
                return (
                  <tr key={m.id}>
                    <td className="font-medium text-[13px] text-[#0F1624]">{m.medicine}</td>
                    <td className="font-mono text-[12px] text-[#64748B]">{m.batch}</td>
                    <td className="text-[12px] text-[#64748B]">{m.expiry}</td>
                    <td>
                      <span className="font-bold text-[13px]" style={{ color: urgency }}>{m.daysLeft}d</span>
                    </td>
                    <td className="text-[13px] text-[#334155]">{m.quantity}</td>
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
