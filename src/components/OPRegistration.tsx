import React, { useState, useEffect } from "react";
import { Icon } from "./icons";
import { StatusBadge, Btn, Input } from "./shared";
import { db, DBPatient, DBOPEncounter } from "../services/db";
import PatientBarcode from "./PatientBarcode";

// Accurate age calculation from Date of Birth
const calculateAge = (dobString: string): number => {
  if (!dobString) return 0;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(0, age);
};

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
    age: number;
    phone: string;
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

  // Form State: First Name, Middle Name (optional), Last Name, DOB, Age (locked), Phone
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dob: "1996-05-20",
    age: calculateAge("1996-05-20"),
    phone: "",
  });

  // Handle DOB Change -> Dynamically updates and fixes Age
  const handleDobChange = (newDob: string) => {
    const computedAge = calculateAge(newDob);
    setFormData(prev => ({
      ...prev,
      dob: newDob,
      age: computedAge
    }));
  };

  // 1. Handle New Patient Registration -> Generates UMR -> then generates OP Number
  const handleRegisterNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.dob) return;

    const computedAge = calculateAge(formData.dob);

    const { patient: createdPatient, encounter: createdEncounter } = db.registerNewPatient({
      firstName: formData.firstName.trim(),
      middleName: formData.middleName.trim() || undefined,
      lastName: formData.lastName.trim(),
      dob: formData.dob,
      age: computedAge,
      phone: formData.phone.trim() || "(617) 555-0199",
      dept: "General Medicine"
    });

    setSelectedEncounter(createdEncounter);
    setGenerationAlert({
      type: "new",
      umr: createdPatient.umr,
      opNumber: createdEncounter.opNumber,
      name: createdPatient.name,
      age: computedAge,
      phone: createdPatient.phone
    });
    setActiveTab("records");

    // Reset Form
    setFormData({
      firstName: "",
      middleName: "",
      lastName: "",
      dob: "1996-05-20",
      age: calculateAge("1996-05-20"),
      phone: "",
    });
  };

  // 2. Handle Existing Patient Revisit -> Retains Permanent UMR -> generates new OP Number
  const handleCreateRevisitEncounter = (p: DBPatient) => {
    const previousEncounters = db.getEncountersForPatient(p.umr);
    const newEncounter = db.createRevisitEncounter(p.umr, {
      dept: "General Medicine"
    });

    setSelectedEncounter(newEncounter);
    setGenerationAlert({
      type: "revisit",
      umr: p.umr,
      opNumber: newEncounter.opNumber,
      name: p.name,
      age: p.age,
      phone: p.phone
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
              UMR &amp; OP Number Sequence
            </span>
          </div>
          <p className="text-[11.5px] text-[#64748B] mt-0.5">
            Register outpatient: First Name, Middle Name (optional), Last Name, DOB (Auto-fixed Age), and Phone.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-[#DDE2EC]">
            <button
              onClick={() => setActiveTab("new")}
              className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-all ${
                activeTab === "new" ? "bg-white text-[#1B4FD8] shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              + New OP Registration
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
              📋 OP Book &amp; Log ({encounters.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">

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
                  {generationAlert.type === "new" ? "🎉 OP Registration Successfully Completed" : "🔄 Revisit Encounter Generated"}
                </span>
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-white/80 border font-bold">
                  {generationAlert.name} ({generationAlert.age} yrs)
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
                  <strong>Step 2 (OP Number):</strong>{" "}
                  <span className="font-mono font-bold text-[#D97706]">Generated Visit {generationAlert.opNumber}</span>
                </span>
                <span>· Phone: <strong>{generationAlert.phone}</strong></span>
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

        {/* ── TAB 1: NEW PATIENT REGISTRATION FORM (EXACT REQUESTED FIELDS) ── */}
        {activeTab === "new" && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-mono">1</span>
                  OP Patient Registration Form
                </h2>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  Enter patient details. When submitted, the system generates the permanent <strong>UMR Number</strong> and initial <strong>OP Number</strong>.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#16A34A] bg-[#DCFCE7] px-2.5 py-1 rounded font-bold border border-[#86EFAC]">
                Auto: 1. UMR ➔ 2. OP-001
              </span>
            </div>

            <form onSubmit={handleRegisterNewPatient} className="space-y-5">
              
              {/* Name Fields: First Name, Middle Name (optional), Last Name */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[12px] font-semibold text-gray-800 block mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.firstName}
                    onChange={v => setFormData({ ...formData, firstName: v })}
                    placeholder="e.g. John"
                    required
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-gray-800 block mb-1.5">
                    Middle Name <span className="text-[11px] text-[#64748B] font-normal">(Optional)</span>
                  </label>
                  <Input
                    value={formData.middleName}
                    onChange={v => setFormData({ ...formData, middleName: v })}
                    placeholder="e.g. Robert"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-gray-800 block mb-1.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.lastName}
                    onChange={v => setFormData({ ...formData, lastName: v })}
                    placeholder="e.g. Smith"
                    required
                  />
                </div>
              </div>

              {/* DOB, Age (Locked), Phone Number */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[12px] font-semibold text-gray-800 block mb-1.5">
                    Date of Birth (DOB) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={e => handleDobChange(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full border border-[#DDE2EC] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#1B4FD8]"
                    required
                  />
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-gray-800 flex items-center justify-between mb-1.5">
                    <span>Age (Years)</span>
                    <span className="text-[10px] font-mono text-[#166534] bg-[#DCFCE7] px-1.5 py-0.2 rounded font-bold">
                      🔒 Fixed from DOB
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.age}
                      readOnly
                      disabled
                      className="w-full border border-[#DDE2EC] rounded-lg px-3 py-2 text-[13px] bg-[#F1F5F9] text-gray-800 font-bold font-mono cursor-not-allowed select-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                      yrs
                    </span>
                  </div>
                  <span className="text-[10.5px] text-[#64748B] mt-1 block">
                    Automatically fixed to DOB. Changes only when DOB changes.
                  </span>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-gray-800 block mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={v => setFormData({ ...formData, phone: v })}
                    placeholder="e.g. (617) 555-0192"
                    required
                  />
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-4 border-t border-[#E2E8F0] flex justify-between items-center">
                <div className="text-[12px] text-[#64748B]">
                  * Clicking will generate permanent <strong>UMR Number</strong> and assign initial <strong>OP Number</strong>.
                </div>
                <button
                  type="submit"
                  className="px-7 py-3 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[13.5px] rounded-lg shadow-sm transition-all flex items-center gap-2"
                >
                  <span>✓</span> Register OP &amp; Generate UMR / OP Number
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
                <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-mono">2</span>
                  Existing Patient Revisit (Keep Old UMR ➔ Generate New OP Number)
                </h2>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  Search patient in database. The permanent <strong>UMR remains unchanged</strong>, and a <strong>new OP number</strong> is generated for today's visit.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#1E40AF] bg-[#DBEAFE] px-2.5 py-1 rounded font-bold border border-[#BFDBFE]">
                Permanent UMR Retained + New OP Generated
              </span>
            </div>

            {/* Search & Barcode Scan Bar */}
            <div className="flex gap-3 max-w-2xl">
              <div className="flex-1">
                <Input
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search database by Patient Name, UMR (e.g. UMR10001), or Phone..."
                  icon={<Icon.Search />}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const firstPatient = patients[0];
                  if (firstPatient) {
                    setSearchQuery(firstPatient.umr);
                  }
                }}
                className="px-4 py-2 bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] text-[#1D4ED8] text-[12.5px] font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
              >
                <span>📷</span> Scan Card Barcode
              </button>
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
                        <div className="text-[12px] text-[#64748B]">{p.age} yrs · {p.phone}</div>
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
                            <span>• {pv.opNumber} ({pv.registrationTime})</span>
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
                      Shows patient permanent UMR alongside the active visit OP number.
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

                <div className="max-w-xl mx-auto space-y-4">
                  <div className="bg-gradient-to-br from-[#0C1524] to-[#1E2D42] text-white rounded-2xl p-5 shadow-md border border-[#334155]">
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

                    <div className="grid grid-cols-2 gap-4 text-[12px] mb-4">
                      <div>
                        <div className="text-[9.5px] uppercase text-[#94A3B8] font-bold">Patient Name</div>
                        <div className="text-base font-bold text-white">{selectedEncounter.patientName}</div>
                        <div className="text-[11px] text-[#93C5FD]">Age: {selectedEncounter.age} yrs · Phone: {selectedEncounter.phone}</div>
                        <div className="text-[10.5px] text-[#CBD5E1] mt-0.5">Dept: {selectedEncounter.dept}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9.5px] uppercase text-[#94A3B8] font-bold">Permanent UMR (Lifetime)</div>
                        <div className="text-base font-mono font-bold text-[#60A5FA]">{selectedEncounter.umr}</div>
                        <div className="text-[9.5px] uppercase text-[#94A3B8] font-bold mt-2">Current Visit OP Number</div>
                        <div className="text-base font-mono font-bold text-[#F59E0B]">{selectedEncounter.opNumber}</div>
                      </div>
                    </div>

                    {/* Integrated Scannable Barcode & QR Code */}
                    <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                      <PatientBarcode encounter={selectedEncounter} showScannerButton={false} />
                    </div>
                  </div>

                  <PatientBarcode encounter={selectedEncounter} showScannerButton={true} />
                </div>
              </div>
            )}

            {/* Today's Registration Log Table */}
            <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
                <div>
                  <h3 className="text-[13.5px] font-bold text-gray-900">Database Encounter Registry</h3>
                  <p className="text-[11px] text-[#64748B]">All registered outpatients with permanent UMR and visit OP numbers.</p>
                </div>
                <span className="text-[11.5px] text-[#64748B]">Total: {encounters.length} Database Records</span>
              </div>
              <table className="w-full text-left">
                <thead className="border-b border-[#DDE2EC] bg-[#FAFAFA]">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Permanent UMR</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Current OP No</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Patient Name</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Age</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Type</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Time</th>
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
                      <td className="px-4 py-3 font-semibold text-gray-900">{e.patientName}</td>
                      <td className="px-4 py-3 font-mono text-gray-700">{e.age} yrs</td>
                      <td className="px-4 py-3 text-gray-700">{e.phone}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                          e.isNew ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEF3C7] text-[#B45309]"
                        }`}>
                          {e.isNew ? "New Patient" : "Revisit Encounter"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-500">{e.registrationTime}</td>
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
