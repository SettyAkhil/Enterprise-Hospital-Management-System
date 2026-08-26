import React, { useEffect, useState } from "react";
import { Icon } from "./icons";
import { apiFetch, reportError } from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { Notice } from "../types";

type Stats = {
  active_admissions: number;
  documents: number;
  readmitted_patients: number;
  today: number;
  total: number;
};

type HospitalSummary = {
  bed_occupancy: { available: number; maintenance: number; occupancy_rate: number; occupied: number; total: number };
  revenue: { due: number; total: number };
};

type Analytics = {
  admission_status_distribution: { count: number; label: string }[];
};

type Appointment = {
  id: number;
  patient_name: string;
  department: string | null;
  doctor_name: string | null;
  appointment_date: string;
  status: string;
};

type Bed = { ward: string; status: string };

type ErVisit = { id: number; triage_category?: string | null; status?: string | null };

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  completed: { bg: "bg-[#F1F5F9]", text: "text-[#475569]", dot: "bg-[#64748B]", label: "Completed" },
  in_consultation: { bg: "bg-[#EFF6FF]", text: "text-[#2563EB]", dot: "bg-[#2563EB]", label: "In Progress" },
  checked_in: { bg: "bg-[#EFF6FF]", text: "text-[#2563EB]", dot: "bg-[#2563EB]", label: "Checked In" },
  scheduled: { bg: "bg-[#FFFBEB]", text: "text-[#B45309]", dot: "bg-[#D97706]", label: "Scheduled" },
  no_show: { bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]", dot: "bg-[#DC2626]", label: "No Show" },
  cancelled: { bg: "bg-[#F1F5F9]", text: "text-[#64748B]", dot: "bg-[#94A3B8]", label: "Cancelled" },
};

function statusMeta(status: string) {
  return STATUS_STYLE[status] || { bg: "bg-[#F1F5F9]", text: "text-[#475569]", dot: "bg-[#94A3B8]", label: status };
}

