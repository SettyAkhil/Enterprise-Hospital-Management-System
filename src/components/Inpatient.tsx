import React, { useState } from "react";
import { StatusBadge, Btn, Card } from "./shared";

type BedStatus = "Occupied" | "Available" | "Cleaning" | "Reserved" | "Isolation" | "Maintenance";

interface Bed {
  id: string;
  patient?: string;
  age?: number;
  provider?: string;
  los?: string;
  status: BedStatus;
}

const BED_DATA: { floor: string; unit: string; rooms: { room: string; beds: Bed[] }[] }[] = [
  {
    floor: "3rd Floor", unit: "3N — Medical/Surgical",
    rooms: [
      { room: "301", beds: [{ id: "A", patient: "John Smith", age: 41, provider: "Dr. Anderson", los: "2d", status: "Occupied" }, { id: "B", status: "Available" }] },
      { room: "302", beds: [{ id: "A", patient: "Mary Jones", age: 53, provider: "Dr. Lee", los: "4d", status: "Occupied" }, { id: "B", status: "Cleaning" }] },
      { room: "303", beds: [{ id: "A", status: "Available" }, { id: "B", patient: "Robert Lee", age: 66, provider: "Dr. Patel", los: "1d", status: "Occupied" }] },
      { room: "304", beds: [{ id: "A", patient: "Helen Park", age: 72, provider: "Dr. Anderson", los: "3d", status: "Isolation" }, { id: "B", status: "Isolation" }] },
      { room: "305", beds: [{ id: "A", status: "Reserved" }, { id: "B", status: "Available" }] },
      { room: "306", beds: [{ id: "A", patient: "Frank Torres", age: 55, provider: "Dr. Chen", los: "1d", status: "Occupied" }, { id: "B", status: "Maintenance" }] },
    ]
  },
  {
    floor: "4th Floor", unit: "4S — Medical/Surgical",
    rooms: [
      { room: "401", beds: [{ id: "A", patient: "Sandra Hill", age: 48, provider: "Dr. Park", los: "2d", status: "Occupied" }, { id: "B", status: "Available" }] },
      { room: "402", beds: [{ id: "A", status: "Available" }, { id: "B", status: "Available" }] },
      { room: "403", beds: [{ id: "A", patient: "Marcus Kim", age: 43, provider: "Dr. Park", los: "5d", status: "Occupied" }, { id: "B", patient: "Lisa Webb", age: 61, provider: "Dr. Lee", los: "2d", status: "Occupied" }] },
      { room: "404", beds: [{ id: "A", status: "Cleaning" }, { id: "B", status: "Reserved" }] },
    ]
  },
  {
    floor: "ICU", unit: "Medical ICU — 14 beds",
    rooms: [
      { room: "ICU-1", beds: [{ id: "", patient: "Thomas Reed", age: 68, provider: "Dr. Shah", los: "1d", status: "Occupied" }] },
      { room: "ICU-2", beds: [{ id: "", patient: "Ann Martinez", age: 52, provider: "Dr. Shah", los: "2d", status: "Occupied" }] },
      { room: "ICU-3", beds: [{ id: "", status: "Available" }] },
      { room: "ICU-4", beds: [{ id: "", patient: "James Liu", age: 35, provider: "Dr. Chen", los: "3d", status: "Occupied" }] },
    ]
  },
];

