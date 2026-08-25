import React, { useState } from "react";
import { Icon } from "./icons";
import { StatusBadge, Btn, Input } from "./shared";

interface RegisteredOPPatient {
  umr: string;
  opNumber: string;
  name: string;
  age: number;
  sex: "Male" | "Female" | "Other";
  phone: string;
  address: string;
  bloodGroup: string;
  dept: string;
  isNew: boolean;
  registrationTime: string;
  status: "Registered" | "In Queue" | "Consulting" | "Completed";
  previousVisits?: { opNumber: string; date: string; doctor: string; diagnosis: string }[];
}

const INITIAL_REGISTERED_PATIENTS: RegisteredOPPatient[] = [
  {
    umr: "UMR10001",
    opNumber: "OP025",
    name: "Ravi Kumar",
    age: 42,
    sex: "Male",
    phone: "(617) 555-0192",
    address: "24 Park Avenue, Boston, MA",
    bloodGroup: "O+",
    dept: "Cardiology",
    isNew: false,
    registrationTime: "10:25 AM",
    status: "In Queue",
    previousVisits: [
      { opNumber: "OP001", date: "12-Jan-2026", doctor: "Dr. Anita Desai", diagnosis: "Acute Bronchitis" },
      { opNumber: "OP014", date: "28-May-2026", doctor: "Dr. Michael Chen", diagnosis: "Seasonal Allergic Rhinitis" }
    ]
  },
  {
    umr: "UMR10002",
    opNumber: "OP003",
    name: "Sunita Patel",
    age: 38,
    sex: "Female",
    phone: "(617) 555-0284",
    address: "108 Beacon St, Boston, MA",
    bloodGroup: "B+",
    dept: "General Medicine",
    isNew: false,
    registrationTime: "10:15 AM",
    status: "Consulting",
    previousVisits: [
      { opNumber: "OP003", date: "05-Feb-2026", doctor: "Dr. Sarah Jenkins", diagnosis: "Hypertension Stage 1" }
    ]
  },
  {
    umr: "UMR10048",
    opNumber: "OP001",
    name: "Alex Turner",
    age: 28,
    sex: "Male",
    phone: "(617) 555-9011",
    address: "88 Cambridge St, Cambridge, MA",
    bloodGroup: "A+",
    dept: "Orthopedics",
    isNew: true,
    registrationTime: "10:35 AM",
    status: "Registered",
    previousVisits: []
  }
];

