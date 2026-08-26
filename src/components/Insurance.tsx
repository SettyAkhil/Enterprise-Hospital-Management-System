import React, { useEffect, useState } from "react";
import { Table, TR, TD, StatusBadge, Btn, Card, MetricCard } from "./shared";
import { Input, Modal } from "./ui";
import { apiFetch, reportError } from "../lib/api";
import type { Notice } from "../types";

type Verification = {
  id: number;
  patient_id: string | null;
  patient_name: string;
  insurer_name: string;
  policy_number: string | null;
  member_id: string | null;
  verification_status: string;
  coverage_notes: string | null;
  created_at: string;
};

type Claim = {
  id: number;
  invoice_id: number;
  insurer_name: string;
  claim_amount: number;
  claim_status: string;
};

function currency(n: number | undefined | null) {
  return `$${(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function NewVerificationModal({ onClose, onSaved, setNotice }: { onClose: () => void; onSaved: () => void; setNotice: (n: Notice | null) => void }) {
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [insurer, setInsurer] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [memberId, setMemberId] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!patientName.trim() || !insurer.trim()) {
      setNotice({ type: "warning", message: "Patient name and insurer are required." });
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/registration/insurance", {
        method: "POST",
        body: JSON.stringify({
          patient_id: patientId.trim() || undefined,
          patient_name: patientName.trim(),
          insurer_name: insurer.trim(),
          policy_number: policyNumber.trim() || undefined,
          member_id: memberId.trim() || undefined,
          verification_status: "pending",
        }),
      });
      setNotice({ type: "success", message: "Eligibility verification request created." });
      onSaved();
      onClose();
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to create verification.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="New Eligibility Verification">
      <div className="flex flex-col gap-3 p-1">
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">Patient ID (optional)<Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="e.g. PAT-100001" /></label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">Patient Name<Input value={patientName} onChange={(e) => setPatientName(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">Insurer Name<Input value={insurer} onChange={(e) => setInsurer(e.target.value)} placeholder="e.g. BlueCross PPO" /></label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">Policy Number<Input value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">Member ID<Input value={memberId} onChange={(e) => setMemberId(e.target.value)} /></label>
        <div className="flex justify-end gap-2 mt-2">
          <Btn variant="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn variant="primary" onClick={() => void submit()} disabled={saving}>{saving ? "Saving..." : "Create Verification"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

export default function Insurance() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [activeTab, setActiveTab] = useState<"eligibility" | "auth">("eligibility");
  const [modalOpen, setModalOpen] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch<{ verifications: Verification[] }>("/api/registration/insurance"),
      apiFetch<{ claims: Claim[] }>("/api/billing/claims"),
    ])
      .then(([vRes, cRes]) => {
        setVerifications(vRes.verifications || []);
        setClaims(cRes.claims || []);
      })
      .catch((error) => reportError(setNotice, error, "Unable to load insurance data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const verified = verifications.filter((v) => v.verification_status === "verified").length;
  const pending = verifications.filter((v) => v.verification_status === "pending").length;
  const submittedClaims = claims.filter((c) => c.claim_status === "submitted").length;
  const totalClaimAmount = claims.reduce((sum, c) => sum + (c.claim_amount || 0), 0);

  const reverify = async (id: number) => {
    setUpdating(id);
    try {
      await apiFetch(`/api/registration/insurance/${id}`, { method: "PUT", body: JSON.stringify({ verification_status: "verified" }) });
      load();
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to update verification.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      {modalOpen && <NewVerificationModal onClose={() => setModalOpen(false)} onSaved={load} setNotice={setNotice} />}

      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Insurance &amp; Authorization</h1>
          <p className="text-[11.5px] text-[#64748B]">Eligibility verification and claims — live from the connected database</p>
        </div>
        <Btn variant="primary" size="sm" onClick={() => setModalOpen(true)}>+ New Verification</Btn>
      </div>

      {notice && (
        <div className={`mx-6 mt-3 p-3 rounded-lg text-[12px] font-medium flex items-center justify-between ${notice.type === "error" ? "bg-red-50 text-red-800 border border-red-200" : notice.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}>
          <span>{notice.message}</span>
          <button className="underline" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total Verifications" value={loading ? "—" : verifications.length} sub="all records" />
          <MetricCard label="Verified" value={loading ? "—" : verified} color="#16A34A" sub="eligibility confirmed" />
          <MetricCard label="Pending" value={loading ? "—" : pending} color="#D97706" sub="awaiting verification" />
          <MetricCard label="Claims Filed" value={loading ? "—" : claims.length} color="#7C3AED" sub={`${submittedClaims} submitted · ${currency(totalClaimAmount)} total`} />
        </div>

        <div className="bg-white border border-[#DDE2EC] rounded overflow-hidden">
          <div className="flex border-b border-[#DDE2EC]">
            <button onClick={() => setActiveTab("eligibility")} className={`px-5 py-2.5 text-[12.5px] font-medium border-b-2 transition-colors ${activeTab === "eligibility" ? "border-[#1B4FD8] text-[#1B4FD8]" : "border-transparent text-[#64748B] hover:text-gray-700"}`}>
              Eligibility Verification
            </button>
            <button onClick={() => setActiveTab("auth")} className={`px-5 py-2.5 text-[12.5px] font-medium border-b-2 transition-colors ${activeTab === "auth" ? "border-[#1B4FD8] text-[#1B4FD8]" : "border-transparent text-[#64748B] hover:text-gray-700"}`}>
              Insurance Claims
            </button>
          </div>

          {activeTab === "eligibility" && (
            <Table headers={["Patient", "Patient ID", "Insurer", "Policy #", "Member ID", "Status", "Date", ""]}>
              {!loading && verifications.length === 0 && (
                <TR><TD colSpan={8} className="text-center text-[#64748B] py-6">No eligibility verifications on file.</TD></TR>
              )}
              {verifications.map((v) => (
                <TR key={v.id}>
                  <TD><span className="font-semibold text-gray-800">{v.patient_name}</span></TD>
                  <TD><span className="font-mono text-[11.5px] text-[#64748B]">{v.patient_id || "—"}</span></TD>
                  <TD><span className="font-medium text-[#64748B]">{v.insurer_name}</span></TD>
                  <TD><span className="font-mono text-[11.5px] text-[#64748B]">{v.policy_number || "—"}</span></TD>
                  <TD><span className="font-mono text-[11.5px] text-[#64748B]">{v.member_id || "—"}</span></TD>
                  <TD><StatusBadge status={v.verification_status} /></TD>
                  <TD><span className="font-mono text-[11px] text-[#94A3B8]">{new Date(v.created_at).toLocaleDateString()}</span></TD>
                  <TD>
                    {v.verification_status !== "verified" && (
                      <Btn variant="outline" size="xs" onClick={() => void reverify(v.id)} disabled={updating === v.id}>
                        {updating === v.id ? "Updating…" : "Mark Verified"}
                      </Btn>
                    )}
                  </TD>
                </TR>
              ))}
            </Table>
          )}

          {activeTab === "auth" && (
            <Table headers={["Invoice", "Insurer", "Claim Amount", "Status"]}>
              {!loading && claims.length === 0 && (
                <TR><TD colSpan={4} className="text-center text-[#64748B] py-6">No claims filed yet.</TD></TR>
              )}
              {claims.map((c) => (
                <TR key={c.id}>
                  <TD><span className="font-mono text-[11.5px]">#{c.invoice_id}</span></TD>
                  <TD>{c.insurer_name}</TD>
                  <TD><span className="font-mono">{currency(c.claim_amount)}</span></TD>
                  <TD><StatusBadge status={c.claim_status} /></TD>
                </TR>
              ))}
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
