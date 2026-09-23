import { usePharmacyData } from "../data/usePharmacyData";
import { useState } from "react";
import { Search, User, Stethoscope, FileText, Play, ChevronRight, Plus, X, ClipboardList } from "lucide-react";
import { PharmacyDatabase, AppPrescription } from "../../../services/pharmacyDb";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { Btn } from "../../shared";

const filters = ["All", "Pending", "Processing", "Ready", "Dispensed", "Rejected"];

interface PrescriptionQueueProps { onNavigate: (page: string) => void }

export default function PrescriptionQueue({ onNavigate }: PrescriptionQueueProps) {
  const { prescriptions, refresh } = usePharmacyData();
  const [activeFilter, setActiveFilter] = useState("All");
  const [selected, setSelected] = useState<typeof prescriptions[0] | null>(null);
  const [search, setSearch] = useState("");

  const filtered = prescriptions.filter(rx => {
    const matchStatus = activeFilter === "All" || rx.status === activeFilter.toLowerCase();
    const matchSearch = !search || rx.patient.toLowerCase().includes(search.toLowerCase()) || rx.id.includes(search) || rx.doctor.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleGenerateTestPrescription = () => {
    const p: AppPrescription = {
      id: "RX" + Date.now(),
      patientId: "PT123",
      patientName: "John Doe Test",
      uhid: "UHID-999",
      age: 45,
      gender: "Male",
      doctorId: "DR1",
      doctorName: "Dr. Smith",
      department: "General Medicine",
      diagnosis: "Fever and Cough",
      date: new Date().toISOString().split("T")[0],
      sourceType: "DIGITAL",
      priority: "Normal",
      status: "Sent To Pharmacy",
      dispensingStatus: "Waiting",
      items: [
        {
          id: "RXI" + Date.now(),
          medicineName: "Paracetamol 500mg",
          dosage: "1-1-1",
          frequency: "TID",
          duration: "5 days",
          quantity: 15,
          substitutionAllowed: true
        }
      ],
      createdAt: new Date().toISOString()
    };
    const rxs = PharmacyDatabase.getPrescriptions();
    rxs.push(p);
    PharmacyDatabase.savePrescriptions(rxs);
    refresh();
  };

  const handleDispense = () => {
    if (selected) {
      localStorage.setItem("_v2_pharmacy_dispense_rx", selected.id);
      onNavigate("dispensing");
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F6F9]">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Prescription Queue" }]}
        title="Prescription Dispensing Queue"
        badge="RX WORKLIST"
        description="Doctor e-prescriptions dispatched for clinical verification and dispensing"
        actions={
          <Btn variant="primary" size="sm" onClick={handleGenerateTestPrescription} className="shadow-xs" >
            <Plus size={14} /> Add Test Prescription
          </Btn>
        }
        onNavigate={onNavigate}
        icon={ClipboardList} iconBg="bg-indigo-600"
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-4 max-w-[1600px] w-full mx-auto flex flex-col">
          {/* Filters & Search */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex rounded-md border border-[#DDE2EC] overflow-hidden bg-white text-[12px] shadow-xs">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3.5 py-1.5 font-semibold transition-colors border-r last:border-r-0 border-[#DDE2EC] cursor-pointer ${
                    activeFilter === f ? "bg-[#1E293B] text-white" : "text-[#64748B] hover:bg-[#F1F5F9]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-white border border-[#DDE2EC] rounded-lg px-3 py-1.5 w-72 shadow-xs focus-within:border-[#2563EB]">
              <Search size={14} className="text-[#94A3B8]" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search patient, doctor, or Rx ID..." 
                className="text-[13px] outline-none text-[#0F1624] placeholder:text-[#94A3B8] w-full bg-transparent" 
              />
              {search && <button onClick={() => setSearch("")} className="cursor-pointer"><X size={12} className="text-[#94A3B8]" /></button>}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden flex-1">
            <table>
              <thead><tr>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Prescription ID</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Patient</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Doctor</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Date</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0] text-center">Items</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Priority</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Status</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">Pharmacist</th>
                <th className="px-4 py-3 bg-[#FAFCFF] text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0] text-center">Action</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="py-16 text-center">
                    <div className="w-12 h-12 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto mb-3"><FileText size={22} /></div>
                    <p className="font-bold text-gray-800 text-[14px]">No prescriptions found</p>
                    <p className="text-[12px] text-[#94A3B8] mt-1">Prescriptions submitted by physicians will appear here in real time</p>
                  </td></tr>
                ) : filtered.map(rx => (
                  <tr 
                    key={rx.id} 
                    onClick={() => setSelected(rx)} 
                    className={`border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] cursor-pointer transition-colors ${
                      selected?.id === rx.id ? "bg-[#EFF6FF]/60" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                        {rx.id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900 text-[13px]">{rx.patient}</p>
                      <p className="text-[11px] text-[#94A3B8]">{rx.age}y · {rx.gender} · {rx.contact}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12.5px] font-medium text-gray-800">{rx.doctor}</p>
                      <p className="text-[11px] text-[#94A3B8]">{rx.department}</p>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#64748B] font-mono">{rx.date}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-[12px] font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                        {rx.items} items
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={rx.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={rx.status} /></td>
                    <td className="px-4 py-3 text-[12px] text-[#64748B]">{rx.pharmacist ?? <span className="text-[#94A3B8]">—</span>}</td>
                    <td className="px-4 py-3 text-center">
                      <button className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded border border-[#DDE2EC] text-[#334155] hover:bg-[#F1F5F9] transition-colors cursor-pointer">
                        View <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Drawer */}
        {selected && (
          <div className="w-[380px] bg-white border-l border-[#E2E8F0] shadow-sm flex flex-col flex-shrink-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0] bg-[#FAFCFF]">
              <div>
                <p className="font-bold text-[14px] text-gray-900">{selected.id}</p>
                <p className="text-[11.5px] text-[#64748B] font-mono">{selected.date} · {selected.time}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#94A3B8] transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <Section icon={<User size={14} />} title="Patient Information">
                <Row label="Name" value={selected.patient} />
                <Row label="Age / Gender" value={selected.age + 'y · ' + selected.gender} />
                <Row label="Contact" value={selected.contact} />
                <Row label="Priority"><StatusBadge status={selected.priority} /></Row>
              </Section>

              <Section icon={<Stethoscope size={14} />} title="Prescribing Physician">
                <Row label="Doctor" value={selected.doctor} />
                <Row label="Department" value={selected.department} />
              </Section>

              <div>
                <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Prescribed Medicines</p>
                <div className="space-y-2">
                  {selected.rawItems?.map((m: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                      <p className="text-[13px] font-bold text-gray-900">{m.medicineName}</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">{m.dosage} · {m.frequency} · {m.duration}</p>
                      <p className="text-[11px] font-bold mt-1 text-[#2563EB] font-mono">Quantity: {m.quantity}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                <span className="text-[12px] font-semibold text-[#64748B]">Current Status</span>
                <StatusBadge status={selected.status} />
              </div>
            </div>

            <div className="p-4 border-t border-[#E2E8F0] bg-[#FAFCFF]">
              {selected.status !== "dispensed" ? (
                <Btn variant="primary" size="md" onClick={handleDispense} className="w-full justify-center shadow-xs">
                  <Play size={14} /> Dispense Prescription
                </Btn>
              ) : (
                <div className="text-center text-[12px] text-[#16A34A] font-semibold py-1">
                  ✓ Dispensed
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[#64748B]">{icon}</span>
        <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{title}</p>
      </div>
      <div className="space-y-1.5 pl-5">{children}</div>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-[#94A3B8] flex-shrink-0">{label}</span>
      {children ?? <span className="text-[13px] text-[#0F1624] font-medium text-right">{value}</span>}
    </div>
  );
}
