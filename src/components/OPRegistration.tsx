import React, { useEffect, useState } from "react";
import { Icon } from "./icons";
import { Btn, Input } from "./shared";
import { apiFetch, reportError } from "../lib/api";
import type { Notice } from "../types";

const calculateAge = (dobString: string): number => {
  if (!dobString) return 0;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return Math.max(0, age);
};

type PatientMatch = {
  patient_id: string;
  full_name: string;
  phone: string;
  gender: string;
  age: number | null;
  dob: string | null;
  total_op_visits: number;
};

type OPVisit = {
  id: number;
  patient_id: string;
  patient_name: string;
  patient_age: number | null;
  patient_gender: string | null;
  patient_phone: string | null;
  department: string | null;
  token_no: number | null;
  appointment_kind: string;
  status: string;
  created_at: string;
};

export default function OPRegistration({ onProceedToQueue }: { onProceedToQueue?: () => void }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [activeTab, setActiveTab] = useState<"new" | "revisit" | "records">("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientMatch[]>([]);

  const [visits, setVisits] = useState<OPVisit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<OPVisit | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [generationAlert, setGenerationAlert] = useState<{
    type: "new" | "revisit";
    patientId: string;
    tokenNo: number;
    name: string;
    age: number;
    phone: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dob: "",
    age: 0,
    sex: "" as "Male" | "Female" | "Other" | "",
    phone: "",
  });
  const [matchingExistingPatient, setMatchingExistingPatient] = useState<PatientMatch | null>(null);

  const cardPreviewRef = React.useRef<HTMLDivElement>(null);

  const loadVisits = () => {
    apiFetch<{ appointments: OPVisit[] }>("/api/appointments?visit_type=OP")
      .then((data) => {
        const list = data.appointments || [];
        setVisits(list);
        setSelectedVisit((prev) => prev || list[0] || null);
      })
      .catch((error) => reportError(setNotice, error, "Unable to load OP visits."));
  };

  useEffect(() => { loadVisits(); }, []);

  // Live duplicate-check as the new-patient form name fills in
  useEffect(() => {
    const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(" ").trim();
    if (fullName.length < 3 && formData.phone.trim().length < 7) {
      setMatchingExistingPatient(null);
      return;
    }
    const term = fullName.length >= 3 ? fullName : formData.phone.trim();
    const handle = setTimeout(() => {
      apiFetch<{ matches: PatientMatch[] }>(`/api/op/patients/check-match?q=${encodeURIComponent(term)}`)
        .then((data) => {
          const exact = (data.matches || []).find(
            (m) => m.full_name.toLowerCase() === fullName.toLowerCase() || (formData.phone.trim().length >= 7 && m.phone === formData.phone.trim()),
          );
          setMatchingExistingPatient(exact || null);
        })
        .catch(() => setMatchingExistingPatient(null));
    }, 350);
    return () => clearTimeout(handle);
  }, [formData.firstName, formData.middleName, formData.lastName, formData.phone]);

  // Revisit-tab search
  useEffect(() => {
    if (activeTab !== "revisit") return;
    const handle = setTimeout(() => {
      apiFetch<{ matches: PatientMatch[] }>(`/api/op/patients/check-match?q=${encodeURIComponent(searchQuery)}`)
        .then((data) => setSearchResults(data.matches || []))
        .catch((error) => reportError(setNotice, error, "Search failed."));
    }, 250);
    return () => clearTimeout(handle);
  }, [searchQuery, activeTab]);

  const resetForm = () => {
    setFormData({ firstName: "", middleName: "", lastName: "", dob: "", age: 0, sex: "", phone: "" });
    setMatchingExistingPatient(null);
  };

  const showGenerated = (type: "new" | "revisit", patientId: string, tokenNo: number, name: string, age: number, phone: string) => {
    setGenerationAlert({ type, patientId, tokenNo, name, age, phone });
    setActiveTab("records");
    loadVisits();
    setTimeout(() => cardPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };

  const handleCreateRevisitEncounter = async (p: PatientMatch) => {
    setSubmitting(true);
    try {
      const res = await apiFetch<{ appointment_id: number; op_number: number; patient_id: string }>("/api/op/visits", {
        method: "POST",
        body: JSON.stringify({ patient_id: p.patient_id, appointment: {} }),
      });
      showGenerated("revisit", p.patient_id, res.op_number, p.full_name, p.age || 0, p.phone);
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to create revisit encounter.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterNewPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.dob) return;

    if (matchingExistingPatient) {
      await handleCreateRevisitEncounter(matchingExistingPatient);
      resetForm();
      return;
    }

    setSubmitting(true);
    try {
      const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(" ").trim();
      const res = await apiFetch<{ appointment_id: number; op_number: number; patient_id: string }>("/api/op/visits", {
        method: "POST",
        body: JSON.stringify({
          patient: {
            name: formData.firstName.trim(),
            middle_name: formData.middleName.trim(),
            last_name: formData.lastName.trim(),
            dob: formData.dob,
            age: formData.age,
            gender: formData.sex || "Other",
            phone: formData.phone.trim(),
          },
          appointment: {},
        }),
      });
      showGenerated("new", res.patient_id, res.op_number, fullName, formData.age, formData.phone.trim());
      resetForm();
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to register patient.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewVisit = (visit: OPVisit) => {
    setSelectedVisit(visit);
    setActiveTab("records");
    setTimeout(() => cardPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <h1 className="text-base font-semibold text-gray-900">OP Management — Registration Desk</h1>
        <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-[#DDE2EC]">
          <button onClick={() => setActiveTab("new")} className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-all ${activeTab === "new" ? "bg-white text-[#1B4FD8] shadow-xs" : "text-gray-600 hover:text-gray-900"}`}>
            + New OP Registration
          </button>
          <button onClick={() => setActiveTab("revisit")} className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-all ${activeTab === "revisit" ? "bg-white text-[#1B4FD8] shadow-xs" : "text-gray-600 hover:text-gray-900"}`}>
            🔄 Existing Patient Revisit
          </button>
          <button onClick={() => setActiveTab("records")} className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-all ${activeTab === "records" ? "bg-white text-[#1B4FD8] shadow-xs" : "text-gray-600 hover:text-gray-900"}`}>
            📋 OP Book &amp; Log ({visits.length})
          </button>
        </div>
      </div>

      {notice && (
        <div className={`mx-6 mt-3 p-3 rounded-lg text-[12px] font-medium flex items-center justify-between flex-shrink-0 ${notice.type === "error" ? "bg-red-50 text-red-800 border border-red-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}>
          <span>{notice.message}</span>
          <button className="underline" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">

        {generationAlert && (
          <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xs ${generationAlert.type === "new" ? "bg-[#F0FDF4] border-[#86EFAC] text-[#166534]" : "bg-[#EFF6FF] border-[#BFDBFE] text-[#1E3A8A]"}`}>
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
                <span>Patient ID: <strong className="font-mono text-[#1B4FD8]">{generationAlert.patientId}</strong></span>
                <span>·</span>
                <span>Token: <strong className="font-mono text-[#D97706]">#{generationAlert.tokenNo}</strong></span>
                <span>·</span>
                <span>Phone: <strong>{generationAlert.phone || "—"}</strong></span>
              </div>
            </div>
            <button onClick={() => setGenerationAlert(null)} className="text-xs px-2.5 py-1 rounded bg-white/80 hover:bg-white border font-semibold">Dismiss</button>
          </div>
        )}

        {activeTab === "new" && (
          <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-7 shadow-xl space-y-6 ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <h2 className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-mono">1</span>
                OP Patient Registration Form
              </h2>
            </div>

            <form onSubmit={(e) => void handleRegisterNewPatient(e)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[12px] font-semibold text-gray-800 block mb-1.5">First Name <span className="text-red-500">*</span></label>
                  <Input value={formData.firstName} onChange={v => setFormData({ ...formData, firstName: v })} placeholder="e.g. John" />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-gray-800 block mb-1.5">Middle Name <span className="text-[11px] text-[#64748B] font-normal">(Optional)</span></label>
                  <Input value={formData.middleName} onChange={v => setFormData({ ...formData, middleName: v })} placeholder="e.g. Robert" />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-gray-800 block mb-1.5">Last Name <span className="text-red-500">*</span></label>
                  <Input value={formData.lastName} onChange={v => setFormData({ ...formData, lastName: v })} placeholder="e.g. Smith" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[12px] font-semibold text-gray-800 block mb-1.5">Date of Birth (DOB) <span className="text-red-500">*</span></label>
                  <input type="date" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value, age: calculateAge(e.target.value) })} max={new Date().toISOString().split("T")[0]}
                    className="w-full border border-[#94A3B8] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#1B4FD8] focus:ring-2 focus:ring-blue-100 font-medium text-gray-900" required />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-gray-800 block mb-1.5">Age (Years)</label>
                  <div className="relative">
                    <input type="number" value={formData.age} readOnly disabled className="w-full border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] bg-[#F1F5F9] text-gray-800 font-bold font-mono cursor-not-allowed select-none" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">yrs</span>
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-gray-800 block mb-1.5">Gender / Sex <span className="text-red-500">*</span></label>
                  <select value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value as "Male" | "Female" | "Other" })}
                    className="w-full border border-[#94A3B8] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#1B4FD8] focus:ring-2 focus:ring-blue-100 font-medium text-gray-900" required>
                    <option value="" disabled>Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-gray-800 block mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                  <Input value={formData.phone} onChange={v => setFormData({ ...formData, phone: v })} placeholder="e.g. (617) 555-0192" />
                </div>
              </div>

              {matchingExistingPatient ? (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚠️</span>
                      <span className="text-[13px] font-bold text-amber-950">Patient Already Exists in Database!</span>
                      <span className="text-[11px] font-mono font-bold bg-amber-200/80 px-2 py-0.5 rounded border border-amber-400 text-amber-900">{matchingExistingPatient.patient_id}</span>
                    </div>
                    <div className="text-[12px] text-amber-900">
                      Active record found for <strong>{matchingExistingPatient.full_name}</strong> ({matchingExistingPatient.age ?? "—"} yrs · {matchingExistingPatient.gender} · Phone: {matchingExistingPatient.phone || "—"}). {matchingExistingPatient.total_op_visits} past OP visits on record.
                    </div>
                    <div className="text-[11.5px] text-amber-800">
                      To preserve lifetime medical history under <strong>{matchingExistingPatient.patient_id}</strong>, generate a <strong>Revisit visit</strong>.
                    </div>
                  </div>
                  <button type="button" onClick={() => void handleCreateRevisitEncounter(matchingExistingPatient)} disabled={submitting}
                    className="px-4 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white text-[12.5px] font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50">
                    <span>🔄</span> Generate Revisit ({matchingExistingPatient.patient_id})
                  </button>
                </div>
              ) : (
                formData.firstName.trim().length >= 2 && formData.lastName.trim().length >= 2 && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-emerald-900 text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold text-sm">✓</span>
                      <span><strong>New Patient:</strong> No existing record found for <strong>{formData.firstName} {formData.lastName}</strong>. System will issue a new permanent patient ID &amp; visit token.</span>
                    </div>
                    <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">✨ New Patient</span>
                  </div>
                )
              )}

              <div className="pt-4 border-t border-[#E2E8F0] flex justify-center items-center">
                <button type="submit" disabled={submitting}
                  className={`px-8 py-3 font-bold text-[14px] rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-50 ${matchingExistingPatient ? "bg-[#D97706] hover:bg-[#B45309] text-white" : "bg-[#16A34A] hover:bg-[#15803D] text-white"}`}>
                  {submitting ? (
                    <>Saving…</>
                  ) : matchingExistingPatient ? (
                    <><span>🔄</span> Patient Exists — Generate Revisit Encounter ({matchingExistingPatient.patient_id})</>
                  ) : (
                    <><span>✓</span> Register OP &amp; Generate Patient ID</>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "revisit" && (
          <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-7 shadow-xl space-y-6 ring-1 ring-slate-900/5">
            <div className="border-b border-[#E2E8F0] pb-4">
              <h2 className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1B4FD8] text-white text-[12px] flex items-center justify-center font-mono">2</span>
                Existing Patient Revisit (Keep Old Patient ID ➔ Generate New Token)
              </h2>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Search the live database by name, patient ID, or phone. The permanent <strong>patient ID stays unchanged</strong>, and a <strong>new visit token</strong> is generated for today.
              </p>
            </div>

            <div className="max-w-2xl">
              <Input value={searchQuery} onChange={setSearchQuery} placeholder="Search by Patient Name, ID (e.g. PAT-100001), or Phone..." icon={<Icon.Search />} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                <div className="col-span-2 text-center text-[12.5px] text-[#94A3B8] py-6">No matching patients found.</div>
              )}
              {searchResults.map((p) => (
                <div key={p.patient_id} className="p-4 border border-[#DDE2EC] rounded-xl hover:border-[#1B4FD8] transition-all bg-white shadow-xs">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-[14px] text-gray-900">{p.full_name}</div>
                      <div className="text-[12px] text-[#64748B]">{p.age ?? "—"} yrs · {p.phone || "—"}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-[11.5px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded block">{p.patient_id}</span>
                      <span className="text-[10px] text-[#64748B]">Patient ID</span>
                    </div>
                  </div>
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 my-2.5 text-[11.5px]">
                    <span className="font-semibold text-gray-700">Past OP Visits On Record: </span>
                    <span className="font-mono text-[#D97706]">{p.total_op_visits}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-[#F1F5F9]">
                    <span className="text-[11.5px] text-[#16A34A] font-semibold">✓ Retain {p.patient_id}</span>
                    <button onClick={() => void handleCreateRevisitEncounter(p)} disabled={submitting}
                      className="px-3.5 py-1.5 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50">
                      <span>🔄</span> Generate New Visit ➔
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "records" && (
          <div className="space-y-6">
            {selectedVisit && (
              <div ref={cardPreviewRef} className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-6 shadow-xl space-y-4 ring-1 ring-slate-900/5">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2"><span>📖</span> Official Outpatient OP Book Pass</h3>
                    <p className="text-[11.5px] text-[#64748B]">Shows the patient's permanent ID alongside this visit's token.</p>
                  </div>
                  <div className="flex gap-2">
                    <Btn variant="outline" size="sm" onClick={() => window.print()}><Icon.Download /> Print OP Pass</Btn>
                    {onProceedToQueue && (
                      <Btn variant="primary" size="sm" onClick={onProceedToQueue}>Proceed to Queue &amp; Doctor Consultation →</Btn>
                    )}
                  </div>
                </div>

                <div className="max-w-xl mx-auto bg-white border-2 border-[#94A3B8] text-gray-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden ring-2 ring-blue-500/10">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1B4FD8]"></div>
                  <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3.5 mb-4">
                    <div className="flex items-center gap-2.5">
                      <img src="/logo.png" alt="HospAI" className="w-8 h-8 object-contain" />
                      <div>
                        <div className="font-bold text-[14px] text-gray-900">HospAI General Hospital</div>
                        <div className="text-[10px] text-[#64748B]">Official Outpatient (OP) Record Pass</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-[#64748B]">Registration Date</div>
                      <div className="text-[12px] font-mono font-bold text-gray-900">{new Date(selectedVisit.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-[12.5px] mb-4">
                    <div>
                      <div className="text-[10px] uppercase text-[#64748B] font-bold tracking-wider">Patient Name</div>
                      <div className="text-[16px] font-bold text-gray-900 mt-0.5">{selectedVisit.patient_name}</div>
                      <div className="text-[11.5px] text-gray-600 mt-0.5 font-medium">
                        Age: <strong>{selectedVisit.patient_age ?? "—"} yrs</strong> · Sex: <strong>{selectedVisit.patient_gender || "—"}</strong> · Phone: <strong>{selectedVisit.patient_phone || "—"}</strong>
                      </div>
                      <div className="text-[11px] font-semibold mt-1">
                        Dept: <span className={selectedVisit.department ? "text-[#1B4FD8]" : "text-amber-600"}>{selectedVisit.department || "Awaiting Triage"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase text-[#64748B] font-bold tracking-wider">Permanent Patient ID</div>
                      <div className="text-[15px] font-mono font-bold text-[#1B4FD8] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 inline-block mt-0.5">{selectedVisit.patient_id}</div>
                      <div className="text-[10px] uppercase text-[#64748B] font-bold tracking-wider mt-2.5">Visit Token</div>
                      <div className="text-[15px] font-mono font-bold text-[#D97706] bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 inline-block mt-0.5">#{selectedVisit.token_no ?? "—"}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-[#E2E8F0] text-[11px] text-[#64748B]">
                    <span>Status: <strong className="text-[#166534] font-mono font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200 capitalize">{selectedVisit.status.replace("_", " ")}</strong></span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl shadow-xl overflow-hidden ring-1 ring-slate-900/5">
              <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
                <div>
                  <h3 className="text-[13.5px] font-bold text-gray-900">Database Visit Registry</h3>
                  <p className="text-[11px] text-[#64748B]">All registered outpatients with permanent ID and visit tokens.</p>
                </div>
                <span className="text-[11.5px] text-[#64748B]">Total: {visits.length} Database Records</span>
              </div>
              <table className="w-full text-left">
                <thead className="border-b border-[#DDE2EC] bg-[#FAFAFA]">
                  <tr>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Patient ID</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Token</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Patient Name</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Age</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Type</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Time</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                  {visits.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-[#94A3B8]">No OP visits registered yet.</td></tr>
                  )}
                  {visits.map((v) => (
                    <tr key={v.id} onClick={() => handleViewVisit(v)} className={`hover:bg-[#F8FAFC] cursor-pointer transition-colors ${selectedVisit?.id === v.id ? "bg-[#EFF6FF]" : ""}`}>
                      <td className="px-4 py-3 font-mono font-bold text-[#1B4FD8]">{v.patient_id}</td>
                      <td className="px-4 py-3 font-mono font-bold text-[#D97706]">#{v.token_no ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{v.patient_name}</td>
                      <td className="px-4 py-3 font-mono text-gray-700">{v.patient_age ?? "—"} yrs</td>
                      <td className="px-4 py-3 text-gray-700">{v.patient_phone || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${v.appointment_kind === "new" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEF3C7] text-[#B45309]"}`}>
                          {v.appointment_kind === "new" ? "New Patient" : "Revisit Encounter"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-500">{new Date(v.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={(ev) => { ev.stopPropagation(); handleViewVisit(v); }} className="px-2.5 py-1 bg-blue-50 text-[#1B4FD8] hover:bg-blue-100 rounded text-[11.5px] font-semibold border border-blue-200 transition-colors">
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
