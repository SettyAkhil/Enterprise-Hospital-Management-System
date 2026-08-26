import React, { useEffect, useState } from 'react';
import { Icon } from './icons';
import { apiFetch, reportError } from '../lib/api';
import type { Notice } from '../types';

type Doctor = { id: number; doctor_name: string; department: string; consultation_fee: number | string; review_fee: number | string; status: string };
type ScheduleRow = { id: number; doctor_name: string; department: string | null; schedule_date: string; start_time: string; end_time: string; slot_capacity: number | null; status: string; notes: string | null };

const DAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function weekDates() {
  const monday = startOfWeek(new Date());
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function toHour(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h + (m || 0) / 60;
}

export default function DoctorScheduling() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formDay, setFormDay] = useState(0);
  const [formStart, setFormStart] = useState(9);
  const [formEnd, setFormEnd] = useState(11);
  const [formNotes, setFormNotes] = useState('');

  const days = weekDates();

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch<{ doctors: Doctor[] }>("/api/op/doctors"),
      apiFetch<{ schedules: ScheduleRow[] }>("/api/op/doctor-schedules"),
    ])
      .then(([docRes, schedRes]) => {
        const docs = docRes.doctors || [];
        setDoctors(docs);
        setSchedules(schedRes.schedules || []);
        setSelectedDoctor((prev) => prev || docs[0]?.doctor_name || "");
      })
      .catch((error) => reportError(setNotice, error, "Unable to load scheduling data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const doctor = doctors.find((d) => d.doctor_name === selectedDoctor);
  const weekIso = days.map((d) => d.toISOString().slice(0, 10));
  const doctorSchedules = schedules.filter((s) => s.doctor_name === selectedDoctor && weekIso.includes(s.schedule_date.slice(0, 10)));

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    setSaving(true);
    try {
      await apiFetch("/api/op/doctor-schedules", {
        method: "POST",
        body: JSON.stringify({
          doctor_name: selectedDoctor,
          department: doctor?.department,
          schedule_date: weekIso[formDay],
          start_time: `${String(formStart).padStart(2, "0")}:00`,
          end_time: `${String(formEnd).padStart(2, "0")}:00`,
          notes: formNotes || undefined,
        }),
      });
      setNotice({ type: "success", message: "Shift added." });
      setShowAddModal(false);
      setFormNotes('');
      load();
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to add shift.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/op/doctor-schedules/${id}`, { method: "DELETE" });
      load();
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to remove shift.");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] relative">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Doctor Scheduling</h1>
          <p className="text-[12.5px] text-[#64748B]">Live physician shifts from the connected database.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} disabled={!selectedDoctor}
          className="h-8 px-3 bg-[#1B4FD8] text-white text-[12px] font-medium rounded hover:bg-[#1740B4] transition-colors flex items-center gap-2 disabled:opacity-50">
          <Icon.Plus /> Add Shift
        </button>
      </div>

      {notice && (
        <div className={`mx-6 mt-3 p-3 rounded-lg text-[12px] font-medium flex items-center justify-between flex-shrink-0 ${notice.type === "error" ? "bg-red-50 text-red-800 border border-red-200" : notice.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}>
          <span>{notice.message}</span>
          <button className="underline" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 flex gap-6 max-w-7xl mx-auto w-full relative">
        <div className="w-80 flex flex-col gap-6">
          <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm p-4">
            <h2 className="text-[13px] font-semibold text-gray-900 mb-4">Select Physician</h2>
            <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}
              className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] px-3 py-2 mb-4 focus:outline-none focus:border-[#1B4FD8]">
              {doctors.length === 0 && <option value="">No doctors on record</option>}
              {doctors.map((d) => <option key={d.id} value={d.doctor_name}>{d.doctor_name} ({d.department})</option>)}
            </select>

            {doctor && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[12.5px]">
                  <span className="text-[#64748B]">Department</span>
                  <span className="font-semibold text-gray-900">{doctor.department}</span>
                </div>
                <div className="flex justify-between items-center text-[12.5px]">
                  <span className="text-[#64748B]">Consultation Fee</span>
                  <span className="font-semibold text-gray-900">${Number(doctor.consultation_fee || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[12.5px]">
                  <span className="text-[#64748B]">Status</span>
                  <span className={`font-semibold capitalize ${doctor.status === "available" || doctor.status === "active" ? "text-green-600" : "text-amber-600"}`}>{doctor.status}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-white border border-[#DDE2EC] rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-[#DDE2EC] flex justify-between items-center bg-[#F8FAFC]">
            <h2 className="text-[15px] font-bold text-gray-900">
              {days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {days[4].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </h2>
          </div>

          <div className="flex-1 overflow-auto bg-gray-50 flex">
            <div className="w-16 border-r border-[#DDE2EC] bg-white flex flex-col text-[11px] text-[#94A3B8] font-mono items-center pt-10">
              {DAY_HOURS.map(h => (
                <div key={h} className="h-16 relative w-full text-center">
                  <span className="absolute -top-2 left-0 right-0">{h}:00</span>
                </div>
              ))}
            </div>

            <div className="flex-1 grid grid-cols-5 divide-x divide-[#DDE2EC]">
              {days.map((day, i) => (
                <div key={i} className="flex flex-col relative">
                  <div className="h-10 border-b border-[#DDE2EC] bg-white flex items-center justify-center text-[12.5px] font-semibold text-gray-900 sticky top-0 z-10">
                    {day.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                  </div>
                  <div className="relative h-[704px] bg-white bg-[linear-gradient(#F1F5F9_1px,transparent_1px)] bg-[size:100%_64px]">
                    {doctorSchedules.filter((s) => s.schedule_date.slice(0, 10) === weekIso[i]).map((shift) => {
                      const startH = toHour(shift.start_time);
                      const endH = toHour(shift.end_time);
                      const top = Math.max(0, (startH - 8) * 64);
                      const height = Math.max(24, (endH - startH) * 64);
                      const leave = shift.status === "leave";
                      return (
                        <div key={shift.id}
                          className={`absolute left-1 right-1 border rounded-md p-2 shadow-sm flex flex-col overflow-hidden ${leave ? "bg-[#F1F5F9] border-[#E2E8F0] text-[#64748B]" : "bg-[#DBEAFE] border-[#BFDBFE] text-[#1E3A8A]"}`}
                          style={{ top, height }}>
                          <div className="text-[11px] font-bold">{shift.start_time}–{shift.end_time}</div>
                          {shift.notes && <div className="text-[10px] opacity-80 mt-0.5">{shift.notes}</div>}
                          <button className="absolute top-1 right-1 text-[#94A3B8] hover:text-[#EF4444]" onClick={(e) => { e.stopPropagation(); void handleDelete(shift.id); }}>
                            <Icon.X />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="absolute inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-[480px] max-w-full overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#DDE2EC] flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-semibold text-gray-900">Add Shift — {selectedDoctor}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#94A3B8] hover:text-gray-900"><Icon.X /></button>
            </div>
            <form onSubmit={(e) => void handleAddShift(e)} className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">Day</label>
                  <select value={formDay} onChange={(e) => setFormDay(Number(e.target.value))} className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] px-3 py-2 focus:outline-none focus:border-[#1B4FD8]">
                    {days.map((d, i) => <option key={i} value={i}>{d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">Start Time</label>
                  <select value={formStart} onChange={(e) => setFormStart(Number(e.target.value))} className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] px-3 py-2 focus:outline-none focus:border-[#1B4FD8]">
                    {DAY_HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">End Time</label>
                <select value={formEnd} onChange={(e) => setFormEnd(Number(e.target.value))} className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] px-3 py-2 focus:outline-none focus:border-[#1B4FD8]">
                  {DAY_HOURS.filter(h => h > formStart).map(h => <option key={h} value={h}>{h}:00</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <input type="text" placeholder="e.g. Ward 3N, OR 2, OPD Consults" value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] px-3 py-2 focus:outline-none focus:border-[#1B4FD8]" />
              </div>
              <div className="flex gap-3 pt-2 mt-2 border-t border-[#DDE2EC]">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 h-9 bg-white border border-[#DDE2EC] text-gray-700 rounded text-[13px] font-medium hover:bg-[#F8FAFC]">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 h-9 bg-[#1B4FD8] text-white rounded text-[13px] font-medium hover:bg-[#1740B4] disabled:opacity-50">{saving ? "Saving…" : "Add Shift"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
