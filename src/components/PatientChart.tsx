import React, { useState, useEffect } from "react";
import { PatientBanner, TabBar, Card, StatusBadge, Table, TR, TD, TimelineItem, Btn } from "./shared";
import { apiFetch } from "../lib/api";

const TABS = ["Summary", "Timeline", "Problems", "Medications", "Vitals", "Notes", "Labs", "Imaging", "Orders", "Documents", "Billing"];

type EmrBundle = {
  patient: any;
  diagnoses: any[];
  medication_schedules: any[];
  prescriptions: any[];
  vitals: any[];
  labs: any[];
  timeline: { label: string; stage: string; timestamp: string }[];
  admissions: any[];
  bed_history: any[];
  appointments: any[];
  invoices: any[];
  invoice_payments: any[];
  insurance_claims: any[];
  financial_summary: Record<string, number>;
};

export default function PatientChart({ patientId, onBack, openOrder }: { patientId?: string | null; onBack: () => void; openOrder: () => void }) {
  const [tab, setTab] = useState("Summary");
  const [timelineFilter, setTimelineFilter] = useState("All");

  const [emrData, setEmrData] = useState<EmrBundle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    apiFetch<EmrBundle>(`/api/emr/${patientId}`)
      .then(setEmrData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [patientId]);

  const patientData = emrData?.patient;
  const diagnoses = emrData?.diagnoses || [];
  const medications = emrData?.prescriptions || [];
  const timeline = emrData?.timeline || [];
  const labs = emrData?.labs || [];
  const admissions = emrData?.admissions || [];
  const bedHistory = emrData?.bed_history || [];
  const appointments = emrData?.appointments || [];
  const insuranceClaims = emrData?.insurance_claims || [];
  const latestAdmission = admissions[0];
  const currentBed = bedHistory.find((b) => b.status === "active") || bedHistory[0];
  const providers = Array.from(
    new Set(appointments.map((a: any) => a.doctor_name).filter(Boolean)),
  ) as string[];
  const allergiesList = (patientData?.allergies || "")
    .split(",")
    .map((a: string) => a.trim())
    .filter(Boolean);

  const timelineFiltered = timeline.filter(
    (e) => timelineFilter === "All" || e.stage?.toLowerCase() === timelineFilter.toLowerCase(),
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Patient Banner */}
      <PatientBanner patient={patientData} onAction={(a) => { if (a === "order") openOrder(); }} />
      {/* Tab Bar */}
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className="flex-1 overflow-y-auto bg-[#F0F2F5] p-5">
        {loading && (
          <div className="text-center py-12 text-[#94A3B8] text-[13px]">Loading patient record…</div>
        )}

        {!loading && tab === "Summary" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card title="Active Problems" actions={<Btn variant="ghost" size="xs">+ Add</Btn>}>
                  <div className="space-y-1.5">
                    {diagnoses.filter((p: any) => p.is_primary).slice(0, 5).map((p: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 py-1 border-b border-[#F1F5F9] last:border-0">
                        <span className="font-mono text-[10.5px] text-[#94A3B8] mt-0.5 w-14 flex-shrink-0">{p.icd10_code || "UNK"}</span>
                        <span className="text-[12.5px] text-gray-800">{p.diagnosis_name}</span>
                      </div>
                    ))}
                    {diagnoses.filter((p: any) => p.is_primary).length === 0 && (
                      <div className="text-[11.5px] text-[#64748B] py-2">No active problems recorded</div>
                    )}
                  </div>
                </Card>
                <Card title="Allergies" actions={<Btn variant="ghost" size="xs">+ Add</Btn>}>
                  <div className="space-y-2">
                    {allergiesList.length > 0 ? allergiesList.map((a: string, i: number) => (
                      <div key={i} className="pb-1.5 border-b border-[#F1F5F9] last:border-0">
                        <span className="font-medium text-[12.5px] text-[#B91C1C]">{a}</span>
                      </div>
                    )) : (
                      <div className="text-[11.5px] text-[#64748B] py-2">No known drug allergies (NKDA)</div>
                    )}
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card title="Current Medications">
                  <div className="space-y-1">
                    {medications.length > 0 ? medications.slice(0, 5).map((m: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-[#F1F5F9] last:border-0">
                        <div>
                          <div className="text-[12.5px] font-medium text-gray-800">{m.medicine_name}</div>
                          <div className="text-[11px] text-[#64748B] font-mono">{m.dosage || `Qty ${m.quantity}`}</div>
                        </div>
                        <StatusBadge status={m.status || "pending"} />
                      </div>
                    )) : (
                      <div className="text-[11.5px] text-[#64748B] py-2">No prescriptions on file</div>
                    )}
                  </div>
                </Card>

                <Card title="Encounter Info">
                  <div className="space-y-1.5 text-[12px]">
                    {latestAdmission ? (
                      <>
                        <div className="flex justify-between py-0.5 border-b border-[#F8FAFC]">
                          <span className="text-[#64748B]">Admit Date</span>
                          <span className="font-medium text-gray-800">{new Date(latestAdmission.admission_date).toLocaleString()}</span>
                        </div>
                        {latestAdmission.notes && (
                          <div className="flex justify-between py-0.5 border-b border-[#F8FAFC]">
                            <span className="text-[#64748B]">Reason</span>
                            <span className="font-medium text-gray-800 text-right ml-2">{latestAdmission.notes}</span>
                          </div>
                        )}
                        {latestAdmission.expected_discharge_date && (
                          <div className="flex justify-between py-0.5 border-b border-[#F8FAFC]">
                            <span className="text-[#64748B]">Expected DC</span>
                            <span className="font-medium text-gray-800">{latestAdmission.expected_discharge_date}</span>
                          </div>
                        )}
                        {currentBed && (
                          <div className="flex justify-between py-0.5 border-b border-[#F8FAFC]">
                            <span className="text-[#64748B]">Bed</span>
                            <span className="font-medium text-gray-800">{currentBed.ward} · Room {currentBed.room_no} · Bed {currentBed.bed_no}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-[11.5px] text-[#64748B] py-2">No admissions on file</div>
                    )}
                  </div>
                </Card>
              </div>

              <Card title="Recent Lab Orders">
                <Table headers={["Ordered", "Test", "Status", "Doctor", "Amount"]}>
                  {labs.length > 0 ? labs.slice(0, 5).map((l: any, i: number) => (
                    <TR key={i}>
                      <TD><span className="font-mono text-[11.5px]">{new Date(l.created_at).toLocaleDateString()}</span></TD>
                      <TD><span className="font-semibold text-gray-800">{l.test_name}</span></TD>
                      <TD><StatusBadge status={l.order_status || l.status} /></TD>
                      <TD><span className="text-[11.5px] text-[#64748B]">{l.doctor_name || "—"}</span></TD>
                      <TD><span className="font-mono text-[11.5px]">${l.amount?.toFixed?.(2) ?? l.amount}</span></TD>
                    </TR>
                  )) : (
                    <TR><TD colSpan={5} className="text-center text-[#64748B] py-4">No lab orders on file</TD></TR>
                  )}
                </Table>
              </Card>
            </div>

            {/* Right Column — Context Panel */}
            <div className="space-y-4">
              <Card title="Providers Involved">
                {providers.length > 0 ? providers.map((name, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-[#F1F5F9] last:border-0">
                    <div className="w-7 h-7 rounded-full bg-[#E8EDF5] flex items-center justify-center text-[10px] font-bold text-[#1E3A6E]">
                      {name.split(" ").filter(Boolean).slice(-2).map((n) => n[0]).join("")}
                    </div>
                    <div className="text-[12px] font-medium text-gray-800">{name}</div>
                  </div>
                )) : (
                  <div className="text-[11.5px] text-[#64748B] py-2">No providers on file yet</div>
                )}
              </Card>

              <Card title="Patient Details">
                <div className="space-y-1.5 text-[12px]">
                  {[
                    { l: "Blood Group", v: patientData?.blood_group },
                    { l: "Weight", v: patientData?.weight ? `${patientData.weight} kg` : null },
                    { l: "Height", v: patientData?.height ? `${patientData.height} cm` : null },
                    { l: "Emergency Contact", v: patientData?.emergency_contact },
                    { l: "Address", v: patientData?.address },
                  ].filter((r) => r.v).map(({ l, v }) => (
                    <div key={l} className="flex justify-between py-0.5 border-b border-[#F8FAFC] last:border-0 gap-2">
                      <span className="text-[#64748B] flex-shrink-0">{l}</span>
                      <span className="font-medium text-gray-800 text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Insurance Claims">
                <div className="space-y-1.5 text-[12px]">
                  {insuranceClaims.length > 0 ? insuranceClaims.map((c: any, i: number) => (
                    <div key={i} className="flex justify-between py-0.5 border-b border-[#F8FAFC] last:border-0">
                      <span className="text-[#64748B]">{c.payer || "Claim"}</span>
                      <StatusBadge status={c.status || "submitted"} />
                    </div>
                  )) : (
                    <div className="text-[11.5px] text-[#64748B] py-2">No insurance claims on file</div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {!loading && tab === "Timeline" && (
          <div className="max-w-2xl">
            <div className="flex items-center gap-1.5 mb-4 flex-wrap">
              {["All", "Registration", "Admission", "Consultation", "Billing", "Discharge"].map(f => (
                <button key={f} onClick={() => setTimelineFilter(f)}
                  className={`px-3 py-1 text-[11.5px] font-medium rounded-full border transition-colors
                    ${timelineFilter === f ? "bg-[#1B4FD8] text-white border-[#1B4FD8]" : "bg-white text-[#64748B] border-[#DDE2EC] hover:border-[#94A3B8]"}`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="bg-white border border-[#DDE2EC] rounded p-4">
              {timelineFiltered.length > 0 ? timelineFiltered.map((e, i, arr) => (
                <TimelineItem key={i} title={e.label} time={new Date(e.timestamp).toLocaleString()} type={e.stage || "clinical"} isLast={i === arr.length - 1} />
              )) : (
                <div className="text-[12px] text-[#64748B] py-4">No timeline events recorded.</div>
              )}
            </div>
          </div>
        )}

        {!loading && tab === "Problems" && (
          <Card title="Problem List" actions={<Btn variant="primary" size="xs">+ Add Problem</Btn>}>
            <Table headers={["Problem", "Onset", "Status", "Provider", ""]}>
              {diagnoses.length > 0 ? diagnoses.map((p: any, i: number) => (
                <TR key={i}>
                  <TD><span className="font-semibold text-gray-800">{p.diagnosis_name || p.icd10_code || "Unknown"}</span></TD>
                  <TD><span className="font-mono text-[11.5px]">{new Date(p.created_at).toLocaleDateString()}</span></TD>
                  <TD><StatusBadge status={p.is_primary ? "Active" : "Historical"} /></TD>
                  <TD><span className="text-[#64748B]">{p.doctor_name || "—"}</span></TD>
                  <TD><Btn variant="ghost" size="xs">Edit</Btn></TD>
                </TR>
              )) : (
                <TR><TD colSpan={5} className="text-center text-[#64748B] py-4">No problems recorded</TD></TR>
              )}
            </Table>
          </Card>
        )}

        {!loading && tab === "Medications" && (
          <Card title="Prescriptions" actions={
            <div className="flex gap-2">
              <Btn variant="primary" size="xs">+ Add Medication</Btn>
            </div>
          }>
            <Table headers={["Date", "Medication", "Quantity", "Status", "Prescribed By", ""]}>
              {medications.length > 0 ? medications.map((m: any, i: number) => (
                <TR key={i}>
                  <TD><span className="font-mono text-[11.5px]">{new Date(m.created_at).toLocaleString()}</span></TD>
                  <TD><span className="font-semibold text-gray-800">{m.medicine_name}</span></TD>
                  <TD><span className="font-mono text-[11.5px] text-[#64748B]">{m.quantity}</span></TD>
                  <TD><StatusBadge status={m.status || "pending"} /></TD>
                  <TD><span className="text-[12px] text-[#64748B]">{m.doctor_username || "—"}</span></TD>
                  <TD>
                    <div className="flex gap-1">
                      <Btn variant="ghost" size="xs">Edit</Btn>
                    </div>
                  </TD>
                </TR>
              )) : (
                <TR><TD colSpan={6} className="text-center text-[#64748B] py-4">No prescriptions found</TD></TR>
              )}
            </Table>
          </Card>
        )}

        {!loading && tab === "Labs" && (
          <Card title="Laboratory Orders" actions={
            <div className="flex gap-2">
              <Btn variant="primary" size="xs" onClick={openOrder}>+ Order Lab</Btn>
            </div>
          }>
            <Table headers={["Test", "Doctor", "Order Status", "Payment Status", "Amount", "Collected", "Reported"]}>
              {labs.length > 0 ? labs.map((l: any, i: number) => (
                <TR key={i}>
                  <TD><span className="font-medium text-gray-700">{l.test_name}</span></TD>
                  <TD>{l.doctor_name || "—"}</TD>
                  <TD><StatusBadge status={l.order_status || "ordered"} /></TD>
                  <TD><StatusBadge status={l.status || "due"} /></TD>
                  <TD><span className="font-mono text-[11.5px]">${l.amount?.toFixed?.(2) ?? l.amount}</span></TD>
                  <TD><span className="font-mono text-[11px] text-[#94A3B8]">{l.collected_at ? new Date(l.collected_at).toLocaleString() : "—"}</span></TD>
                  <TD><span className="font-mono text-[11px] text-[#94A3B8]">{l.reported_at ? new Date(l.reported_at).toLocaleString() : "—"}</span></TD>
                </TR>
              )) : (
                <TR><TD colSpan={7} className="text-center text-[#64748B] py-4">No lab orders on file</TD></TR>
              )}
            </Table>
          </Card>
        )}

        {!loading && tab === "Orders" && (
          <Card title="Active & Recent Orders" actions={
            <div className="flex gap-2">
              <Btn variant="primary" size="xs" onClick={openOrder}>+ New Order</Btn>
            </div>
          }>
            <Table headers={["Type", "Order", "Status", "Provider", "Time"]}>
              {(medications.length === 0 && labs.length === 0) && (
                <TR><TD colSpan={5} className="text-center text-[#64748B] py-4">No orders on file</TD></TR>
              )}
              {medications.map((m: any, i: number) => (
                <TR key={`med-${i}`}>
                  <TD>
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide bg-[#DCFCE7] text-[#15803D]">
                      Medication
                    </span>
                  </TD>
                  <TD><span className="font-medium text-gray-800">{m.medicine_name}</span></TD>
                  <TD><StatusBadge status={m.status || "pending"} /></TD>
                  <TD><span className="text-[#64748B] text-[11.5px]">{m.doctor_username || "—"}</span></TD>
                  <TD><span className="font-mono text-[11px] text-[#94A3B8]">{new Date(m.created_at).toLocaleString()}</span></TD>
                </TR>
              ))}
              {labs.map((l: any, i: number) => (
                <TR key={`lab-${i}`}>
                  <TD>
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide bg-[#EDE9FE] text-[#6D28D9]">
                      Lab
                    </span>
                  </TD>
                  <TD><span className="font-medium text-gray-800">{l.test_name}</span></TD>
                  <TD><StatusBadge status={l.order_status || "ordered"} /></TD>
                  <TD><span className="text-[#64748B] text-[11.5px]">{l.doctor_name || "—"}</span></TD>
                  <TD><span className="font-mono text-[11px] text-[#94A3B8]">{new Date(l.created_at).toLocaleString()}</span></TD>
                </TR>
              ))}
            </Table>
          </Card>
        )}

        {!loading && tab === "Billing" && (
          <Card title="Invoices">
            <Table headers={["Invoice #", "Module", "Total", "Paid", "Due", "Status", "Date"]}>
              {(emrData?.invoices || []).length > 0 ? (emrData?.invoices || []).map((inv: any, i: number) => (
                <TR key={i}>
                  <TD><span className="font-mono text-[11.5px]">{inv.invoice_no}</span></TD>
                  <TD>{inv.module}</TD>
                  <TD><span className="font-mono">${inv.total_amount?.toFixed?.(2) ?? inv.total_amount}</span></TD>
                  <TD><span className="font-mono text-[#16A34A]">${inv.paid_amount?.toFixed?.(2) ?? inv.paid_amount}</span></TD>
                  <TD><span className="font-mono text-[#DC2626]">${inv.due_amount?.toFixed?.(2) ?? inv.due_amount}</span></TD>
                  <TD><StatusBadge status={inv.payment_status} /></TD>
                  <TD><span className="font-mono text-[11px] text-[#94A3B8]">{new Date(inv.created_at).toLocaleDateString()}</span></TD>
                </TR>
              )) : (
                <TR><TD colSpan={7} className="text-center text-[#64748B] py-4">No invoices on file</TD></TR>
              )}
            </Table>
          </Card>
        )}

        {!loading && (tab !== "Summary" && tab !== "Timeline" && tab !== "Problems" && tab !== "Medications" && tab !== "Labs" && tab !== "Orders" && tab !== "Billing") && (
          <div className="bg-white border border-[#DDE2EC] rounded p-12 text-center">
            <div className="text-[#94A3B8] text-3xl mb-2">📋</div>
            <div className="text-sm font-semibold text-gray-700 mb-1">{tab}</div>
            <div className="text-[12px] text-[#64748B]">No data source connected for this section yet.</div>
          </div>
        )}
      </div>
    </div>
  );
}