export default function Dashboard({ navigate }: { navigate: (m: string, s?: string) => void }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [summary, setSummary] = useState<HospitalSummary | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [erVisits, setErVisits] = useState<ErVisit[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      apiFetch<Stats>("/api/stats"),
      apiFetch<HospitalSummary>("/api/dashboard/hospital-summary"),
      apiFetch<Analytics>("/api/dashboard/analytics?days=7"),
      apiFetch<{ appointments: Appointment[] }>("/api/appointments"),
      apiFetch<{ beds: Bed[] }>("/api/beds"),
      apiFetch<{ visits: ErVisit[] }>("/api/er/visits"),
    ])
      .then(([statsRes, summaryRes, analyticsRes, appointmentsRes, bedsRes, erRes]) => {
        if (!active) return;
        setStats(statsRes);
        setSummary(summaryRes);
        setAnalytics(analyticsRes);
        setAppointments(appointmentsRes.appointments || []);
        setBeds(bedsRes.beds || []);
        setErVisits(erRes.visits || []);
      })
      .catch((error) => {
        if (active) reportError(setNotice, error, "Unable to load dashboard data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const appointmentsToday = appointments.filter((a) => a.appointment_date?.startsWith(todayKey));
  const appointmentsRemaining = appointmentsToday.filter(
    (a) => !["completed", "cancelled", "no_show"].includes(a.status),
  ).length;
  const recentAppointments = [...appointments]
    .sort((a, b) => (a.appointment_date < b.appointment_date ? 1 : -1))
    .slice(0, 5);

  const discharged = analytics?.admission_status_distribution.find((d) => d.label === "Discharged")?.count ?? 0;
  const erWaiting = erVisits.filter((v) => (v.status || "").toLowerCase().includes("wait")).length;

  const wardTotals = beds.reduce<Record<string, { total: number; occupied: number; available: number }>>(
    (acc, bed) => {
      const key = bed.ward || "Unassigned";
      if (!acc[key]) acc[key] = { total: 0, occupied: 0, available: 0 };
      acc[key].total += 1;
      if (bed.status === "Occupied") acc[key].occupied += 1;
      else if (bed.status === "Available") acc[key].available += 1;
      return acc;
    },
    {},
  );
  const wardRows = Object.entries(wardTotals).map(([ward, counts]) => ({ ward, ...counts }));

  const kpis = [
    {
      label: "TOTAL PATIENTS",
      value: stats?.total ?? "—",
      sub: `${stats?.today ?? 0} registered today`,
      action: "patients",
      actionLabel: "View All →",
    },
    {
      label: "APPOINTMENTS TODAY",
      value: appointmentsToday.length,
      sub: `${appointmentsRemaining} remaining`,
      action: "appointments",
      actionLabel: "Schedule →",
    },
    {
      label: "ACTIVE ADMISSIONS",
      value: stats?.active_admissions ?? "—",
      sub: summary ? `${summary.bed_occupancy.occupied}/${summary.bed_occupancy.total} beds occupied` : "",
      action: "inpatient",
      actionLabel: "Bed Board →",
    },
    {
      label: "DISCHARGED (7d)",
      value: discharged,
      sub: "past 7 days",
      action: "discharge",
      actionLabel: "View →",
    },
    {
      label: "ED WAITING",
      value: erWaiting,
      sub: `${erVisits.length} total ED census`,
      action: "er",
      actionLabel: "View ED →",
      critical: erWaiting > 0,
    },
    {
      label: "BEDS AVAILABLE",
      value: summary?.bed_occupancy.available ?? "—",
      sub: summary ? `${summary.bed_occupancy.occupancy_rate}% occupancy` : "",
      action: "beds",
      actionLabel: "View →",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F6F9] min-w-0 p-5 space-y-4 text-gray-900" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {notice && (
        <div className={`p-3 rounded-lg text-[12px] font-medium flex items-center justify-between ${notice.type === "error" ? "bg-red-50 text-red-800 border border-red-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}>
          <span>{notice.message}</span>
          <button className="underline" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      {/* ── Dashboard Title Row ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold text-[#0F172A] tracking-tight">Hospital Operations Dashboard</h1>
          <p className="text-[12px] text-[#64748B] mt-0.5">Live data from the connected hospital database</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#64748B]">{formatDateTime(new Date().toISOString())}</span>
          <button
            onClick={() => setRefreshKey((n) => n + 1)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#DDE2EC] rounded-lg text-[12px] font-medium text-gray-700 hover:bg-[#F8FAFC] shadow-xs transition-colors disabled:opacity-50">
            <Icon.Refresh /> {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── ED Capacity Alert (only shown when real ED waits exist) ── */}
      {erWaiting > 0 && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-4 py-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-[#D97706] text-base"><Icon.Alert /></span>
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-bold text-[#D97706]">ED Capacity Alert</span>
              <span className="text-[12px] text-[#475569]">{erWaiting} patient{erWaiting === 1 ? "" : "s"} currently waiting in the Emergency Department.</span>
            </div>
          </div>
          <button onClick={() => navigate("er")} className="text-[12.5px] font-bold text-[#D97706] hover:underline cursor-pointer">
            View ED
          </button>
        </div>
      )}

      {/* ── 6-Column KPI Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between hover:border-[#2563EB] transition-colors">
            <div>
              <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider">{k.label}</div>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className={`text-[24px] font-extrabold leading-tight ${k.critical ? "text-[#DC2626]" : "text-[#0F172A]"}`}>
                  {loading ? "—" : k.value}
                </span>
              </div>
              <div className="text-[11px] text-[#94A3B8] mt-0.5">{loading ? " " : k.sub}</div>
            </div>
            <button onClick={() => navigate(k.action)} className="text-[11.5px] font-semibold text-[#2563EB] hover:underline mt-3 text-left">
              {k.actionLabel}
            </button>
          </div>
        ))}
      </div>

      {/* ── Main Section: Department Census & Recent Appointments ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] gap-4">
        {/* Department Census */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-1">
            <span className="text-[12.5px] font-bold text-[#0F172A] tracking-wider uppercase">WARD CENSUS</span>
            <button onClick={() => navigate("beds")} className="text-[12px] font-semibold text-[#64748B] hover:text-[#2563EB]">
              Full View
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F1F5F9] text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="py-2.5 px-2">WARD</th>
                  <th className="py-2.5 px-2">OCCUPIED</th>
                  <th className="py-2.5 px-2">AVAILABLE</th>
                  <th className="py-2.5 px-2">TOTAL BEDS</th>
                  <th className="py-2.5 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                {!loading && wardRows.length === 0 && (
                  <tr><td colSpan={5} className="py-6 px-2 text-center text-[#94A3B8]">No beds configured yet.</td></tr>
                )}
                {wardRows.map((q) => (
                  <tr key={q.ward} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-2 font-bold text-[#0F172A]">{q.ward}</td>
                    <td className="py-3 px-2 font-medium text-[#334155]">{q.occupied}</td>
                    <td className="py-3 px-2 font-bold text-[#16A34A]">{q.available}</td>
                    <td className="py-3 px-2 font-medium text-[#334155]">{q.total}</td>
                    <td className="py-3 px-2 text-right">
                      <button onClick={() => navigate("beds")} className="text-[12px] font-semibold text-[#2563EB] hover:underline">
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Appointments */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-3">
              <span className="text-[12.5px] font-bold text-[#0F172A] tracking-wider uppercase">RECENT APPOINTMENTS</span>
              <button onClick={() => navigate("appointments")} className="text-[12px] font-semibold text-[#64748B] hover:text-[#2563EB]">
                All
              </button>
            </div>

            <div className="space-y-4">
              {!loading && recentAppointments.length === 0 && (
                <div className="text-[12px] text-[#94A3B8] text-center py-4">No appointments yet.</div>
              )}
              {recentAppointments.map((a) => {
                const meta = statusMeta(a.status);
                return (
                  <div key={a.id} className="flex items-center justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-[12px] text-[#64748B] font-medium mt-0.5 w-14 flex-shrink-0">
                        {new Date(a.appointment_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-[#0F172A] leading-tight truncate">{a.patient_name}</div>
                        <div className="text-[11.5px] text-[#64748B] mt-0.5 truncate">
                          {a.doctor_name || a.department || "Unassigned"}
                        </div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 ${meta.bg} ${meta.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={() => navigate("appointments")} className="text-[12px] font-semibold text-[#2563EB] hover:underline mt-6 text-left block">
            View Full Schedule →
          </button>
        </div>
      </div>
    </div>
  );
}
