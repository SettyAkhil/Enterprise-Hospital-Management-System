import { usePharmacyData } from "../data/usePharmacyData";
import { useState } from "react";
import { Search, Filter, X, User, Stethoscope, FileText, CheckCircle, Play, XCircle, MessageSquare, ChevronRight, Plus } from "lucide-react";
import { PharmacyDatabase, AppPrescription } from "../../../services/pharmacyDb";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

const filters = ["All", "Pending", "Processing", "Ready", "Dispensed", "Rejected"];

interface PrescriptionQueueProps { onNavigate: (page: string) => void }

export default function PrescriptionQueue({ onNavigate }: PrescriptionQueueProps) {
  const {  prescriptions, refresh  } = usePharmacyData();
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
      sourceType: "OPD",
      priority: "Normal",
      status: "Pending",
      dispensingStatus: "Pending",
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
      ]
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
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-0">
          <PageHeader
            breadcrumbs={[{ label: "Pharmacy" }, { label: "Prescription Queue" }]}
            title="Prescription Queue"
            description="Manage incoming doctor prescriptions"
            actions={
              <button onClick={handleGenerateTestPrescription} className="flex items-center gap-1.5 px-4 py-2 rounded-none text-white text-[13px] font-medium" style={{ background: "#4f46e5" }}>
                <Plus size={14} /> Add Test Prescription
              </button>
            }
            onNavigate={onNavigate}
          />

          {/* Filters */}
          <div className="flex items-center gap-3 mt-4 mb-0 flex-wrap">
            <div className="flex rounded-none border border-[#e5e7eb] overflow-hidden bg-white text-[13px]">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className="px-4 py-2 font-medium transition-colors border-r last:border-r-0 border-[#e5e7eb]"
                  style={{ background: activeFilter === f ? "#111827" : "#fff", color: activeFilter === f ? "#fff" : "#6b7280" }}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-none px-3 py-2">
                <Search size={14} className="text-[#9ca3af]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, doctor, ID..." className="text-[13px] outline-none text-[#111827] placeholder:text-[#9ca3af] w-44" />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
          <div className="bg-white rounded-none border border-[#e5e7eb] overflow-hidden">
            <table>
              <thead><tr>
                <th>Prescription ID</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Items</th><th>Priority</th><th>Status</th><th>Pharmacist</th><th>Action</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="py-16 text-center">
                    <div className="w-12 h-12 rounded-none bg-[#f3f4f6] flex items-center justify-center mx-auto"><FileText size={22} className="text-[#9ca3af]" /></div>
                    <p className="font-medium text-[#374151] mt-3">No prescriptions found</p>
                  </td></tr>
                ) : filtered.map(rx => (
                  <tr key={rx.id} onClick={() => setSelected(rx)} className="cursor-pointer">
                    <td className="font-mono text-[12px] font-semibold" style={{ color: "#4f46e5" }}>{rx.id}</td>
                    <td>
                      <p className="font-medium text-[#111827] text-[13px]">{rx.patient}</p>
                      <p className="text-[11px] text-[#9ca3af]">{rx.age}y · {rx.gender} · {rx.contact}</p>
                    </td>
                    <td>
                      <p className="text-[13px] text-[#374151]">{rx.doctor}</p>
                      <p className="text-[11px] text-[#9ca3af]">{rx.department}</p>
                    </td>
                    <td className="text-[12px] text-[#6b7280]">{rx.date}</td>
                    <td className="text-[13px] font-semibold text-center">{rx.items}</td>
                    <td><StatusBadge status={rx.priority} size="sm" /></td>
                    <td><StatusBadge status={rx.status} size="sm" /></td>
                    <td className="text-[13px] text-[#6b7280]">{rx.pharmacist ?? <span className="text-[#9ca3af] text-[12px]">—</span>}</td>
                    <td>
                      <button className="flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-none border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6] transition-colors">
                        View <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="w-96 bg-white border-l border-[#e5e7eb] flex flex-col flex-shrink-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6]">
            <div>
              <p className="font-semibold text-[14px] text-[#111827]">{selected.id}</p>
              <p className="text-[12px] text-[#6b7280]">{selected.date} · {selected.time}</p>
            </div>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-none hover:bg-[#f3f4f6] text-[#9ca3af] transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <Section icon={<User size={14} />} title="Patient">
              <Row label="Name" value={selected.patient} />
              <Row label="Age / Gender" value={selected.age + 'y · ' + selected.gender} />
              <Row label="Contact" value={selected.contact} />
              <Row label="Priority"><StatusBadge status={selected.priority} size="sm" /></Row>
            </Section>

            <Section icon={<Stethoscope size={14} />} title="Doctor">
              <Row label="Name" value={selected.doctor} />
              <Row label="Department" value={selected.department} />
            </Section>

            <div>
              <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-2">Prescribed Medicines</p>
              <div className="space-y-2">
                {selected.rawItems?.map((m: any, i: number) => (
                  <div key={i} className="p-3 rounded-none border border-[#f3f4f6] bg-[#f9fafb]">
                    <p className="text-[13px] font-semibold text-[#111827]">{m.medicineName}</p>
                    <p className="text-[11px] text-[#6b7280] mt-0.5">{m.dosage} · {m.frequency} · {m.duration}</p>
                    <p className="text-[11px] font-bold mt-1 text-[#4f46e5]">Qty: {m.quantity}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[12px] text-[#6b7280]">Status</span>
              <StatusBadge status={selected.status} />
            </div>
          </div>

          <div className="p-4 border-t border-[#e5e7eb] space-y-2">
            {selected.status !== "dispensed" && (
              <div className="grid grid-cols-1 gap-2">
                <button onClick={handleDispense} className="flex items-center justify-center gap-1.5 py-2.5 rounded-none text-white text-[12px] font-medium hover:opacity-90" style={{ background: "#4f46e5" }}>
                  <Play size={13} /> Dispense Items
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[#6b7280]">{icon}</span>
        <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">{title}</p>
      </div>
      <div className="space-y-1.5 pl-5">{children}</div>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-[#9ca3af] flex-shrink-0">{label}</span>
      {children ?? <span className="text-[13px] text-[#111827] font-medium text-right">{value}</span>}
    </div>
  );
}
