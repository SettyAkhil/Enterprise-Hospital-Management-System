import { usePharmacyData } from "../data/usePharmacyData";
import { useState } from "react";
import { AlertTriangle, Clock, XCircle, TrendingDown, ShoppingBag } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { Btn } from "../../shared";

function urgencyLabel(days: number): { label: string; color: string; bg: string } {
  if (days <= 0) return { label: "Expired", color: "#B91C1C", bg: "#FEE2E2" };
  if (days <= 15) return { label: `${days}d • Critical`, color: "#DC2626", bg: "#FEE2E2" };
  if (days <= 30) return { label: `${days}d • Urgent`, color: "#D97706", bg: "#FEF3C7" };
  if (days <= 60) return { label: `${days}d • Soon`, color: "#D97706", bg: "#FEF3C7" };
  return { label: `${days}d left`, color: "#475569", bg: "#F1F5F9" };
}

interface ExpiryLowStockProps { onNavigate: (page: string) => void }

export default function ExpiryLowStock({ onNavigate }: ExpiryLowStockProps) {
  const { medicines, expiringMedicines } = usePharmacyData();
  const outOfStock = medicines.filter(m => m.stock === 0);
  const lowStock = medicines.filter(m => m.stock > 0 && m.stock < m.reorderLevel);
  const expiredMeds = expiringMedicines.filter(m => m.status === "expired");
  const expiringSoon = expiringMedicines.filter(m => m.status === "expiring");

  const tabs = [
    { id: "low", label: "Low Stock", icon: TrendingDown, count: lowStock.length, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
    { id: "expiring", label: "Expiring Soon", icon: Clock, count: expiringSoon.length, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
    { id: "expired", label: "Expired", icon: XCircle, count: expiredMeds.length, color: "#991B1B", bg: "#FEE2E2", border: "#FECACA" },
    { id: "outofstock", label: "Out of Stock", icon: AlertTriangle, count: outOfStock.length, color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  ];

  const [activeTab, setActiveTab] = useState("low");

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F6F9]">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Stock & Inventory" }, { label: "Expiry & Low Stock" }]}
        title="Inventory Alert & Quality Center"
        badge="QUALITY & REORDER"
        description="Monitor critical inventory thresholds, depleting formulary stocks, and batch shelf lives"
        actions={
          <Btn variant="primary" size="sm" onClick={() => onNavigate("purchase-orders")} className="shadow-xs">
            <ShoppingBag size={14} /> New Purchase Order
          </Btn>
        }
        onNavigate={onNavigate}
        icon={AlertTriangle} iconBg="bg-red-600"
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-4 max-w-[1600px] w-full mx-auto">
        {/* Tab bar */}
        <div className="flex gap-2.5 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold text-[12.5px] transition-all cursor-pointer shadow-xs ${
                activeTab === t.id
                  ? "bg-[#1E293B] text-white border-[#1E293B]"
                  : "bg-white text-gray-700 border-[#E2E8F0] hover:bg-[#F8FAFC]"
              }`}
            >
              <t.icon size={14} style={{ color: activeTab === t.id ? "#fff" : t.color }} />
              <span>{t.label}</span>
              <span 
                className="px-1.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold" 
                style={{
                  background: activeTab === t.id ? "rgba(255,255,255,0.2)" : t.bg,
                  color: activeTab === t.id ? "#fff" : t.color,
                }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content Table Card */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {activeTab === "low" && (
            <table>
              <thead><tr>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Medicine</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Current Stock</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Reorder Level</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Status</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0] text-right">Actions</th>
              </tr></thead>
              <tbody>
                {lowStock.map((m, i) => (
                  <tr key={i} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold text-[13px] text-gray-900">{m.name}</td>
                    <td className="px-4 py-3 font-mono text-[13px] font-bold text-[#D97706]">{m.stock} units</td>
                    <td className="px-4 py-3 font-mono text-[12.5px] text-[#64748B]">{m.reorderLevel} units</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                        Low Stock
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Btn variant="primary" size="xs" onClick={() => onNavigate("purchase-orders")}>
                        <ShoppingBag size={12} /> Reorder
                      </Btn>
                    </td>
                  </tr>
                ))}
                {lowStock.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-[#94A3B8] text-[13px]">No low stock medicines found.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === "outofstock" && (
            <table>
              <thead><tr>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Medicine</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Current Stock</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Status</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0] text-right">Actions</th>
              </tr></thead>
              <tbody>
                {outOfStock.map((m, i) => (
                  <tr key={i} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold text-[13px] text-gray-900">{m.name}</td>
                    <td className="px-4 py-3 font-mono text-[13px] font-bold text-[#DC2626]">{m.stock} units</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">
                        Depleted (0 Units)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Btn variant="primary" size="xs" onClick={() => onNavigate("purchase-orders")}>
                        <ShoppingBag size={12} /> Reorder Stock
                      </Btn>
                    </td>
                  </tr>
                ))}
                {outOfStock.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-12 text-[#94A3B8] text-[13px]">No out-of-stock medicines found.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {(activeTab === "expiring" || activeTab === "expired") && (
            <table>
              <thead><tr>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Medicine</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Batch No.</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Stock Left</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Expiry Date</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0] text-right">Urgency</th>
              </tr></thead>
              <tbody>
                {(activeTab === "expiring" ? expiringSoon : expiredMeds).map((m, i) => {
                  const daysLeft = Math.ceil((new Date(m.expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  const urg = urgencyLabel(daysLeft);
                  return (
                    <tr key={i} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3 font-semibold text-[13px] text-gray-900">{m.name}</td>
                      <td className="px-4 py-3 font-mono text-[11.5px] text-[#64748B] bg-gray-50 px-1.5 py-0.5 rounded w-max">{m.batch}</td>
                      <td className="px-4 py-3 font-mono text-[12.5px] font-semibold text-gray-800">{m.stock} units</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-gray-700">{m.expiry}</td>
                      <td className="px-4 py-3 text-right">
                        <span 
                          className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" 
                          style={{ background: urg.bg, color: urg.color }}
                        >
                          {urg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {(activeTab === "expiring" ? expiringSoon : expiredMeds).length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-[#94A3B8] text-[13px]">No matching medicines found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