const STATUS_STYLE: Record<BedStatus, { bg: string; border: string; text: string }> = {
  Occupied:    { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" },
  Available:   { bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D" },
  Cleaning:    { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
  Reserved:    { bg: "#F5F3FF", border: "#DDD6FE", text: "#6D28D9" },
  Isolation:   { bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C" },
  Maintenance: { bg: "#F9FAFB", border: "#E5E7EB", text: "#6B7280" },
};

function BedCard({ bed, room }: { bed: Bed; room: string }) {
  const s = STATUS_STYLE[bed.status];
  return (
    <div style={{ backgroundColor: s.bg, borderColor: s.border }} className="border rounded p-2.5 min-h-[80px] flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-[#64748B]">{room}{bed.id ? `-${bed.id}` : ""}</span>
        <span style={{ color: s.text }} className="text-[10.5px] font-semibold">{bed.status}</span>
      </div>
      {bed.patient ? (
        <div>
          <div className="text-[12.5px] font-semibold text-gray-900 leading-tight">{bed.patient}</div>
          <div className="text-[11px] text-[#64748B] mt-0.5">{bed.age}y · {bed.provider}</div>
          <div className="text-[11px] text-[#94A3B8]">LOS: {bed.los}</div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span style={{ color: s.text }} className="text-[11px] font-medium">{bed.status}</span>
        </div>
      )}
    </div>
  );
}

export default function Inpatient() {
  const [selectedUnit, setSelectedUnit] = useState(0);
  const unit = BED_DATA[selectedUnit];

  const allBeds = BED_DATA.flatMap(u => u.rooms.flatMap(r => r.beds));
  const totalBeds = allBeds.length;
  const occupied = allBeds.filter(b => b.status === "Occupied").length;
  const available = allBeds.filter(b => b.status === "Available").length;
  const cleaning = allBeds.filter(b => b.status === "Cleaning").length;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Inpatient Bed Board</h1>
          <p className="text-[11.5px] text-[#64748B]">General Hospital · All Units · Real-time occupancy</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" size="sm">Assign Bed</Btn>
          <Btn variant="primary" size="sm">+ Admission</Btn>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center gap-8 text-[12.5px]">
        <div><span className="font-mono font-semibold text-gray-900 text-lg">{totalBeds}</span> <span className="text-[#64748B]">Total Beds</span></div>
        <div><span className="font-mono font-semibold text-[#1B4FD8] text-lg">{occupied}</span> <span className="text-[#64748B]">Occupied</span></div>
        <div><span className="font-mono font-semibold text-[#16A34A] text-lg">{available}</span> <span className="text-[#64748B]">Available</span></div>
        <div><span className="font-mono font-semibold text-[#D97706] text-lg">{cleaning}</span> <span className="text-[#64748B]">Cleaning</span></div>
        <div className="ml-auto flex items-center gap-3 text-[11.5px]">
          {(["Occupied", "Available", "Cleaning", "Reserved", "Isolation", "Maintenance"] as BedStatus[]).map(s => {
            const st = STATUS_STYLE[s];
            return (
              <span key={s} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm border" style={{ backgroundColor: st.bg, borderColor: st.border }} />
                <span className="text-[#64748B]">{s}</span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="p-5">
        {/* Unit selector */}
        <div className="flex gap-2 mb-4">
          {BED_DATA.map((u, i) => (
            <button key={i} onClick={() => setSelectedUnit(i)}
              className={`px-4 py-2 text-[12.5px] font-medium rounded border transition-colors
                ${selectedUnit === i ? "bg-[#1B4FD8] text-white border-[#1B4FD8]" : "bg-white text-[#64748B] border-[#DDE2EC] hover:border-[#94A3B8]"}`}>
              {u.unit}
            </button>
          ))}
        </div>

        <div className="bg-white border border-[#DDE2EC] rounded p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">{unit.floor} — {unit.unit}</h3>
            <span className="text-[11.5px] text-[#64748B]">
              {unit.rooms.flatMap(r => r.beds).filter(b => b.status === "Occupied").length} occupied ·{" "}
              {unit.rooms.flatMap(r => r.beds).filter(b => b.status === "Available").length} available
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {unit.rooms.map((room) =>
              room.beds.map((bed, bi) => (
                <BedCard key={`${room.room}-${bed.id}-${bi}`} bed={bed} room={room.room} />
              ))
            )}
          </div>
        </div>

        {/* Pending Admissions */}
        <div className="mt-4 bg-white border border-[#DDE2EC] rounded">
          <div className="px-4 py-2.5 border-b border-[#DDE2EC] flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Pending Bed Assignments</span>
            <span className="bg-[#FEF3C7] text-[#B45309] text-[11px] font-semibold px-2 py-0.5 rounded">3 awaiting</span>
          </div>
          <div className="p-3 space-y-2">
            {[
              { patient: "Patricia Okonkwo", from: "ED Bay 4", time: "10:15 AM", type: "Medical Admission", provider: "Dr. Williams" },
              { patient: "Kevin Park", from: "ED Bay 9", time: "09:45 AM", type: "Surgical Admission", provider: "Dr. Adams" },
              { patient: "George Watts", from: "ED Bay 11", time: "10:30 AM", type: "Cardiac Monitoring", provider: "Dr. Chen" },
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 border border-[#DDE2EC] rounded hover:border-[#1B4FD8] transition-colors">
                <div className="flex-1">
                  <div className="text-[12.5px] font-semibold text-gray-800">{p.patient}</div>
                  <div className="text-[11.5px] text-[#64748B]">{p.from} · {p.type} · {p.provider}</div>
                </div>
                <span className="font-mono text-[11px] text-[#94A3B8]">{p.time}</span>
                <Btn variant="primary" size="xs">Assign Bed</Btn>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