export default function OPRegistration({ onProceedToQueue }: { onProceedToQueue?: (patient: RegisteredOPPatient) => void }) {
  const [activeTab, setActiveTab] = useState<"new" | "revisit" | "records">("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [registeredList, setRegisteredList] = useState<RegisteredOPPatient[]>(INITIAL_REGISTERED_PATIENTS);
  const [selectedPatientForBook, setSelectedPatientForBook] = useState<RegisteredOPPatient | null>(INITIAL_REGISTERED_PATIENTS[0]);

  // Form State for New Patient
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "35",
    dob: "1991-04-12",
    sex: "Male" as "Male" | "Female" | "Other",
    phone: "",
    email: "",
    address: "",
    city: "Boston",
    bloodGroup: "O+",
    dept: "General Medicine",
    emergencyContact: "",
    complaint: "",
  });

  // Handle New Patient Registration
  const handleRegisterNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim()) return;

    const newUmr = `UMR${Math.floor(Math.random() * 90000) + 10000}`;
    const newOp = `OP${String(Math.floor(Math.random() * 900) + 100)}`;
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();

    const newPatient: RegisteredOPPatient = {
      umr: newUmr,
      opNumber: newOp,
      name: fullName,
      age: parseInt(formData.age) || 35,
      sex: formData.sex,
      phone: formData.phone || "(617) 555-0199",
      address: `${formData.address || "15 Main St"}, ${formData.city}`,
      bloodGroup: formData.bloodGroup,
      dept: formData.dept,
      isNew: true,
      registrationTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "Registered",
      previousVisits: []
    };

    setRegisteredList([newPatient, ...registeredList]);
    setSelectedPatientForBook(newPatient);
    setActiveTab("records");

    // Reset Form
    setFormData({
      firstName: "",
      lastName: "",
      age: "35",
      dob: "1991-04-12",
      sex: "Male",
      phone: "",
      email: "",
      address: "",
      city: "Boston",
      bloodGroup: "O+",
      dept: "General Medicine",
      emergencyContact: "",
      complaint: "",
    });
  };

  // Handle Existing Patient Revisit
  const handleCreateRevisitEncounter = (existing: RegisteredOPPatient) => {
    const newOpNumber = `OP${String(Math.floor(Math.random() * 900) + 100)}`;
    const updatedPatient: RegisteredOPPatient = {
      ...existing,
      opNumber: newOpNumber,
      isNew: false,
      registrationTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "Registered",
      previousVisits: [
        ...(existing.previousVisits || []),
        { opNumber: existing.opNumber, date: "Today", doctor: "OP Department", diagnosis: "Routine OP Revisit" }
      ]
    };

    setRegisteredList([updatedPatient, ...registeredList.filter(p => p.umr !== existing.umr)]);
    setSelectedPatientForBook(updatedPatient);
    setActiveTab("records");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-gray-900">Outpatient (OP) Registration Desk</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] font-mono">
              Module 1 — Keppler Spec
            </span>
          </div>
          <p className="text-[11.5px] text-[#64748B] mt-0.5">
            Register new outpatients (generate permanent UMR + OP number), process revisits, and issue official OP Books.
          </p>
        </div>

        {/* Tab Switcher */}
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
            📋 OP Book &amp; Log ({registeredList.length})
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">

        {/* ── TAB 1: NEW PATIENT REGISTRATION FORM ─────────────────────── */}
        {activeTab === "new" && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <h2 className="text-[14.5px] font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1B4FD8] text-white text-[11px] flex items-center justify-center font-mono">1</span>
                  New Patient Registration (FR-001 &amp; FR-004)
                </h2>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  Creates a new permanent <strong>UMR (Unique Medical Record)</strong> and first-visit <strong>OP Number</strong>.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-mono text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded font-bold">
                  Auto-Gen: UMR + OP-001
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

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[13px] rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <span>✓</span> Generate UMR &amp; Issue OP Book
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
                  Existing Patient Revisit (FR-002, FR-005, FR-006 &amp; Section 25)
                </h2>
                <p className="text-[12px] text-[#64748B] mt-0.5">
                  Search patient by UMR or Name. The system <strong>retains their permanent UMR</strong>, displays previous visit history, and generates a <strong>new OP number</strong> for today's visit.
                </p>
              </div>
            </div>

            {/* Search Box */}
            <div className="max-w-xl">
              <Input
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by Patient Name, UMR (e.g. UMR10001), or Phone..."
                icon={<Icon.Search />}
              />
            </div>

            {/* Existing Database Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {registeredList.filter(p =>
                searchQuery === "" ||
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.umr.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.phone.includes(searchQuery)
              ).map((p) => (
                <div key={p.umr} className="p-4 border border-[#DDE2EC] rounded-xl hover:border-[#1B4FD8] transition-all bg-white shadow-xs">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-[14px] text-gray-900">{p.name}</div>
                      <div className="text-[12px] text-[#64748B]">{p.age} yrs · {p.sex} · Blood: {p.bloodGroup} · {p.phone}</div>
                    </div>
                    <span className="font-mono font-bold text-[11.5px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {p.umr}
                    </span>
                  </div>

                  {/* Previous OP visits history */}
                  {p.previousVisits && p.previousVisits.length > 0 && (
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 my-2.5 text-[11.5px] space-y-1">
                      <div className="font-semibold text-gray-700">Past OP History ({p.previousVisits.length} Visits):</div>
                      {p.previousVisits.map((pv, pvi) => (
                        <div key={pvi} className="flex justify-between text-[#475569]">
                          <span>• {pv.opNumber} ({pv.date}): {pv.diagnosis}</span>
                          <span className="text-[#64748B]">{pv.doctor}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-[#F1F5F9]">
                    <span className="text-[11.5px] text-[#64748B]">Permanent Record Linked</span>
                    <button
                      onClick={() => handleCreateRevisitEncounter(p)}
                      className="px-3 py-1.5 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12px] font-semibold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <span>🔄</span> Create New OP Visit ({p.umr})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: DIGITAL OP BOOK & TODAYS REGISTRATIONS ───────────── */}
        {activeTab === "records" && (
          <div className="space-y-6">
            {/* OP Book Card Preview */}
            {selectedPatientForBook && (
              <div className="bg-white border border-[#DDE2EC] rounded-xl p-5 shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
                    <span>📖</span> Digital OP Book Pass (FR-007)
                  </h3>
                  <div className="flex gap-2">
                    <Btn variant="outline" size="sm" onClick={() => window.print()}>
                      <Icon.Download /> Print OP Pass
                    </Btn>
                    {onProceedToQueue && (
                      <Btn variant="primary" size="sm" onClick={() => onProceedToQueue(selectedPatientForBook)}>
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
                      <div className="text-[11px] font-mono font-bold">{selectedPatientForBook.registrationTime} Today</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[12px] mb-3">
                    <div>
                      <div className="text-[9.5px] uppercase text-[#94A3B8] font-bold">Patient Name</div>
                      <div className="text-base font-bold text-white">{selectedPatientForBook.name}</div>
                      <div className="text-[11px] text-[#93C5FD]">{selectedPatientForBook.age} yrs · {selectedPatientForBook.sex} · Blood: {selectedPatientForBook.bloodGroup}</div>
                      <div className="text-[11px] text-[#CBD5E1] mt-1">{selectedPatientForBook.address}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9.5px] uppercase text-[#94A3B8] font-bold">Permanent UMR</div>
                      <div className="text-base font-mono font-bold text-[#60A5FA]">{selectedPatientForBook.umr}</div>
                      <div className="text-[9.5px] uppercase text-[#94A3B8] font-bold mt-2">Visit OP Number</div>
                      <div className="text-base font-mono font-bold text-[#F59E0B]">{selectedPatientForBook.opNumber}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-white/10 text-[10.5px] text-[#94A3B8]">
                    <span>Dept: <strong className="text-white">{selectedPatientForBook.dept}</strong></span>
                    <span className="font-mono">Barcode: |||| ||| ||||| |||</span>
                  </div>
                </div>
              </div>
            )}

            {/* Today's Registration Log Table */}
            <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
                <h3 className="text-[13.5px] font-bold text-gray-900">Today's Registered OP Patients</h3>
                <span className="text-[11.5px] text-[#64748B]">Total: {registeredList.length} Active Records</span>
              </div>
              <table className="w-full text-left">
                <thead className="border-b border-[#DDE2EC] bg-[#FAFAFA]">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">UMR</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">OP Number</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Patient Name</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Type</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Department</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Time</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                  {registeredList.map((p, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedPatientForBook(p)}
                      className={`hover:bg-[#F8FAFC] cursor-pointer transition-colors ${
                        selectedPatientForBook?.umr === p.umr ? "bg-[#EFF6FF]" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-[#1B4FD8]">{p.umr}</td>
                      <td className="px-4 py-3 font-mono font-bold text-[#D97706]">{p.opNumber}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{p.name} ({p.age} {p.sex})</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                          p.isNew ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEF3C7] text-[#B45309]"
                        }`}>
                          {p.isNew ? "New Patient" : "Revisit"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{p.dept}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">{p.registrationTime}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#E0E7FF] text-[#4338CA]">
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPatientForBook(p);
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
