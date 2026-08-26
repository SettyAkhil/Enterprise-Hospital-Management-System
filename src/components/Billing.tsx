import React, { useState } from "react";
import { QueueTab, Table, TR, TD, StatusBadge, Btn, Card, MetricCard } from "./shared";

const CLAIM_QUEUES = [
  { label: "Draft", count: 24 },
  { label: "Ready", count: 18 },
  { label: "Submitted", count: 43 },
  { label: "Accepted", count: 156 },
  { label: "Rejected", count: 12 },
  { label: "Denied", count: 8 },
  { label: "Appeal", count: 5 },
  { label: "Paid", count: 289 },
];

const CLAIMS = [
  { patient: "John Smith", mrn: "100245", dos: "08/22/26", ins: "BlueCross PPO", amount: "$4,280", balance: "$850", status: "Accepted", cpt: "99233, 83036" },
  { patient: "Thomas Reed", mrn: "100301", dos: "08/23/26", ins: "Medicare", amount: "$28,400", balance: "$5,680", status: "Draft", cpt: "99291, 93000" },
  { patient: "Mary Jones", mrn: "100246", dos: "08/21/26", ins: "Aetna HMO", amount: "$6,120", balance: "$1,224", status: "Submitted", cpt: "99232, 71046" },
  { patient: "Elena Vasquez", mrn: "100198", dos: "08/23/26", ins: "Medicaid", amount: "$1,840", balance: "$0", status: "Paid", cpt: "99283, 81001" },
  { patient: "George Watts", mrn: "100212", dos: "08/22/26", ins: "Cigna PPO", amount: "$3,650", balance: "$730", status: "Rejected", cpt: "99284, 93005" },
  { patient: "Sandra Brown", mrn: "100331", dos: "08/23/26", ins: "United PPO", amount: "$920", balance: "$180", status: "Appeal", cpt: "99282, 90732" },
  { patient: "Marcus Kim", mrn: "100377", dos: "08/20/26", ins: "Cigna PPO", amount: "$12,400", balance: "$2,480", status: "Accepted", cpt: "99233, 93306" },
  { patient: "Diane Walsh", mrn: "100142", dos: "08/18/26", ins: "Medicare", amount: "$2,100", balance: "$0", status: "Paid", cpt: "99213, 83036" },
];

