import React, { useState } from "react";
import { QueueTab, Table, TR, TD, StatusBadge, Btn, Card, MetricCard, AlertBanner } from "./shared";
import { Icon } from "./icons";

const QUEUES = [
  { label: "Verification", count: 12 },
  { label: "Pre-Auth", count: 8 },
  { label: "Pending", count: 24 },
  { label: "Approved", count: 89 },
  { label: "Denied", count: 7 },
  { label: "Appeals", count: 5 },
];

const ELIGIBILITY = [
  { patient: "Thomas Reed", mrn: "100301", payer: "Medicare", plan: "Medicare Part A", member: "1EG4-TE5-MK72", group: "—", status: "Verified", copay: "$0", ded: "$1,600 met", auth: "Not Required" },
  { patient: "John Smith", mrn: "100245", payer: "BlueCross PPO", plan: "BlueCross Select PPO", member: "BCB-28847291", group: "EMR-44102", status: "Verified", copay: "$250 inpatient", ded: "$1,200 of $2,500", auth: "Approved" },
  { patient: "Mary Jones", mrn: "100246", payer: "Aetna HMO", plan: "Aetna HealthFund", member: "AET-9920118", group: "GH-8812", status: "Verified", copay: "$300 inpatient", ded: "$0 remaining", auth: "Pending" },
  { patient: "Elena Vasquez", mrn: "100198", payer: "Medicaid", plan: "MassHealth Standard", member: "MH-0045512", group: "—", status: "Verified", copay: "$0", ded: "$0", auth: "Not Required" },
  { patient: "Patricia Okonkwo", mrn: "100149", payer: "BlueCross PPO", plan: "BlueCross Select HMO", member: "BCB-71199044", group: "GEN-2201", status: "Verification Pending", copay: "Unknown", ded: "Unknown", auth: "Required" },
  { patient: "Marcus Kim", mrn: "100377", payer: "Cigna PPO", plan: "Cigna Connect Plus", member: "CIG-4422981", group: "CORP-8821", status: "Verified", copay: "$150 inpatient", ded: "$800 of $3,000", auth: "Approved" },
];

const PRIOR_AUTHS = [
  { patient: "John Smith", mrn: "100245", service: "Inpatient Medical Admission", payer: "BlueCross PPO", submitted: "08/22/26", status: "Approved", authNum: "AUTH-2026-18845", expires: "08/28/26" },
  { patient: "Mary Jones", mrn: "100246", service: "CT Abdomen/Pelvis", payer: "Aetna HMO", submitted: "08/21/26", status: "Pending", authNum: "—", expires: "—" },
  { patient: "Thomas Reed", mrn: "100301", service: "Cardiac Catheterization", payer: "Medicare", submitted: "—", status: "Not Required", authNum: "—", expires: "—" },
  { patient: "Marcus Kim", mrn: "100377", service: "Inpatient Cardiac Monitoring", payer: "Cigna PPO", submitted: "08/20/26", status: "Approved", authNum: "CIG-2026-5541", expires: "08/27/26" },
  { patient: "Patricia Okonkwo", mrn: "100149", service: "Hip Replacement Surgery", payer: "BlueCross PPO", submitted: "08/23/26", status: "Pending", authNum: "—", expires: "—" },
  { patient: "Sandra Brown", mrn: "100331", service: "MRI Brain w/ & w/o", payer: "United PPO", submitted: "08/15/26", status: "Denied", authNum: "UH-DENIED-8231", expires: "—" },
];

