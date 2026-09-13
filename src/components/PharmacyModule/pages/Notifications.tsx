import { usePharmacyData } from "../data/usePharmacyData";
import { useState } from "react";
import { Bell, CheckCheck, AlertTriangle, Clock, Info, X } from "lucide-react";

import PageHeader from "../components/PageHeader";

interface NotificationsProps { onNavigate: (page: string) => void }

const typeConfig = {
  critical: { icon: AlertTriangle, color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", dot: "#ef4444" },
  warning:  { icon: Clock, color: "#d97706", bg: "#fffbeb", border: "#fcd34d", dot: "#f59e0b" },
  info:     { icon: Info, color: "#4f46e5", bg: "#eff6ff", border: "#93c5fd", dot: "#60a5fa" },
};

export default function Notifications({ onNavigate }: NotificationsProps) {
  const {  notifications: initialNotifs } = usePharmacyData();
  const [notifs, setNotifs] = useState(initialNotifs);
  const [activeFilter, setActiveFilter] = useState("All");

  const markAll = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const markOne = (id: number) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const remove = (id: number) => setNotifs(prev => prev.filter(n => n.id !== id));

  const filtered = notifs.filter(n => {
    if (activeFilter === "Unread") return !n.read;
    if (activeFilter === "Critical") return n.type === "critical";
    if (activeFilter === "Warning") return n.type === "warning";
    if (activeFilter === "Info") return n.type === "info";
    return true;
  });

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Notifications" }]}
        title="Notification Center"
        description={`${unread} unread · ${notifs.length} total notifications`}
        actions={
          <button onClick={markAll} className="flex items-center gap-1.5 px-4 py-2 rounded-none border border-[#e5e7eb] bg-white text-[13px] text-[#374151] hover:bg-[#f9fafb] transition-colors">
            <CheckCheck size={14} /> Mark all as read
          </button>
        }
        onNavigate={onNavigate}
      />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["All", "Unread", "Critical", "Warning", "Info"].map(f => {
          const counts: Record<string, number> = {
            All: notifs.length,
            Unread: unread,
            Critical: notifs.filter(n=>n.type==="critical").length,
            Warning: notifs.filter(n=>n.type==="warning").length,
            Info: notifs.filter(n=>n.type==="info").length,
          };
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="flex items-center gap-2 px-4 py-2 rounded-none border text-[13px] font-medium transition-all"
              style={{ background: activeFilter === f ? "#111827" : "#fff", color: activeFilter === f ? "#fff" : "#374151", borderColor: activeFilter === f ? "#111827" : "#e5e7eb" }}
            >
              {f} <span className="text-[11px] px-1.5 py-0.5 rounded-none" style={{ background: activeFilter === f ? "rgba(255,255,255,0.2)" : "#f3f4f6", color: activeFilter === f ? "#fff" : "#6b7280" }}>{counts[f]}</span>
            </button>
          );
        })}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-none border border-[#e5e7eb] py-16 text-center">
            <div className="w-12 h-12 rounded-none flex items-center justify-center mx-auto mb-3" style={{ background: "#f3f4f6" }}>
              <Bell size={22} className="text-[#9ca3af]" />
            </div>
            <p className="font-medium text-[#374151]">No notifications</p>
            <p className="text-[12px] text-[#9ca3af] mt-1">You're all caught up!</p>
          </div>
        ) : filtered.map(n => {
          const cfg = typeConfig[n.type as keyof typeof typeConfig];
          return (
            <div
              key={n.id}
              className="bg-white rounded-none border overflow-hidden transition-all hover:shadow-sm"
              style={{ borderColor: !n.read ? cfg.border : "#e5e7eb", borderLeftWidth: !n.read ? 4 : 1 }}
            >
              <div className="flex items-start p-4 gap-4">
                <div className="w-10 h-10 rounded-none flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                  <cfg.icon size={16} style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-[14px] font-semibold ${!n.read ? "text-[#111827]" : "text-[#374151]"}`}>{n.title}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[11px] text-[#9ca3af] whitespace-nowrap">{n.time}</span>
                      {!n.read && <div className="w-2 h-2 rounded-none" style={{ background: cfg.dot }} />}
                    </div>
                  </div>
                  <p className="text-[13px] text-[#6b7280] mt-1">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {!n.read && (
                      <button onClick={() => markOne(n.id)} className="text-[12px] font-medium" style={{ color: "#4f46e5" }}>Mark as read</button>
                    )}
                    <button className="text-[12px] font-medium text-[#6b7280] hover:text-[#111827] transition-colors">View details</button>
                    <button onClick={() => remove(n.id)} className="ml-auto p-1 rounded hover:bg-[#fef2f2] text-[#9ca3af] hover:text-[#dc2626] transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