export default function Billing() {
  const [activeQueue, setActiveQueue] = useState(0);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Billing & Claims</h1>
          <p className="text-[11.5px] text-[#64748B]">Revenue Cycle Management · General Hospital</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" size="sm">Run Report</Btn>
          <Btn variant="primary" size="sm">+ New Claim</Btn>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Financial Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total Charges MTD" value="$1.24M" sub="↑ 8% vs last month" trend="↑8%" />
          <MetricCard label="Insurance Pending" value="$438K" sub="43 claims · Avg 12 days" color="#D97706" />
          <MetricCard label="Patient Balance" value="$82K" sub="286 accounts · 38 > 90 days" color="#0284C7" />
          <MetricCard label="Denied Claims" value="126" sub="$68K at risk · 8 in appeal" color="#DC2626" action="Work Queue" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Collections Rate" value="94.2%" sub="Target: 95%" trend="↓0.8%" />
          <MetricCard label="Days in A/R" value="31.4" sub="Target: < 35 days" color="#16A34A" />
          <MetricCard label="First Pass Rate" value="87.3%" sub="↑ 2.1% vs last quarter" trend="↑2.1%" />
          <MetricCard label="Avg Claim Value" value="$2,847" sub="Inpatient: $8,240 | OP: $892" />
        </div>

        {/* Claim Queues */}
        <div className="bg-white border border-[#DDE2EC] rounded overflow-hidden">
          <div className="flex overflow-x-auto">
            {CLAIM_QUEUES.map((q, i) => (
              <QueueTab key={i} label={q.label} count={q.count} active={activeQueue === i} onClick={() => setActiveQueue(i)} />
            ))}
          </div>
        </div>

        {/* Claims Table */}
        <Card title="Claims" actions={
          <div className="flex gap-2">
            <Btn variant="outline" size="xs">Filter</Btn>
            <Btn variant="outline" size="xs">Export</Btn>
            <Btn variant="outline" size="xs">Bulk Submit</Btn>
          </div>
        }>
          <Table headers={["Patient", "MRN", "DOS", "Insurance", "CPT Codes", "Total Charges", "Balance", "Status", ""]}>
            {CLAIMS.map((c, i) => (
              <TR key={i}>
                <TD><span className="font-semibold text-gray-800">{c.patient}</span></TD>
                <TD><span className="font-mono text-[11.5px] text-[#64748B]">{c.mrn}</span></TD>
                <TD><span className="font-mono text-[11.5px]">{c.dos}</span></TD>
                <TD><span className="text-[#64748B] text-[11.5px]">{c.ins}</span></TD>
                <TD><span className="font-mono text-[11.5px] text-[#64748B]">{c.cpt}</span></TD>
                <TD><span className="font-mono font-semibold text-[12.5px] text-gray-800">{c.amount}</span></TD>
                <TD>
                  <span className={`font-mono font-semibold text-[12px] ${c.balance === "$0" ? "text-[#16A34A]" : "text-[#D97706]"}`}>{c.balance}</span>
                </TD>
                <TD><StatusBadge status={c.status} /></TD>
                <TD>
                  <div className="flex gap-1">
                    <Btn variant="ghost" size="xs">Edit</Btn>
                    {c.status === "Draft" && <Btn variant="primary" size="xs">Submit</Btn>}
                    {c.status === "Rejected" && <Btn variant="danger" size="xs">Appeal</Btn>}
                    {c.status === "Denied" && <Btn variant="danger" size="xs">Appeal</Btn>}
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
        </Card>

        {/* Payer Mix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Payer Mix — YTD">
            <div className="space-y-2">
              {[
                { payer: "BlueCross PPO", pct: 34, amount: "$4.2M", color: "#1B4FD8" },
                { payer: "Medicare", pct: 28, amount: "$3.5M", color: "#0284C7" },
                { payer: "Aetna HMO", pct: 15, amount: "$1.9M", color: "#7C3AED" },
                { payer: "Medicaid", pct: 12, amount: "$1.5M", color: "#16A34A" },
                { payer: "United PPO", pct: 7, amount: "$0.9M", color: "#D97706" },
                { payer: "Self-Pay", pct: 4, amount: "$0.5M", color: "#DC2626" },
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-28 text-[12px] text-gray-700 truncate">{p.payer}</div>
                  <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
                  </div>
                  <div className="text-[11.5px] font-mono text-[#64748B] w-8 text-right">{p.pct}%</div>
                  <div className="text-[11.5px] font-mono font-semibold text-gray-800 w-12 text-right">{p.amount}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="A/R Aging">
            <div className="space-y-2">
              {[
                { bucket: "0–30 Days", amount: "$284K", pct: 52, color: "#16A34A" },
                { bucket: "31–60 Days", amount: "$142K", pct: 26, color: "#D97706" },
                { bucket: "61–90 Days", amount: "$68K", pct: 13, color: "#DC2626" },
                { bucket: "91–120 Days", amount: "$38K", pct: 7, color: "#B91C1C" },
                { bucket: "> 120 Days", amount: "$12K", pct: 2, color: "#7F1D1D" },
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-24 text-[12px] text-gray-700">{a.bucket}</div>
                  <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${a.pct}%`, backgroundColor: a.color }} />
                  </div>
                  <div className="text-[11.5px] font-mono text-[#64748B] w-8 text-right">{a.pct}%</div>
                  <div className="text-[11.5px] font-mono font-semibold text-gray-800 w-12 text-right">{a.amount}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
