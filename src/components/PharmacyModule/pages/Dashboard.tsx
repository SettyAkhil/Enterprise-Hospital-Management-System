import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { 
  ShoppingCart, ClipboardList, AlertTriangle, Clock, 
  Package, IndianRupee, RefreshCcw, BarChart3, ArrowRight 
} from "lucide-react";

import { usePharmacyData } from "../data/usePharmacyData";
import { PharmacyDatabase } from "../../../services/pharmacyDb";
import { Table, TR, TD, StatusBadge, AlertBanner, Btn } from "../../shared";
import { Icon } from "../../icons";

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { prescriptions, medicines, expiringMedicines, bills, supplierReturns } = usePharmacyData();
  const [chartView, setChartView] = useState<"weekly" | "monthly">("weekly");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Dynamically generate chart data ending on selectedDate
  const numDays = chartView === "weekly" ? 7 : 14;
  const daysArray = Array.from({ length: numDays }).map((_, i) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - ((numDays - 1) - i));
    return d.toISOString().split("T")[0];
  });

  const chartData = daysArray.map(dateStr => {
    const dayBills = bills.filter(
      b => (b.billDate || "").startsWith(dateStr) && !b.isModifiedReturnBill
    );
    const dayReturns = PharmacyDatabase.getReturns().filter(
      r => (r.createdAt || "").startsWith(dateStr)
    );
    const dayGross = dayBills.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    const dayRefunds = dayReturns.reduce((acc, r) => acc + (r.refundAmount || 0), 0);
    const dayNetRevenue = Math.max(0, dayGross - dayRefunds);

    return {
      date: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
      revenue: dayNetRevenue,
      gross: dayGross,
      refunds: dayRefunds,
      orders: dayBills.length
    };
  });
  
  const totalGross = chartData.reduce((sum, d) => sum + (d.gross || 0), 0);
  const totalRefunds = chartData.reduce((sum, d) => sum + (d.refunds || 0), 0);
  const totalSales = Math.max(0, totalGross - totalRefunds);
  const totalOrders = chartData.reduce((sum, d) => sum + d.orders, 0);
  const avgSales = chartData.length > 0 ? totalSales / chartData.length : 0;

  // Selected Date specific metrics
  const selectedDateStats = chartData[chartData.length - 1];
  const selectedDateNet = selectedDateStats?.revenue || 0;
  const selectedDateGross = selectedDateStats?.gross || 0;
  
  const selectedDatePrescriptions = prescriptions.filter(p => 
    (p.date || "").startsWith(selectedDate)
  );
  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  // Stock Distribution
  const inStockCount = medicines.filter(m => m.stock >= m.reorderLevel).length;
  const lowStockCount = medicines.filter(m => m.stock > 0 && m.stock < m.reorderLevel).length;
  const outOfStockCount = medicines.filter(m => m.stock === 0).length;
  const expiringSoonCount = expiringMedicines.length;

  const stockDistribution = [
    { name: "In Stock", value: inStockCount, color: "#16A34A" },
    { name: "Low Stock", value: lowStockCount, color: "#F59E0B" },
    { name: "Out of Stock", value: outOfStockCount, color: "#EF4444" },
    { name: "Expiring Soon", value: expiringSoonCount, color: "#D97706" },
  ];

  // Supplier Returns KPIs
  const currentMonthReturns = supplierReturns.filter(
    r => r.createdAt && new Date(r.createdAt).getMonth() === new Date().getMonth()
  );
  const returnTotalMonth = currentMonthReturns.reduce((acc, curr) => acc + (curr.returnAmount || 0), 0);
  const pendingCreditsReturns = supplierReturns.filter(
    r => r.status === "Credit Note Pending" || r.status === "Sent To Supplier"
  );
  const pendingCreditAmount = pendingCreditsReturns.reduce((acc, curr) => acc + (curr.returnAmount || 0), 0);

  // Critical items
  const criticalOutOfStock = medicines.filter(m => m.stock === 0);
  const criticalExpiring = expiringMedicines.filter(m => m.daysLeft <= 7);

  // Key Domain Metrics matching Main Dashboard style
  const kpis = [
    {
      id: "sales",
      label: isToday ? "Today's Total Sales" : "Selected Date Sales",
      value: `₹${selectedDateNet.toLocaleString("en-IN")}`,
      sub: `Gross: ₹${selectedDateGross.toLocaleString("en-IN")}`,
      trend: "+4.2%",
      trendDir: "down" as const,
      icon: ShoppingCart,
      domain: "Revenue",
      color: "#2563EB", // Royal Blue
      bgColor: "#EFF6FF",
      borderColor: "#BFDBFE",
      action: "Sales Ledger",
      target: "inventory-ledger",
    },
    {
      id: "prescriptions",
      label: isToday ? "Prescriptions Today" : "Selected Prescriptions",
      value: selectedDatePrescriptions.length.toString(),
      sub: `${selectedDatePrescriptions.filter(p => (p.status || "").toLowerCase().includes("pending") || (p.status || "").toLowerCase().includes("sent")).length} pending verification`,
      trend: "Active Rx Queue",
      trendDir: "neutral" as const,
      icon: ClipboardList,
      domain: "Prescriptions",
      color: "#059669", // Emerald Green
      bgColor: "#ECFDF5",
      borderColor: "#A7F3D0",
      action: "Open Queue",
      target: "prescriptions",
    },
    {
      id: "low_stock",
      label: "Low Stock Items",
      value: medicines.filter(m => m.stock < m.reorderLevel).length.toString(),
      sub: `${criticalOutOfStock.length} out of stock`,
      trend: criticalOutOfStock.length > 0 ? "Reorder Urgent" : "Normal",
      trendDir: "up" as const,
      icon: AlertTriangle,
      domain: "Inventory",
      color: "#D97706", // Amber
      bgColor: "#FFFBEB",
      borderColor: "#FDE68A",
      action: "Check Inventory",
      target: "expiry-low-stock",
    },
    {
      id: "expiring",
      label: "Expiring Soon",
      value: expiringSoonCount.toString(),
      sub: `${criticalExpiring.length} within 7 days`,
      trend: criticalExpiring.length > 0 ? "High Urgency" : "Monitored",
      trendDir: "up" as const,
      icon: Clock,
      domain: "Quality",
      color: "#DC2626", // Red
      bgColor: "#FEF2F2",
      borderColor: "#FECACA",
      action: "Review Batches",
      target: "expiry-low-stock",
    },
    {
      id: "returns",
      label: "Supplier Returns",
      value: `₹${returnTotalMonth.toLocaleString("en-IN")}`,
      sub: `₹${pendingCreditAmount.toLocaleString("en-IN")} pending credit`,
      trend: `${currentMonthReturns.length} active claims`,
      trendDir: "neutral" as const,
      icon: RefreshCcw,
      domain: "Procurement",
      color: "#7C3AED", // Violet
      bgColor: "#F5F3FF",
      borderColor: "#DDD6FE",
      action: "Supplier Claims",
      target: "supplier-returns",
    },
    {
      id: "orders",
      label: "Total Dispensed",
      value: totalOrders.toString(),
      sub: `${bills.length} total invoices on file`,
      trend: "Fulfilled",
      trendDir: "down" as const,
      icon: Package,
      domain: "Dispensing",
      color: "#0891B2", // Cyan
      bgColor: "#ECFEFF",
      borderColor: "#A5F3FC",
      action: "New Dispense",
      target: "dispensing",
    },
  ];

  // Quick Action Shortcuts matching Dashboard.tsx style
  const quickActions = [
    { label: "New Sale & POS", desc: "Patient Dispensing", icon: ShoppingCart, page: "dispensing", color: "#2563EB", bg: "#EFF6FF" },
    { label: "Prescription Queue", desc: "Doctor Rx Orders", icon: ClipboardList, page: "prescriptions", color: "#059669", bg: "#ECFDF5" },
    { label: "Receive Stock (GRN)", desc: "Invoice OCR & Inward", icon: Package, page: "grn", color: "#0891B2", bg: "#ECFEFF" },
    { label: "Expiry & Stock Check", desc: "Batches & Reorder", icon: AlertTriangle, page: "expiry-low-stock", color: "#D97706", bg: "#FFFBEB" },
    { label: "Purchase Orders", desc: "Vendor Procurement", icon: IndianRupee, page: "purchase-orders", color: "#7C3AED", bg: "#F5F3FF" },
    { label: "Pharmacy Reports", desc: "Sales & Tax Audits", icon: BarChart3, page: "reports", color: "#4F46E5", bg: "#EEF2FF" },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F6F9]">
      {/* ── Domain Hero Header (matching main Dashboard.tsx) ─────────────────── */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">💊</span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">
                    Pharmacy Dispensing & Inventory Command Suite
                  </h1>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Date Filter */}
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#DDE2EC] px-2.5 py-1.5 rounded-md text-[12px]">
              <span className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Date:</span>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-[12.5px] font-semibold text-gray-800 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Low Stock Warning Pill */}
            {medicines.some(m => m.stock < m.reorderLevel) && (
              <div 
                onClick={() => onNavigate("expiry-low-stock")}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-[12px] font-medium cursor-pointer hover:bg-[#FEF3C7] transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                <span>{medicines.filter(m => m.stock < m.reorderLevel).length} Low Stock</span>
              </div>
            )}

            {/* Primary Action Button */}
            <Btn variant="primary" size="sm" onClick={() => onNavigate("dispensing")} className="shadow-sm">
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>New Sale</span>
            </Btn>

            {/* Prescription Queue Button */}
            <Btn variant="outline" size="sm" onClick={() => onNavigate("prescriptions")} className="shadow-sm">
              <ClipboardList className="w-3.5 h-3.5 text-[#1B4FD8]" />
              <span>Prescriptions</span>
            </Btn>

            {/* Reset / Refresh Button */}
            <Btn 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])} 
              className="shadow-sm"
            >
              <Icon.Refresh className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Today</span>
            </Btn>
          </div>
        </div>
      </div>

      <div className="p-5 max-w-[1600px] mx-auto space-y-5">
        {/* ── High-Urgency Alerts ────────────────────────────────────────────── */}
        {(criticalOutOfStock.length > 0 || criticalExpiring.length > 0) && (
          <div className="space-y-2.5">
            {criticalOutOfStock.length > 0 && (
              <AlertBanner
                type="critical"
                title={`Stock Depletion Alert — ${criticalOutOfStock.length} Medicines Completely Out of Stock`}
                body={`${criticalOutOfStock.slice(0, 3).map(m => m.name).join(", ")}${criticalOutOfStock.length > 3 ? " and others" : ""} are at 0 units. Immediate purchase order recommended.`}
                action="Reorder Stock"
                onAction={() => onNavigate("purchase-orders")}
              />
            )}
            {criticalExpiring.length > 0 && (
              <AlertBanner
                type="warning"
                title={`Critical Expiry Warning — ${criticalExpiring.length} Batches Expiring in < 7 Days`}
                body="High risk of stock expiry. Quarantine expiring batches or process supplier return credit notes immediately."
                action="Process Supplier Return"
                onAction={() => onNavigate("supplier-returns")}
              />
            )}
          </div>
        )}

        {/* ── Domain Key Metrics Grid (6 Columns) ────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {kpis.map((m) => {
            const IconComp = m.icon;
            return (
              <div
                key={m.id}
                onClick={() => onNavigate(m.target)}
                className="group relative bg-white border border-[#E2E8F0] rounded-none p-4 shadow-sm hover:shadow-md hover:border-[#2563EB] transition-all cursor-pointer overflow-hidden"
              >
                {/* Domain accent strip */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: m.color }}
                />

                <div className="flex items-start justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    {m.label}
                  </span>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: m.bgColor, color: m.color }}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-extrabold text-gray-900 tracking-tight font-mono">
                    {m.value}
                  </span>
                  {m.trend && (
                    <span
                      className={`text-[11px] font-semibold font-mono ${
                        m.trendDir === "up" && (m.id === "low_stock" || m.id === "expiring")
                          ? "text-[#DC2626]"
                          : m.trendDir === "down"
                          ? "text-[#16A34A]"
                          : "text-[#64748B]"
                      }`}
                    >
                      {m.trend}
                    </span>
                  )}
                </div>

                <div className="text-[11.5px] text-[#94A3B8] mt-1 truncate">
                  {m.sub}
                </div>

                <div className="mt-3 pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[11px]">
                  <span
                    className="font-medium group-hover:underline flex items-center gap-1"
                    style={{ color: m.color }}
                  >
                    {m.action} →
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">
                    {m.domain}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Sales Overview & Stock Distribution ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Sales Chart (2 Cols) */}
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#FAFCFF] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                  <Icon.Billing className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                    Sales & Revenue Velocity
                  </h2>
                  <p className="text-[11px] text-[#64748B]">Revenue and transaction velocity ending {selectedDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-md border border-[#DDE2EC] overflow-hidden text-[11px] font-medium bg-white">
                  {(["weekly", "monthly"] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setChartView(v)}
                      className={`px-2.5 py-1 transition-colors ${
                        chartView === v ? "bg-[#1E293B] text-white font-semibold" : "text-[#64748B] hover:bg-[#F1F5F9]"
                      }`}
                    >
                      {v === "weekly" ? "7 Days" : "14 Days"}
                    </button>
                  ))}
                </div>
                <Btn variant="ghost" size="xs" onClick={() => onNavigate("reports")}>
                  Full Reports →
                </Btn>
              </div>
            </div>

            {/* Quick Metrics Header */}
            <div className="grid grid-cols-3 gap-4 px-5 py-3 border-b border-[#F1F5F9] bg-[#FAFCFF]/60">
              <div>
                <p className="text-[10.5px] text-[#64748B] font-bold uppercase tracking-wider">Total Sales</p>
                <p className="text-[18px] font-extrabold text-gray-900 font-mono">
                  ₹{totalSales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-[10.5px] text-[#64748B] font-bold uppercase tracking-wider">Avg Daily Revenue</p>
                <p className="text-[18px] font-extrabold text-gray-900 font-mono">
                  ₹{avgSales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-[10.5px] text-[#64748B] font-bold uppercase tracking-wider">Total Invoices</p>
                <p className="text-[18px] font-extrabold text-gray-900 font-mono">
                  {totalOrders}
                </p>
              </div>
            </div>

            <div className="p-5 flex-1">
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pharmacySalesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis 
                    tick={{ fontSize: 11, fill: "#94A3B8" }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} 
                  />
                  <Tooltip 
                    formatter={(v) => [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, "Net Sales"]} 
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #DDE2EC", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} 
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.2} fill="url(#pharmacySalesGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stock Summary & Distribution (1 Col) */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#FAFCFF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#ECFDF5] text-[#059669] flex items-center justify-center">
                  <Icon.Pharmacy className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-gray-900 tracking-tight">Stock Distribution</h2>
              </div>
              <span className="text-[11px] font-mono text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full font-semibold">
                {medicines.length} Medicines
              </span>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie 
                    data={stockDistribution} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={50} 
                    outerRadius={75} 
                    paddingAngle={3} 
                    dataKey="value"
                  >
                    {stockDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip 
                    formatter={(v, name) => [v as number, name as string]} 
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }} 
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2 mt-2 pt-3 border-t border-[#F1F5F9]">
                {stockDistribution.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-[#64748B] font-medium">{d.name}</span>
                    </div>
                    <span className="font-bold text-gray-900 font-mono">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Active Prescription Queue & Quick Actions ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Prescription Queue Table (2 Cols) */}
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#FAFCFF] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                  <Icon.Patients className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                    Active Prescription Queue
                  </h2>
                  <p className="text-[11px] text-[#64748B]">Doctor orders dispatched for verification & dispensing</p>
                </div>
              </div>
              <Btn variant="ghost" size="xs" onClick={() => onNavigate("prescriptions")}>
                Full Rx Worklist →
              </Btn>
            </div>

            <Table headers={["Prescription ID", "Patient", "Prescribing Doctor", "Items", "Status", "Time", "Action"]}>
              {selectedDatePrescriptions.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="text-center py-8 text-[#64748B]">
                    No prescriptions found for {selectedDate}.
                  </TD>
                </TR>
              ) : (
                selectedDatePrescriptions.slice(0, 5).map(rx => (
                  <TR key={rx.id}>
                    <TD>
                      <span className="font-mono text-[12px] font-bold text-[#1B4FD8] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                        {rx.id}
                      </span>
                    </TD>
                    <TD>
                      <div>
                        <div className="font-bold text-gray-900 text-[12.5px]">{rx.patient}</div>
                        <div className="text-[10.5px] font-mono text-[#94A3B8]">{rx.age}y · {rx.gender}</div>
                      </div>
                    </TD>
                    <TD>
                      <span className="text-[12px] font-medium text-gray-800">{rx.doctor}</span>
                    </TD>
                    <TD>
                      <span className="font-mono text-[12.5px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        {rx.items} items
                      </span>
                    </TD>
                    <TD>
                      <StatusBadge status={rx.status} />
                    </TD>
                    <TD>
                      <span className="font-mono text-[11px] text-[#64748B]">{rx.time}</span>
                    </TD>
                    <TD>
                      <Btn variant="outline" size="xs" onClick={() => onNavigate("prescriptions")}>
                        View Rx →
                      </Btn>
                    </TD>
                  </TR>
                ))
              )}
            </Table>
          </div>

          {/* Pharmacy Quick Actions (1 Col) */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3.5 border-b border-[#E2E8F0] bg-[#FAFCFF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shadow-xs">
                  <Icon.Cmd className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                    Pharmacy Quick Actions
                  </h2>
                </div>
              </div>
              <span className="text-[10.5px] font-mono text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full font-semibold">
                Shortcuts
              </span>
            </div>

            <div className="p-4 grid grid-cols-2 gap-3 flex-1 items-center justify-center">
              {quickActions.map((q, i) => {
                const ActionIcon = q.icon;
                return (
                  <button
                    key={i}
                    onClick={() => onNavigate(q.page)}
                    className="group flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 hover:scale-105 hover:shadow-md focus:outline-none cursor-pointer"
                    style={{
                      backgroundColor: q.bg,
                      borderColor: `${q.color}35`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 mb-1.5"
                      style={{ color: q.color }}
                    >
                      <ActionIcon className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <span className="text-[11.5px] font-bold text-gray-800 group-hover:text-[#2563EB] text-center leading-tight">
                      {q.label}
                    </span>
                    <span className="text-[9.5px] text-[#64748B] text-center mt-0.5">
                      {q.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Low Stock & Expiring Soon Tables ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Low Stock Items */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#FAFCFF] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#FFFBEB] text-[#D97706] flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                    Low Stock Medicines
                  </h2>
                  <p className="text-[11px] text-[#64748B]">Items below critical reorder threshold</p>
                </div>
              </div>
              <Btn variant="ghost" size="xs" onClick={() => onNavigate("expiry-low-stock")}>
                View All →
              </Btn>
            </div>

            <Table headers={["Medicine", "Current Stock", "Reorder Level", "Action"]}>
              {medicines.filter(m => m.stock < m.reorderLevel).length === 0 ? (
                <TR>
                  <TD colSpan={4} className="text-center py-6 text-[#64748B]">
                    All medicine stocks are at healthy operational levels.
                  </TD>
                </TR>
              ) : (
                medicines.filter(m => m.stock < m.reorderLevel).slice(0, 5).map(m => (
                  <TR key={m.id}>
                    <TD>
                      <div>
                        <div className="font-bold text-gray-900 text-[12.5px]">{m.name}</div>
                        <div className="text-[10.5px] text-[#94A3B8]">{m.manufacturer}</div>
                      </div>
                    </TD>
                    <TD>
                      <span 
                        className={`font-mono text-[12.5px] font-bold px-2 py-0.5 rounded-full ${
                          m.stock === 0 
                            ? "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]" 
                            : "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]"
                        }`}
                      >
                        {m.stock} units
                      </span>
                    </TD>
                    <TD>
                      <span className="font-mono text-[12px] text-[#64748B]">{m.reorderLevel} units</span>
                    </TD>
                    <TD>
                      <Btn variant="primary" size="xs" onClick={() => onNavigate("purchase-orders")}>
                        Order →
                      </Btn>
                    </TD>
                  </TR>
                ))
              )}
            </Table>
          </div>

          {/* Expiring Soon */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#FAFCFF] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                    Expiring Soon (&lt; 30 Days)
                  </h2>
                  <p className="text-[11px] text-[#64748B]">Batches approaching expiration date</p>
                </div>
              </div>
              <Btn variant="ghost" size="xs" onClick={() => onNavigate("expiry-low-stock")}>
                View All →
              </Btn>
            </div>

            <Table headers={["Medicine", "Batch", "Expiry", "Days Left", "Qty"]}>
              {expiringMedicines.length === 0 ? (
                <TR>
                  <TD colSpan={5} className="text-center py-6 text-[#64748B]">
                    No batches expiring within the next 30 days.
                  </TD>
                </TR>
              ) : (
                expiringMedicines.slice(0, 5).map(m => {
                  const isCritical = m.daysLeft <= 7;
                  const isWarning = m.daysLeft <= 15;
                  return (
                    <TR key={m.id}>
                      <TD>
                        <span className="font-bold text-gray-900 text-[12.5px]">{m.medicine}</span>
                      </TD>
                      <TD>
                        <span className="font-mono text-[11px] text-[#64748B] bg-gray-100 px-1.5 py-0.5 rounded">
                          {m.batch}
                        </span>
                      </TD>
                      <TD>
                        <span className="font-mono text-[11.5px] text-gray-700">{m.expiry}</span>
                      </TD>
                      <TD>
                        <span 
                          className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isCritical 
                              ? "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] animate-pulse" 
                              : isWarning 
                              ? "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]" 
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {m.daysLeft}d left
                        </span>
                      </TD>
                      <TD>
                        <span className="font-mono text-[12px] font-semibold text-gray-800">{m.quantity}</span>
                      </TD>
                    </TR>
                  );
                })
              )}
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
