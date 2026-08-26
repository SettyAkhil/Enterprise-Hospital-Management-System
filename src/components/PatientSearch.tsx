import React, { useState, useEffect } from "react";
import { StatusBadge, Btn, Input } from "./shared";
import { Icon } from "./icons";
import { apiFetch } from "../lib/api";

const PATIENTS = [
  { initials: "JS", name: "John Smith", mrn: "100245", dob: "04/12/1985", age: 41, sex: "M", provider: "Dr. Anderson", status: "Inpatient", location: "Room 204", phone: "(617) 555-0182", ins: "BlueCross PPO", alerts: ["Allergy: Penicillin"] },
  { initials: "MJ", name: "Mary Jones", mrn: "100246", dob: "09/30/1972", age: 53, sex: "F", provider: "Dr. Lee", status: "Inpatient", location: "Room 312", phone: "(617) 555-0291", ins: "Aetna HMO", alerts: [] },
  { initials: "TR", name: "Thomas Reed", mrn: "100301", dob: "07/14/1958", age: 68, sex: "M", provider: "Dr. Patel", status: "Critical", location: "ICU Bed 3", phone: "(617) 555-0344", ins: "Medicare", alerts: ["Allergy: Sulfa", "DNR on file"] },
  { initials: "SC", name: "Sarah Connelly", mrn: "100289", dob: "02/28/1991", age: 35, sex: "F", provider: "Dr. Adams", status: "Active", location: "Clinic 101", phone: "(617) 555-0118", ins: "United PPO", alerts: [] },
  { initials: "EV", name: "Elena Vasquez", mrn: "100198", dob: "11/05/1968", age: 57, sex: "F", provider: "Dr. Chen", status: "Pending", location: "ED Bay 7", phone: "(617) 555-0227", ins: "Medicaid", alerts: ["Allergy: Latex"] },
  { initials: "MK", name: "Marcus Kim", mrn: "100377", dob: "05/17/1983", age: 43, sex: "M", provider: "Dr. Park", status: "Inpatient", location: "Room 418", phone: "(617) 555-0461", ins: "Cigna PPO", alerts: [] },
  { initials: "DW", name: "Diane Walsh", mrn: "100142", dob: "12/30/1945", age: 80, sex: "F", provider: "Dr. Anderson", status: "Active", location: "Clinic 203", phone: "(617) 555-0085", ins: "Medicare", alerts: ["Fall Risk"] },
  { initials: "RG", name: "Robert Garcia", mrn: "100422", dob: "08/08/1997", age: 29, sex: "M", provider: "Dr. Lee", status: "Active", location: "Clinic 102", phone: "(617) 555-0539", ins: "BlueCross PPO", alerts: [] },
];

export default function PatientSearch({ onSelect, onRegister }: {
  onSelect: (p: any) => void;
  onRegister: () => void;
}) {
  const [q, setQ] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/emr/search?q=${encodeURIComponent(q)}`)
      .then(res => {
        const mapped = res.map((p: any) => ({
          ...p,
          initials: (p.name?.[0] || "") + (p.last_name?.[0] || ""),
          name: `${p.name || ""} ${p.last_name || ""}`.trim(),
          mrn: p.patient_id,
          sex: p.gender === "Male" ? "M" : (p.gender === "Female" ? "F" : "U"),
          provider: "Not Assigned",
          status: "Active",
          location: "Not Admitted",
          ins: "Unknown",
          alerts: []
        }));
        setPatients(mapped);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Patient Search</h1>
          <p className="text-[11.5px] text-[#64748B]">{loading ? "Searching..." : `${patients.length} active records`} · Search by name, MRN, DOB, or phone</p>
        </div>
        <Btn variant="primary" size="sm" onClick={onRegister}><Icon.Plus /> New Patient</Btn>
      </div>

      <div className="p-5 space-y-4">
        {/* Search Bar */}
        <div className="bg-white border border-[#DDE2EC] rounded p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide block mb-1">Patient Name / MRN</label>
              <Input value={q} onChange={setQ} placeholder="Search name, MRN, DOB, phone..." icon={<Icon.Search />} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide block mb-1">Date of Birth</label>
              <Input placeholder="MM/DD/YYYY" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide block mb-1">Status</label>
              <select className="w-full border border-[#DDE2EC] rounded text-[12.5px] text-gray-700 px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8] bg-white">
                <option>All Patients</option>
                <option>Inpatient</option>
                <option>Active</option>
                <option>Pending</option>
                <option>Discharged</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Btn variant="primary" size="sm">Search</Btn>
            <Btn variant="ghost" size="sm" onClick={() => setQ("")}>Clear</Btn>
            <span className="text-[11.5px] text-[#64748B] ml-2">{patients.length} result{patients.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-2">
          {patients.map((p, i) => (
            <div key={i} className="bg-white border border-[#DDE2EC] rounded hover:border-[#1B4FD8] transition-colors">
              <div className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1B4FD8] flex items-center justify-center text-white text-[13px] font-semibold flex-shrink-0">
                  {p.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13.5px] font-semibold text-gray-900">{p.name}</span>
                        {p.alerts.map((a: any, j: number) => (
                          <span key={j} className="bg-[#FEF3C7] text-[#B45309] text-[11px] font-medium px-1.5 py-0.5 rounded border border-[#FDE68A]">
                            ⚠ {a}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11.5px] text-[#64748B] flex-wrap">
                        <span className="font-mono text-[#374151]">MRN: {p.mrn}</span>
                        <span>DOB: {p.dob} · {p.age} yrs · {p.sex === "M" ? "Male" : "Female"}</span>
                        <span>{p.phone}</span>
                        <span>{p.ins}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11.5px] text-[#64748B]">
                        <span>PCP: {p.provider}</span>
                        <span>·</span>
                        <span>{p.location}</span>
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Btn variant="primary" size="xs" onClick={() => onSelect(p)}>Open Chart</Btn>
                  <Btn variant="outline" size="xs">New Encounter</Btn>
                  <Btn variant="ghost" size="xs">More</Btn>
                </div>
              </div>
            </div>
          ))}
          {!loading && patients.length === 0 && (
            <div className="bg-white border border-[#DDE2EC] rounded p-12 text-center">
              <div className="text-[#94A3B8] text-4xl mb-3">🔍</div>
              <div className="text-sm font-semibold text-gray-700 mb-1">No patients found</div>
              <div className="text-[12px] text-[#64748B] mb-4">Try searching by a different name, MRN, or date of birth.</div>
              <Btn variant="primary" size="sm" onClick={onRegister}><Icon.Plus /> Register New Patient</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
