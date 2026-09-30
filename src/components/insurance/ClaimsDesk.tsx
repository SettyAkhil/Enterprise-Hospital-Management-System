import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Clock,
  FileWarning,
  Inbox,
  Search,
  Send,
  ShieldCheck,
  Building,
  AlertTriangle,
  Banknote,
  PlusCircle,
} from "lucide-react";
import { BillingDatabase, isCashlessEligible, type ClaimRecord } from "../../services/billingDb";
import { InsuranceEngineService } from "../../services/insuranceDb";
import { ComprehensiveClaimRecord } from "../../types/insurance";
import { BillingHeader, KpiTile, PanelTitle } from "../billing/BillingChrome";
import ClaimPanel, {
  StageBadge,
  claimAmountOf,
  claimStage,
  isInsured,
  type ClaimStage,
} from "./ClaimPanel";
import InsuranceMastersModal from "./InsuranceMastersModal";
import PreAuthWizardModal from "./PreAuthWizardModal";
import QueryManagementDesk from "./QueryManagementDesk";
import SettlementReconciliation from "./SettlementReconciliation";

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

const QUEUES: { id: string; label: string; stages: ClaimStage[] }[] = [
  { id: "all", label: "All claims", stages: [] },
  { id: "new", label: "To claim", stages: ["To claim"] },
  { id: "preauth", label: "Pre-auth", stages: ["Pre-auth needed", "Pre-auth pending"] },
  { id: "insurer", label: "With insurer", stages: ["With insurer", "Query"] },
  { id: "approved", label: "Awaiting settlement", stages: ["Approved"] },
  { id: "denied", label: "Denied / appeal", stages: ["Denied", "Appeal"] },
  { id: "settled", label: "Settled", stages: ["Settled"] },
];

const ageDays = (iso?: string) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? 0 : Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
};

