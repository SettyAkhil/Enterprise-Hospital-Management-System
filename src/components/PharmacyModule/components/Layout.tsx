import { usePharmacyData } from "../data/usePharmacyData";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, ShoppingCart, ClipboardList, Scan, Pill, Tag, Truck,
  ShoppingBag, Package, BookOpen, ArrowLeftRight, AlertTriangle,
  RotateCcw, BarChart3, Bell, Users, Settings, LogOut, ChevronLeft,
  ChevronRight, Search, Calendar, X, Menu, Activity, FileText,
  Shield, Database
} from "lucide-react";


const navItems = [
  { group: "Main", items: [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "dispensing", icon: ShoppingCart, label: "Dispensing & Billing" },
    { id: "prescriptions", icon: ClipboardList, label: "Prescription Queue", badge: 4 },
    { id: "ocr", icon: Scan, label: "OCR Verification" },
  ]},
  { group: "Inventory", items: [
    { id: "medicines", icon: Pill, label: "Medicine Master" },
    { id: "categories", icon: Tag, label: "Category Master" },
    { id: "suppliers", icon: Truck, label: "Suppliers" },
  ]},
  { group: "Purchasing", items: [
    { id: "purchase-orders", icon: ShoppingBag, label: "Purchase Orders" },
    { id: "grn", icon: Package, label: "GRN / Receiving" },
  ]},
  { group: "Stock", items: [
    { id: "inventory-ledger", icon: BookOpen, label: "Inventory Ledger" },
    { id: "stock-transfers", icon: ArrowLeftRight, label: "Stock Transfers" },
    { id: "expiry-low-stock", icon: AlertTriangle, label: "Expiry & Low Stock", badge: 24 },
  ]},
  { group: "Sales", items: [
    { id: "sales-returns", icon: RotateCcw, label: "Sales & Returns" },
    { id: "reports", icon: BarChart3, label: "Reports" },
  ]},
  { group: "Admin", items: [
    { id: "notifications", icon: Bell, label: "Notifications", badge: 4 },
    { id: "users", icon: Users, label: "User Management" },
    { id: "audit-log", icon: Shield, label: "Audit Log" },
    { id: "settings", icon: Settings, label: "Settings" },
  ]},
];

interface LayoutProps {
  activePage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
  onGlobalSearch: () => void;
}

export default function Layout({ activePage, onNavigate, children, onGlobalSearch }: LayoutProps) {
  const {  notifications  } = usePharmacyData();
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [now, setNow] = useState(new Date());
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="flex h-full overflow-hidden bg-[#f3f4f6]">
      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden"
        style={{
          width: collapsed ? 64 : 240,
          background: "var(--sidebar-bg)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[#1f2937]" style={{ minHeight: 64 }}>
          <div className="w-8 h-8 rounded-none flex items-center justify-center flex-shrink-0" style={{ background: "#16a34a" }}>
            <Activity size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white font-semibold text-sm leading-tight truncate">Pharmacy System</p>
              <p className="text-[11px]" style={{ color: "#6b7280" }}>Main Branch</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {navItems.map((group) => (
            <div key={group.group} className="mb-2">
              {!collapsed && (
                <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#4b5563" }}>
                  {group.group}
                </p>
              )}
              {group.items.map((item) => {
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-none text-left transition-all duration-150 relative group"
                    style={{
                      background: active ? "#16a34a" : "transparent",
                      color: active ? "#fff" : "#9ca3af",
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#1f2937"; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon size={16} className="flex-shrink-0" />
                    {!collapsed && (
                      <span className="text-[13px] font-medium truncate flex-1">{item.label}</span>
                    )}
                    {!collapsed && "badge" in item && item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-none" style={{ background: active ? "rgba(255,255,255,0.2)" : "#dc2626", color: "#fff" }}>
                        {item.badge}
                      </span>
                    )}
                    {collapsed && "badge" in item && item.badge && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-none bg-red-500" />
                    )}
                    {collapsed && (
                      <div className="absolute left-full ml-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-xl">
                          {item.label}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User + collapse */}
        <div className="border-t border-[#1f2937] p-2">
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-2 rounded-none mb-1" style={{ color: "#9ca3af" }}>
              <div className="w-7 h-7 rounded-none flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "#16a34a", color: "#fff" }}>
                AD
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-[12px] font-medium text-white truncate">Administrator</p>
                <p className="text-[11px]" style={{ color: "#6b7280" }}>Pharmacist</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-2 rounded-none transition-colors"
            style={{ color: "#6b7280" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#9ca3af"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6b7280"; }}
          >
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={14} /><span className="ml-1 text-xs">Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center gap-4 px-6 bg-white border-b border-[#e5e7eb]" style={{ height: 64, flexShrink: 0 }}>
          {/* Global search */}
          <button
            onClick={onGlobalSearch}
            className="flex items-center gap-2 px-3 py-2 rounded-none border border-[#e5e7eb] text-[#9ca3af] hover:border-[#4f46e5] hover:text-[#4f46e5] transition-all flex-1 max-w-sm text-left"
            style={{ fontSize: 13 }}
          >
            <Search size={14} />
            <span>Search medicines, patients, prescriptions…</span>
            <span className="ml-auto text-[11px] font-medium px-1.5 py-0.5 rounded border border-[#e5e7eb] bg-[#f9fafb] text-[#6b7280]">Ctrl+K</span>
          </button>

          <div className="flex items-center gap-1 ml-auto">
            {/* Date / time */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-none text-[#6b7280]" style={{ fontSize: 12 }}>
              <Calendar size={13} />
              <span>{dateStr} · {timeStr}</span>
            </div>

            {/* Branch badge */}
            <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-none text-[12px] font-medium" style={{ background: "#f0fdf4", color: "#15803d" }}>
              Main Branch
            </span>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-none hover:bg-[#f3f4f6] transition-colors"
              >
                <Bell size={18} className="text-[#4b5563]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-none bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-none shadow-2xl border border-[#e5e7eb] z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#f3f4f6]">
                    <p className="font-semibold text-[14px] text-[#111827]">Notifications</p>
                    <button onClick={() => onNavigate("notifications")} className="text-xs font-medium" style={{ color: "#4f46e5" }}>View all</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.slice(0, 5).map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b border-[#f9fafb] hover:bg-[#f9fafb] transition-colors ${!n.read ? "bg-blue-50/30" : ""}`}>
                        <div className="flex gap-3">
                          <div className={`w-2 h-2 rounded-none mt-1.5 flex-shrink-0 ${n.type === "critical" ? "bg-red-500" : n.type === "warning" ? "bg-amber-500" : "bg-blue-400"}`} />
                          <div>
                            <p className="text-[13px] font-medium text-[#111827]">{n.title}</p>
                            <p className="text-[12px] text-[#6b7280] mt-0.5">{n.message}</p>
                            <p className="text-[11px] text-[#9ca3af] mt-1">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User avatar */}
            <button className="flex items-center gap-2 ml-1 p-1.5 rounded-none hover:bg-[#f3f4f6] transition-colors">
              <div className="w-8 h-8 rounded-none flex items-center justify-center text-xs font-bold" style={{ background: "#16a34a", color: "#fff" }}>AD</div>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