export default function Insurance() {
  const [activeQueue, setActiveQueue] = useState(0);
  const [activeTab, setActiveTab] = useState<"eligibility" | "auth">("eligibility");

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Insurance & Authorization</h1>
          <p className="text-[11.5px] text-[#64748B]">Revenue Cycle · Eligibility Verification & Prior Authorization</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" size="sm">Batch Verify</Btn>
          <Btn variant="primary" size="sm">+ Prior Auth Request</Btn>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Verifications Today" value="47" sub="All admissions + new encounters" />
          <MetricCard label="Prior Auth Pending" value="8" sub="Avg 2.3 days to decision" color="#D97706" />
          <MetricCard label="Auth Approval Rate" value="91.2%" sub="↑ 3.1% vs last quarter" color="#16A34A" />
          <MetricCard label="Denials — MTD" value="7" sub="$38K at risk · 5 in appeal" color="#DC2626" />
        </div>

        {/* Alert */}
        <AlertBanner type="warning" title="Prior Auth Expiring Soon"
          body="John Smith (BCB-28847291) — Inpatient auth expires Aug 28. Review if continued stay needed." action="Extend Auth" />

        {/* Tabs */}
        <div className="bg-white border border-[#DDE2EC] rounded overflow-hidden">
          <div className="flex border-b border-[#DDE2EC]">
            <button onClick={() => setActiveTab("eligibility")}
              className={`px-5 py-2.5 text-[12.5px] font-medium border-b-2 transition-colors
                ${activeTab === "eligibility" ? "border-[#1B4FD8] text-[#1B4FD8]" : "border-transparent text-[#64748B] hover:text-gray-700"}`}>
              Eligibility Verification
            </button>
            <button onClick={() => setActiveTab("auth")}
              className={`px-5 py-2.5 text-[12.5px] font-medium border-b-2 transition-colors
                ${activeTab === "auth" ? "border-[#1B4FD8] text-[#1B4FD8]" : "border-transparent text-[#64748B] hover:text-gray-700"}`}>
              Prior Authorizations
            </button>
          </div>

          {activeTab === "eligibility" && (
            <div>
              <Table headers={["Patient", "MRN", "Payer", "Plan", "Member ID", "Copay / Ded", "Auth Status", "Eligibility", ""]}>
                {ELIGIBILITY.map((e, i) => (
                  <TR key={i}>
                    <TD><span className="font-semibold text-gray-800">{e.patient}</span></TD>
                    <TD><span className="font-mono text-[11.5px] text-[#64748B]">{e.mrn}</span></TD>
                    <TD><span className="font-medium text-[#64748B]">{e.payer}</span></TD>
                    <TD><span className="text-[11.5px] text-gray-700">{e.plan}</span></TD>
                    <TD><span className="font-mono text-[11.5px] text-[#64748B]">{e.member}</span></TD>
                    <TD>
                      <div>
                        <div className="text-[12px]">{e.copay}</div>
                        <div className="text-[11px] text-[#94A3B8]">{e.ded}</div>
                      </div>
                    </TD>
                    <TD>
                      <span className={`text-[11.5px] font-medium ${e.auth === "Approved" ? "text-[#16A34A]" : e.auth === "Pending" ? "text-[#D97706]" : e.auth === "Required" ? "text-[#DC2626]" : "text-[#64748B]"}`}>
                        {e.auth}
                      </span>
                    </TD>
                    <TD>
                      <span className={`text-[11.5px] font-semibold ${e.status === "Verified" ? "text-[#16A34A]" : "text-[#D97706]"}`}>
                        {e.status === "Verified" ? "✓ " : "⏳ "}{e.status}
                      </span>
                    </TD>
                    <TD>
                      <div className="flex gap-1">
                        <Btn variant="ghost" size="xs">View</Btn>
                        <Btn variant="ghost" size="xs">Re-verify</Btn>
                      </div>
                    </TD>
                  </TR>
                ))}
              </Table>
            </div>
          )}

          {activeTab === "auth" && (
            <div>
              {/* Queue tabs */}
              <div className="flex border-b border-[#F1F5F9] overflow-x-auto">
                {QUEUES.map((q, i) => (
                  <QueueTab key={i} label={q.label} count={q.count} active={activeQueue === i} onClick={() => setActiveQueue(i)} />
                ))}
              </div>
              <Table headers={["Patient", "MRN", "Service Requested", "Payer", "Submitted", "Auth #", "Status", "Expires", ""]}>
                {PRIOR_AUTHS.map((a, i) => (
                  <TR key={i}>
                    <TD><span className="font-semibold text-gray-800">{a.patient}</span></TD>
                    <TD><span className="font-mono text-[11.5px] text-[#64748B]">{a.mrn}</span></TD>
                    <TD><span className="text-[#64748B]">{a.service}</span></TD>
                    <TD><span className="text-[#64748B]">{a.payer}</span></TD>
                    <TD><span className="font-mono text-[11.5px]">{a.submitted}</span></TD>
                    <TD><span className="font-mono text-[11.5px] text-[#64748B]">{a.authNum}</span></TD>
                    <TD><StatusBadge status={a.status.replace(/\s/g, "")} /></TD>
                    <TD>
                      <span className={`font-mono text-[11.5px] ${a.expires !== "—" && a.expires <= "08/25/26" ? "text-[#DC2626] font-semibold" : "text-[#64748B]"}`}>
                        {a.expires}
                      </span>
                    </TD>
                    <TD>
                      <div className="flex gap-1">
                        <Btn variant="ghost" size="xs">View</Btn>
                        {a.status === "Denied" && <Btn variant="danger" size="xs">Appeal</Btn>}
                        {a.status === "Pending" && <Btn variant="outline" size="xs">Follow Up</Btn>}
                        {a.status === "Approved" && <Btn variant="outline" size="xs">Extend</Btn>}
                      </div>
                    </TD>
                  </TR>
                ))}
              </Table>
            </div>
          )}
        </div>

        {/* Denial Management */}
        <Card title="Denial Management — Active Cases">
          <div className="space-y-3">
            {[
              { patient: "Sandra Brown", service: "MRI Brain w/ & w/o", payer: "United PPO", denialReason: "Medical necessity not established", amount: "$4,200", daysLeft: 12, stage: "Appeal Filed" },
              { patient: "George Watts", service: "Extended ED Visit", payer: "Cigna PPO", denialReason: "Level of service downgraded", amount: "$1,850", daysLeft: 5, stage: "Peer Review Pending" },
              { patient: "Isabel Cruz", service: "Ankle MRI", payer: "Aetna HMO", denialReason: "Requires X-ray first (step therapy)", amount: "$2,100", daysLeft: 21, stage: "Resubmit with X-ray" },
            ].map((d, i) => (
              <div key={i} className={`border rounded p-3.5 ${d.daysLeft <= 7 ? "border-[#FECACA] bg-[#FEF2F2]" : "border-[#DDE2EC]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13px] text-gray-900">{d.patient}</span>
                      <span className="font-mono font-semibold text-[#DC2626] text-[12px]">{d.amount}</span>
                    </div>
                    <div className="text-[12px] text-gray-700 mt-0.5">{d.service} · {d.payer}</div>
                    <div className="text-[11.5px] text-[#D97706] mt-0.5">⚠ {d.denialReason}</div>
                    <div className="text-[11.5px] text-[#64748B] mt-0.5">Stage: {d.stage}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`font-mono font-semibold text-[13px] ${d.daysLeft <= 7 ? "text-[#DC2626]" : "text-[#D97706]"}`}>
                      {d.daysLeft} days left
                    </div>
                    <div className="text-[11px] text-[#94A3B8]">to appeal deadline</div>
                    <div className="flex gap-1 mt-2">
                      <Btn variant="outline" size="xs">Docs</Btn>
                      <Btn variant="danger" size="xs">Submit Appeal</Btn>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