export default function ClaimsDesk() {
  const [activeTab, setActiveTab] = useState<"claims" | "queries" | "settlement">("claims");
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [fullClaims, setFullClaims] = useState<ComprehensiveClaimRecord[]>(() =>
    InsuranceEngineService.getClaims()
  );

  const [queue, setQueue] = useState("all");
  const [insurer, setInsurer] = useState("All");
  const [dept, setDept] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  // Modals state
  const [showMastersModal, setShowMastersModal] = useState(false);
  const [showPreAuthWizard, setShowPreAuthWizard] = useState(false);

  const refreshData = () => {
    setClaims(BillingDatabase.getClaims());
    setFullClaims(InsuranceEngineService.getClaims());
  };

  useEffect(() => {
    refreshData();
    const unsubBilling = BillingDatabase.onUpdate(refreshData);
    const unsubEngine = InsuranceEngineService.subscribe(refreshData);
    return () => {
      unsubBilling();
      unsubEngine();
    };
  }, []);

  const notify = (message: string, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const insured = useMemo(() => claims.filter((c) => isInsured(c) && isCashlessEligible(c)), [claims]);
  const insurers = useMemo(
    () => Array.from(new Set(insured.map((c) => c.insuranceProvider))).sort(),
    [insured]
  );
  const depts = useMemo(
    () => Array.from(new Set(insured.map((c) => c.department))).sort(),
    [insured]
  );

  const scoped = useMemo(
    () =>
      insured
        .filter((c) => insurer === "All" || c.insuranceProvider === insurer)
        .filter((c) => dept === "All" || c.department === dept)
        .map((c) => ({ c, stage: claimStage(c) })),
    [insured, insurer, dept]
  );

  const counts = useMemo(() => {
    const out: Record<string, { n: number; amount: number }> = {};
    for (const q of QUEUES) out[q.id] = { n: 0, amount: 0 };
    for (const { c, stage } of scoped) {
      const amt = claimAmountOf(c);
      out.all.n++;
      out.all.amount += amt;
      for (const q of QUEUES)
        if (q.stages.includes(stage)) {
          out[q.id].n++;
          out[q.id].amount += stage === "Settled" ? c.tpa?.settledAmount ?? amt : amt;
        }
    }
    return out;
  }, [scoped]);

  const byInsurer = useMemo(() => {
    const m = new Map<string, { open: number; amount: number }>();
    for (const { c, stage } of scoped) {
      if (stage === "Settled") continue;
      const r = m.get(c.insuranceProvider) ?? { open: 0, amount: 0 };
      r.open++;
      r.amount += claimAmountOf(c);
      m.set(c.insuranceProvider, r);
    }
    return Array.from(m, ([name, r]) => ({ name, ...r })).sort((a, b) => b.amount - a.amount);
  }, [scoped]);

  const rows = useMemo(() => {
    const q = QUEUES.find((x) => x.id === queue)!;
    const term = search.trim().toLowerCase();
    return scoped
      .filter(({ stage }) => !q.stages.length || q.stages.includes(stage))
      .filter(
        ({ c }) =>
          !term ||
          [c.patientName, c.patientId, c.invoiceNo, c.id, c.insuranceProvider, c.policyNumber, c.preAuthCode]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(term))
      )
      .sort(
        (a, b) =>
          Number(b.stage === "To claim") - Number(a.stage === "To claim") ||
          ageDays(b.c.dateOfService) - ageDays(a.c.dateOfService)
      );
  }, [scoped, queue, search]);

  useEffect(() => {
    if (rows.some((r) => r.c.id === selectedId)) return;
    setSelectedId(rows[0]?.c.id ?? null);
  }, [rows, selectedId]);

  const selected = claims.find((c) => c.id === selectedId) || null;
  const activeFullClaim = fullClaims.find((c) => c.id === selectedId) || fullClaims[0];

  const selectCls =
    "h-8 px-2 text-xs font-semibold border border-[#CBD5E1] bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600 rounded";

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F1F5F9] overflow-hidden">
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 shadow-xl text-[12.5px] font-bold text-white rounded-lg ${
            toast.type === "error" ? "bg-rose-700" : "bg-emerald-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      <BillingHeader
        icon={ShieldCheck}
        title="Insurance & Claim Management Desk"
        pill="Insurance Module"
        subtitle="Complete Encounter Claim Lifecycle — Pre-Auth, Package B-11, Document Checklist, TPA Queries, and Bank Reconciliation."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreAuthWizard(true)}
              className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <PlusCircle size={14} /> Create Pre-Auth (B-11)
            </button>
            <button
              onClick={() => setShowMastersModal(true)}
              className="h-8 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Building size={14} /> Insurance Masters
            </button>
            <select
              className={selectCls}
              value={insurer}
              onChange={(e) => setInsurer(e.target.value)}
              aria-label="Insurance company"
            >
              <option value="All">All insurance companies</option>
              {insurers.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
            <select
              className={selectCls}
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              aria-label="Department"
            >
              <option value="All">All departments</option>
              {depts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        }
      />

      {/* Primary Module Tabs */}
      <div className="bg-white border-b border-slate-200 px-5 py-2 flex gap-3 text-xs font-bold shadow-2xs">
        <button
          onClick={() => setActiveTab("claims")}
          className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "claims"
              ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ShieldCheck size={14} /> Claims &amp; Encounters Desk
        </button>
        <button
          onClick={() => setActiveTab("queries")}
          className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "queries"
              ? "bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <AlertTriangle size={14} /> Claim Query Resolution Desk
        </button>
        <button
          onClick={() => setActiveTab("settlement")}
          className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "settlement"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Banknote size={14} /> Bank Settlement &amp; Reconciliation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {activeTab === "claims" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <KpiTile
                tone="blue"
                icon={Inbox}
                label="New from billing"
                value={counts.new.n}
                sub={`${inr(counts.new.amount)} to claim`}
                onClick={() => setQueue("new")}
              />
              <KpiTile
                tone="sky"
                icon={Send}
                label="With insurers"
                value={inr(counts.insurer.amount)}
                sub={`${counts.insurer.n} under review`}
                onClick={() => setQueue("insurer")}
              />
              <KpiTile
                tone="purple"
                icon={Clock}
                label="Awaiting settlement"
                value={inr(counts.approved.amount)}
                sub={`${counts.approved.n} approved`}
                onClick={() => setQueue("approved")}
              />
              <KpiTile
                tone="rose"
                icon={FileWarning}
                label="Denied / appeal"
                value={counts.denied.n}
                sub="need follow-up"
                onClick={() => setQueue("denied")}
              />
              <KpiTile
                tone="emerald"
                icon={BadgeCheck}
                label="Settled"
                value={inr(counts.settled.amount)}
                sub={`${counts.settled.n} claims`}
                onClick={() => setQueue("settled")}
              />
            </div>

            {byInsurer.length > 0 && (
              <section className="bg-white border border-[#CBD5E1] shadow-2xs">
                <PanelTitle title="Outstanding by insurance company" count={byInsurer.length} />
                <div className="flex flex-wrap gap-px bg-[#E2E8F0]">
                  {byInsurer.map((b) => (
                    <button
                      key={b.name}
                      type="button"
                      onClick={() => setInsurer(insurer === b.name ? "All" : b.name)}
                      className={`flex-1 min-w-[170px] text-left px-4 py-2.5 cursor-pointer transition-colors ${
                        insurer === b.name ? "bg-blue-50" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-[12px] font-bold text-slate-900 truncate">{b.name}</div>
                      <div className="text-[11.5px] text-slate-500">
                        <span className="font-mono font-bold text-slate-900">{inr(b.amount)}</span> · {b.open} open
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="bg-white border border-[#CBD5E1] p-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {QUEUES.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setQueue(q.id)}
                    className={`px-3 py-1.5 text-[12.5px] font-bold border whitespace-nowrap flex items-center gap-2 cursor-pointer transition-colors ${
                      queue === q.id
                        ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {q.label}
                    <span
                      className={`px-1.5 text-[11px] font-mono font-bold ${
                        queue === q.id
                          ? "bg-white text-blue-900"
                          : "bg-blue-100 text-blue-900 border border-blue-200"
                      }`}
                    >
                      {counts[q.id].n}
                    </span>
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Patient, UMR, claim, policy…"
                  className="pl-8 pr-3 h-8 text-xs border border-[#CBD5E1] bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600 w-64 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 min-[1700px]:grid-cols-[minmax(0,1fr)_540px] gap-4 items-start">
              <section className="bg-white border border-[#CBD5E1] shadow-2xs min-w-0">
                <PanelTitle title="Claims" count={rows.length} />
                <div className="overflow-x-auto">
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-slate-50">
                        {[
                          "Patient",
                          "Insurance / TPA",
                          "Claim no.",
                          "Claim amount",
                          "Approved",
                          "Deduction",
                          "Stage",
                          "Age",
                        ].map((h) => (
                          <th
                            key={h}
                            className={`px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap ${
                              ["Claim amount", "Approved", "Deduction", "Age"].includes(h)
                                ? "text-right"
                                : "text-left"
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                            No claims in this queue.
                          </td>
                        </tr>
                      )}
                      {rows.map(({ c, stage }) => {
                        const sel = c.id === selectedId;
                        return (
                          <tr
                            key={c.id}
                            onClick={() => setSelectedId(c.id)}
                            className={`border-b border-[#F1F5F9] cursor-pointer ${
                              sel ? "bg-blue-50" : "hover:bg-slate-50"
                            }`}
                            style={{ boxShadow: sel ? "inset 3px 0 0 #2563EB" : undefined }}
                          >
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="font-bold text-slate-900">{c.patientName}</div>
                              <div className="text-[11px] text-slate-500">
                                <span className="font-mono">{c.patientId}</span> · {c.department}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="font-semibold text-slate-800">{c.insuranceProvider}</div>
                              <div className="text-[11px] text-slate-500">
                                {c.tpa?.tpaName || c.policyNumber || "—"}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="font-mono text-slate-800">{c.id}</div>
                              <div className="text-[11px] font-mono text-slate-500">{c.invoiceNo}</div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-900">
                              {inr(claimAmountOf(c))}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                              {c.tpa?.approvedAmount !== undefined ? inr(c.tpa.approvedAmount) : "—"}
                            </td>
                            <td
                              className={`px-3 py-2.5 text-right font-mono ${
                                c.tpa?.deduction ? "text-rose-700 font-bold" : "text-slate-400"
                              }`}
                            >
                              {c.tpa?.deduction ? inr(c.tpa.deduction) : "—"}
                            </td>
                            <td className="px-3 py-2.5">
                              <StageBadge stage={stage} />
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                              {ageDays(c.tpa?.billedAt || c.dateOfService)}d
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="min-[1700px]:sticky min-[1700px]:top-0 min-w-0">
                {selected ? (
                  <>
                    <div className="bg-white border border-[#CBD5E1] border-b-0 px-4 py-3 shadow-2xs">
                      <div className="text-[14px] font-bold text-slate-900">{selected.patientName}</div>
                      <div className="text-[11.5px] text-slate-500">
                        {selected.age}y · {selected.gender} · {selected.department} ·{" "}
                        {selected.carePathway || selected.invoiceNo}
                      </div>
                    </div>
                    <ClaimPanel claim={selected} onNotify={notify} />
                  </>
                ) : (
                  <div className="bg-white border border-[#CBD5E1] shadow-2xs px-6 py-16 text-center text-[12.5px] text-slate-500">
                    Select a claim to work on it.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "queries" && <QueryManagementDesk claims={fullClaims} onRefresh={refreshData} />}

        {activeTab === "settlement" && <SettlementReconciliation claims={fullClaims} onRefresh={refreshData} />}
      </div>

      {/* Modals */}
      <InsuranceMastersModal isOpen={showMastersModal} onClose={() => setShowMastersModal(false)} />

      {activeFullClaim && (
        <PreAuthWizardModal
          isOpen={showPreAuthWizard}
          claim={activeFullClaim}
          onClose={() => setShowPreAuthWizard(false)}
          onSuccess={() => {
            setShowPreAuthWizard(false);
            notify("Pre-Auth request submitted successfully!");
            refreshData();
          }}
        />
      )}
    </div>
  );
}
