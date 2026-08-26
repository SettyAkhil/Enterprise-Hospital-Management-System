import React, { useState, useEffect } from "react";
import { StatusBadge, Btn, Card } from "./shared";
import { apiFetch } from "../lib/api";

type BedStatus = "Occupied" | "Available" | "Cleaning" | "Reserved" | "Isolation" | "Maintenance";

interface Bed {
  id: string;
  patient?: string;
  age?: number;
  provider?: string;
  los?: string;
  status: BedStatus;
}

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
  const [bedData, setBedData] = useState<{ floor: string; unit: string; rooms: { room: string; beds: Bed[] }[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/beds")
      .then(res => {
        if (!res.beds) return;
        
        // Group beds by ward and then by room_no
        const unitsMap: Record<string, any> = {};
        
        res.beds.forEach((b: any) => {
          const unitName = b.ward || "General";
          if (!unitsMap[unitName]) {
            unitsMap[unitName] = { floor: unitName, unit: unitName, rooms: {} };
          }
          
          const roomNo = b.room_no || "Unknown";
          if (!unitsMap[unitName].rooms[roomNo]) {
            unitsMap[unitName].rooms[roomNo] = { room: roomNo, beds: [] };
          }
          
          let los = "";
          if (b.admission_date) {
            const adDate = new Date(b.admission_date);
            const diffDays = Math.floor((new Date().getTime() - adDate.getTime()) / (1000 * 3600 * 24));
            los = diffDays + "d";
          }

          unitsMap[unitName].rooms[roomNo].beds.push({
            id: b.bed_no || b.id.toString(),
            patient: b.patient_name ? `${b.patient_name} ${b.patient_last_name || ""}` : undefined,
            age: b.patient_age,
            provider: "Unknown", // API doesn't return provider in list_beds
            los: los,
            status: b.status as BedStatus
          });
        });
        
        const structuredData = Object.values(unitsMap).map(u => ({
          ...u,
          rooms: Object.values(u.rooms)
        }));
        
        setBedData(structuredData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const unit = bedData.length > 0 ? bedData[selectedUnit] : null;

  const allBeds = bedData.flatMap(u => u.rooms.flatMap((r: any) => r.beds));
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
        <div className="flex bg-white border-b border-[#DDE2EC]">
          {bedData.map((u, i) => (
            <button key={i} onClick={() => setSelectedUnit(i)}
              className={`px-6 py-2.5 text-[12.5px] font-medium border-b-2 transition-colors ${selectedUnit === i ? "border-[#1B4FD8] text-[#1B4FD8]" : "border-transparent text-[#64748B] hover:text-gray-900"}`}>
              {u.unit}
            </button>
          ))}
        </div>

        <div className="bg-white border border-[#DDE2EC] rounded p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">{unit?.floor} — {unit?.unit}</h3>
            <span className="text-[11.5px] text-[#64748B]">
              {unit?.rooms.flatMap(r => r.beds).filter(b => b.status === "Occupied").length} occupied ·{" "}
              {unit?.rooms.flatMap(r => r.beds).filter(b => b.status === "Available").length} available
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {unit?.rooms.map((room) =>
              room.beds.map((bed, bi) => (
                <BedCard key={`${room.room}-${bed.id}-${bi}`} bed={bed} room={room.room} />
              ))
            ) || <div className="text-[#64748B] text-sm">No beds available</div>}
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
