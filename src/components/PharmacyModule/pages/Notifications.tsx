import { usePharmacyData } from "../data/usePharmacyData";
import { useState } from "react";
import { Bell, CheckCheck, AlertTriangle, Clock, Info, X } from "lucide-react";

import PageHeader from "../components/PageHeader";

interface NotificationsProps { onNavigate: (page: string) => void }

const typeConfig = {
  critical: { icon: AlertTriangle, color: "#dc2626", bg: "#FEE2E2", border: "#fca5a5", dot: "#ef4444" },
  warning:  { icon: Clock, color: "#d97706", bg: "#FEF3C7", border: "#fcd34d", dot: "#f59e0b" },
  info:     { icon: Info, color: "#1B4FD8", bg: "#E8EDF5", border: "#93c5fd", dot: "#60a5fa" },
};
import { PharmacyDatabase } from "../../../services/pharmacyDb";

export default function Notifications({ onNavigate }: NotificationsProps) {
  const { notifications: notifs } = usePharmacyData();
  const [activeFilter, setActiveFilter] = useState("All");

  const markAll = () => {
    notifs.forEach(n => PharmacyDatabase.updateNotification(n.id, { read: true }));
  };
  const markOne = (id: string) => {
    PharmacyDatabase.updateNotification(id, { read: true });
  };
  const remove = (id: string) => {
    PharmacyDatabase.deleteNotification(id);
  };

  const filtered = notifs.filter(n => {
    if (activeFilter === "Unread") return !n.read;
    if (activeFilter === "Critical") return n.type === "critical";
    if (activeFilter === "Warning") return n.type === "warning";
    if (activeFilter === "Info") return n.type === "info";
    return true;
  });

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F6F9]">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Notifications" }]}
        title={
          <div className="flex items-center gap-2" >
            Notification Center
            <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              Live
            </span>
          </div>
        }
        description={`${unread} unread · ${notifs.length} total notifications recorded`}
        actions={
          <button 
            onClick={markAll} 
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] shadow-sm transition-colors"
          >
            <CheckCheck size={14} className="text-[#64748B]" /> Mark all as read
          </button>
        }
        onNavigate={onNavigate}
        icon={Bell} iconBg="bg-blue-600"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Filters */}
        <div className="flex bg-[#E2E8F0]/60 p-1 rounded-xl border border-[#CBD5E1]/60 w-fit">
          {["All", "Unread", "Critical", "Warning", "Info"].map(f => {
            const counts: Record<string, number> = {
              All: notifs.length,
              Unread: unread,
              Critical: notifs.filter(n=>n.type==="critical").length,
              Warning: notifs.filter(n=>n.type==="warning").length,
              Info: notifs.filter(n=>n.type==="info").length,
            };
            const active = activeFilter === f;
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                  active 
                    ? "bg-white text-[#0F1624] shadow-sm" 
                    : "text-[#64748B] hover:text-[#0F1624]"
                }`}
              >
                {f} 
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                  active ? "bg-[#F1F5F9] text-[#0F1624]" : "bg-white/80 text-[#64748B]"
                }`}>
                  {counts[f]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Notification list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E2E8F0] py-16 text-center shadow-sm">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 bg-[#F1F5F9]">
                <Bell size={22} className="text-[#94A3B8]" />
              </div>
              <p className="font-bold text-[#0F1624] text-[15px]">No notifications</p>
              <p className="text-[12px] text-[#94A3B8] mt-1">You are all caught up with your clinical tasks!</p>
            </div>
          ) : filtered.map(n => {
            const cfg = typeConfig[n.type as keyof typeof typeConfig];
            return (
              <div
                key={n.id}
                className="bg-white rounded-xl border overflow-hidden transition-all hover:shadow-sm shadow-sm"
                style={{ borderColor: !n.read ? cfg.border : "#E2E8F0", borderLeftWidth: !n.read ? 4 : 1 }}
              >
                <div className="flex items-start p-4 gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                    <cfg.icon size={16} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-[14px] font-bold ${!n.read ? "text-[#0F1624]" : "text-[#475569]"}`}>{n.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-medium text-[#94A3B8] whitespace-nowrap">{n.time}</span>
                        {!n.read && <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />}
                      </div>
                    </div>
                    <p className="text-[13px] text-[#64748B] mt-1 leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-3 mt-3">
                      {!n.read && (
                        <button onClick={() => markOne(n.id)} className="text-[12px] font-bold text-[#1B4FD8] hover:underline">Mark as read</button>
                      )}
                      <button onClick={() => remove(n.id)} className="ml-auto p-1.5 rounded-lg hover:bg-[#FEE2E2] text-[#94A3B8] hover:text-[#dc2626] transition-colors" title="Dismiss">
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
