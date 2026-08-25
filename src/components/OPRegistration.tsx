import React, { useState, useEffect } from "react";
import { Icon } from "./icons";
import { StatusBadge, Btn, Input } from "./shared";
import { db, DBPatient, DBOPEncounter } from "../services/db";

export default function OPRegistration({ onProceedToQueue }: { onProceedToQueue?: (patient: DBOPEncounter) => void }) {
  const [activeTab, setActiveTab] = useState<"new" | "revisit" | "records">("new");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Database live state
  const [patients, setPatients] = useState<DBPatient[]>([]);
  const [encounters, setEncounters] = useState<DBOPEncounter[]>([]);
  const [selectedEncounter, setSelectedEncounter] = useState<DBOPEncounter | null>(null);

  // Generation Audit state
  const [generationAlert, setGenerationAlert] = useState<{
    type: "new" | "revisit";
    umr: string;
    opNumber: string;
    name: string;
    previousOpCount: number;
  } | null>(null);

  // Sync with DB
  const refreshFromDb = () => {
    const allPatients = db.getPatients();
    const allEncounters = db.getEncounters();
    setPatients(allPatients);
    setEncounters(allEncounters);
    if (!selectedEncounter && allEncounters.length > 0) {
      setSelectedEncounter(allEncounters[0]);
    }
  };

  useEffect(() => {
    refreshFromDb();
    const unsubscribe = db.subscribe(refreshFromDb);
    return () => unsubscribe();
  }, []);

  // Form State for New Patient
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "35",
    sex: "Male" as "Male" | "Female" | "Other",
    phone: "",
    address: "",
    city: "Boston",
    bloodGroup: "O+",
    dept: "General Medicine",
    complaint: "",
  });

  // 1. Handle New Patient Registration -> Atomic DB write: generates UMR -> then generates OP Number
  const handleRegisterNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim()) return;

    const { patient: createdPatient, encounter: createdEncounter } = db.registerNewPatient({
      firstName: formData.firstName,
      lastName: formData.lastName,
      age: parseInt(formData.age) || 35,
      sex: formData.sex,
      phone: formData.phone || "(617) 555-0199",
      address: `${formData.address || "15 Main St"}, ${formData.city}`,
      bloodGroup: formData.bloodGroup,
      dept: formData.dept,
      chiefComplaint: formData.complaint
    });

    setSelectedEncounter(createdEncounter);
    setGenerationAlert({
      type: "new",
      umr: createdPatient.umr,
      opNumber: createdEncounter.opNumber,
      name: createdPatient.name,
      previousOpCount: 0
    });
    setActiveTab("records");

    // Reset Form
    setFormData({
      firstName: "",
      lastName: "",
      age: "35",
      sex: "Male",
      phone: "",
      address: "",
      city: "Boston",
      bloodGroup: "O+",
      dept: "General Medicine",
      complaint: "",
    });
  };

  // 2. Handle Existing Patient Revisit -> Atomic DB write: Retains UMR -> generates new OP Number
  const handleCreateRevisitEncounter = (p: DBPatient) => {
    const previousEncounters = db.getEncountersForPatient(p.umr);
    const newEncounter = db.createRevisitEncounter(p.umr, {
      dept: formData.dept || previousEncounters[0]?.dept || "General Medicine"
    });

    setSelectedEncounter(newEncounter);
    setGenerationAlert({
      type: "revisit",
      umr: p.umr,
      opNumber: newEncounter.opNumber,
      name: p.name,
      previousOpCount: previousEncounters.length
    });
    setActiveTab("records");
  };

  // Filtered patients for revisit search
  const filteredPatients = db.searchPatients(searchQuery);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-gray-900">Outpatient (OP) Registration Desk</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
              Database Connected (IndexedDB / LocalStorage)
            </span>
          </div>
          <p className="text-[11.5px] text-[#64748B] mt-0.5">
            New Registration creates <strong>Permanent UMR ➔ Visit OP Number</strong> in database. Revisit keeps <strong>Same UMR ➔ New OP Number</strong>.
          </p>
        </div>

        {/* Tab Switcher & DB Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-[#DDE2EC]">
            <button
              onClick={() => setActiveTab("new")}
              className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-all ${
                activeTab === "new" ? "bg-white text-[#1B4FD8] shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              + New Patient Registration
            </button>
            <button
              onClick={() => setActiveTab("revisit")}
              className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-all ${
                activeTab === "revisit" ? "bg-white text-[#1B4FD8] shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🔄 Existing Patient Revisit
            </button>
            <button
              onClick={() => setActiveTab("records")}
              className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-all ${
                activeTab === "records" ? "bg-white text-[#1B4FD8] shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📋 OP Book &amp; Database Log ({encounters.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">

        {/* ── GENERATION AUDIT BANNER ─────────────────────────────────── */}
        {generationAlert && (
          <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xs animate-in fade-in ${
            generationAlert.type === "new"
              ? "bg-[#F0FDF4] border-[#86EFAC] text-[#166534]"
              : "bg-[#EFF6FF] border-[#BFDBFE] text-[#1E3A8A]"
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold">
                  {generationAlert.type === "new" ? "🎉 New Patient Identity Saved to Database" : "🔄 Revisit Encounter Saved to Database"}
                </span>
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-white/80 border font-bold">
                  {generationAlert.name}
                </span>
              </div>
              <div className="text-[12px] flex items-center gap-3">
                <span>
                  <strong>Step 1 (UMR):</strong>{" "}
                  {generationAlert.type === "new" ? (
                    <span className="font-mono font-bold text-[#15803D]">Generated Permanent {generationAlert.umr}</span>
                  ) : (
                    <span className="font-mono font-bold text-[#1E3A8A]">Retained Old {generationAlert.umr} (Unchanged)</span>
                  )}
                </span>
                <span>➔</span>
                <span>
                  <strong>Step 2 (OP Visit):</strong>{" "}
                  <span className="font-mono font-bold text-[#D97706]">Generated New Visit {generationAlert.opNumber}</span>
                  {generationAlert.type === "revisit" && ` (Total past visits: ${generationAlert.previousOpCount})`}
                </span>
              </div>
            </div>
            <button
              onClick={() => setGenerationAlert(null)}
              className="text-xs px-2.5 py-1 rounded bg-white/80 hover:bg-white border font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── TAB 1: NEW PATIENT REGISTRATION FORM ─────────────────────── */}
        {activeTab === "new" && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <h2 className="text-[14.5px] font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1B4FD8] text-white text-[11px] flex items-center justify-center font-mono">1</span>
                  New Patient Registration &amp; Database Insertion
                </h2>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  Submitting generates a permanent <strong>Unique UMR Number</strong> and initial <strong>OP-001 Number</strong>, permanently stored in database.
                </p>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="text-[11px] font-mono text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded font-bold border border-[#86EFAC]">
                  1. Permanent UMR ➔ 2. Initial OP-001
                </span>
              </div>
            </div>

            <form onSubmit={handleRegisterNewPatient} className="space-y-4">
              {/* Name & Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">First Name *</label>
                  <Input
                    value={formData.firstName}
                    onChange={v => setFormData({ ...formData, firstName: v })}
                    placeholder="e.g. David"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Last Name *</label>
                  <Input
                    value={formData.lastName}
                    onChange={v => setFormData({ ...formData, lastName: v })}
                    placeholder="e.g. Miller"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Gender *</label>
                  <select
                    value={formData.sex}
                    onChange={e => setFormData({ ...formData, sex: e.target.value as any })}
                    className="w-full border border-[#DDE2EC] rounded text-[13px] p-2 bg-white focus:outline-none focus:border-[#1B4FD8]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Age, DOB, Blood Group */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Age (Years) *</label>
                  <Input
                    value={formData.age}
                    onChange={v => setFormData({ ...formData, age: v })}
                    type="number"
                    placeholder="e.g. 35"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Blood Group</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full border border-[#DDE2EC] rounded text-[13px] p-2 bg-white focus:outline-none focus:border-[#1B4FD8]"
                  >
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Target Department</label>
                  <select
                    value={formData.dept}
                    onChange={e => setFormData({ ...formData, dept: e.target.value })}
                    className="w-full border border-[#DDE2EC] rounded text-[13px] p-2 bg-white focus:outline-none focus:border-[#1B4FD8]"
                  >
                    {["General Medicine", "Cardiology", "Pulmonology", "Orthopedics", "Pediatrics", "Gynecology", "Dermatology"].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Phone Number *</label>
                  <Input
                    value={formData.phone}
                    onChange={v => setFormData({ ...formData, phone: v })}
                    placeholder="e.g. (617) 555-0192"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Residential Address</label>
                  <Input
                    value={formData.address}
                    onChange={v => setFormData({ ...formData, address: v })}
                    placeholder="e.g. 50 Commonwealth Ave, Boston"
                  />
                </div>
              </div>

              {/* Chief Complaint / Symptoms */}
              <div>
                <label className="text-[11.5px] font-semibold text-gray-700 block mb-1">Initial Chief Complaint / Symptoms</label>
                <textarea
                  value={formData.complaint}
                  onChange={e => setFormData({ ...formData, complaint: e.target.value })}
                  placeholder="e.g. Fever and body pain since 2 days..."
                  className="w-full h-16 border border-[#DDE2EC] rounded-lg p-2.5 text-[12.5px] focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[13px] rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <span>💾</span> Save to Database &amp; Generate OP Book
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── TAB 2: EXISTING PATIENT REVISIT WORKFLOW ───────────────── */}
        {activeTab === "revisit" && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <h2 className="text-[14.5px] font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1B4FD8] text-white text-[11px] flex items-center justify-center font-mono">2</span>
                  Existing Patient Revisit (Keep Permanent UMR ➔ Generate New OP Number)
                </h2>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  Search patient in database. The system <strong>retains their permanent UMR</strong>, displays past visit history, and generates a <strong>new OP number</strong> for today.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#1E40AF] bg-[#DBEAFE] px-2.5 py-1 rounded font-bold border border-[#BFDBFE]">
                Rule: Permanent UMR Retained + New OP Generated
              </span>
            </div>

            {/* Search Box */}
            <div className="max-w-xl">
              <Input
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search database by Name, UMR (e.g. UMR10001), or Phone..."
                icon={<Icon.Search />}
              />
            </div>

            {/* Existing Database Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPatients.map((p) => {
                const pEncounters = db.getEncountersForPatient(p.umr);
                return (
                  <div key={p.umr} className="p-4 border border-[#DDE2EC] rounded-xl hover:border-[#1B4FD8] transition-all bg-white shadow-xs">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-[14px] text-gray-900">{p.name}</div>
                        <div className="text-[12px] text-[#64748B]">{p.age} yrs · {p.sex} · Blood: {p.bloodGroup} · {p.phone}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-[11.5px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded block">
                          {p.umr}
                        </span>
                        <span className="text-[10px] text-[#64748B]">Permanent UMR</span>
                      </div>
                    </div>

                    {/* Previous OP visits history */}
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 my-2.5 text-[11.5px] space-y-1">
                      <div className="font-semibold text-gray-700 flex justify-between">
                        <span>Past OP Visits On Record:</span>
                        <span className="font-mono text-[#D97706]">{pEncounters.length} Visits in Database</span>
                      </div>
                      {pEncounters.length > 0 ? (
                        pEncounters.slice(0, 3).map((pv) => (
                          <div key={pv.id} className="flex justify-between text-[#475569]">
                            <span>• {pv.opNumber} ({pv.registrationTime}): {pv.diagnosis || pv.chiefComplaint}</span>
                            <span className="text-[#64748B]">{pv.dept}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-400 italic">No past encounters</div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-[#F1F5F9]">
                      <span className="text-[11.5px] text-[#16A34A] font-semibold">
                        ✓ Retain {p.umr}
                      </span>
                      <button
                        onClick={() => handleCreateRevisitEncounter(p)}
                        className="px-3.5 py-1.5 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <span>🔄</span> Generate New Visit OP Number ➔
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 3: DIGITAL OP BOOK & TODAYS REGISTRATIONS ───────────── */}
        {activeTab === "records" && (
          <div className="space-y-6">
            {/* OP Book Card Preview */}
            {selectedEncounter && (
              <div className="bg-white border border-[#DDE2EC] rounded-xl p-5 shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
                      <span>📖</span> Official Outpatient OP Book Pass
                    </h3>
                    <p className="text-[11.5px] text-[#64748B]">
                      Shows patient permanent UMR alongside the active visit OP number from database.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Btn variant="outline" size="sm" onClick={() => window.print()}>
                      <Icon.Download /> Print OP Pass
                    </Btn>
                    {onProceedToQueue && (
                      <Btn variant="primary" size="sm" onClick={() => onProceedToQueue(selectedEncounter)}>
                        Proceed to Queue &amp; Doctor Consultation →
                      </Btn>
                    )}
                  </div>
                </div>

                <div className="max-w-xl mx-auto bg-gradient-to-br from-[#0C1524] to-[#1E2D42] text-white rounded-2xl p-5 shadow-md border border-[#334155]">
                  <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <img src="/logo.png" alt="HospAI" className="w-7 h-7 object-contain" />
                      <div>
                        <div className="font-bold text-[13px]">HospAI General Hospital</div>
                        <div className="text-[9.5px] text-[#94A3B8]">Official Outpatient (OP) Record</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9.5px] text-[#94A3B8]">Registration Date</div>
                      <div className="text-[11px] font-mono font-bold">{selectedEncounter.registrationTime}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[12px] mb-3">
                    <div>
                      <div className="text-[9.5px] uppercase text-[#94A3B8] font-bold">Patient Name</div>
                      <div className="text-base font-bold text-white">{selectedEncounter.patientName}</div>
                      <div className="text-[11px] text-[#93C5FD]">{selectedEncounter.age} yrs · {selectedEncounter.sex} · Blood: {selectedEncounter.bloodGroup}</div>
                      <div className="text-[11px] text-[#CBD5E1] mt-1">{selectedEncounter.address}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9.5px] uppercase text-[#94A3B8] font-bold">Permanent UMR (Database Key)</div>
                      <div className="text-base font-mono font-bold text-[#60A5FA]">{selectedEncounter.umr}</div>
                      <div className="text-[9.5px] uppercase text-[#94A3B8] font-bold mt-2">Current Visit OP Number</div>
                      <div className="text-base font-mono font-bold text-[#F59E0B]">{selectedEncounter.opNumber}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-white/10 text-[10.5px] text-[#94A3B8]">
                    <span>Dept: <strong className="text-white">{selectedEncounter.dept}</strong></span>
                    <span className="font-mono">Barcode: |||| ||| ||||| |||</span>
                  </div>
                </div>
              </div>
            )}

            {/* Today's Registration Log Table */}
            <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
                <div>
                  <h3 className="text-[13.5px] font-bold text-gray-900">Database Encounter Registry</h3>
                  <p className="text-[11px] text-[#64748B]">All outpatient encounters stored permanently across sessions.</p>
                </div>
                <span className="text-[11.5px] text-[#64748B]">Total: {encounters.length} Database Records</span>
              </div>
              <table className="w-full text-left">
                <thead className="border-b border-[#DDE2EC] bg-[#FAFAFA]">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Permanent UMR</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Current OP No</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Patient Name</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Encounter Type</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Department</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Time</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                  {encounters.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => setSelectedEncounter(e)}
                      className={`hover:bg-[#F8FAFC] cursor-pointer transition-colors ${
                        selectedEncounter?.id === e.id ? "bg-[#EFF6FF]" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-[#1B4FD8]">{e.umr}</td>
                      <td className="px-4 py-3 font-mono font-bold text-[#D97706]">{e.opNumber}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{e.patientName} ({e.age} {e.sex})</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                          e.isNew ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEF3C7] text-[#B45309]"
                        }`}>
                          {e.isNew ? "New Patient" : "Revisit Encounter"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{e.dept}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">{e.registrationTime}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#E0E7FF] text-[#4338CA]">
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setSelectedEncounter(e);
                          }}
                          className="text-[11.5px] text-[#1B4FD8] font-semibold hover:underline"
                        >
                          View OP Book
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
