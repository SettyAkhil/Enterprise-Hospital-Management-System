import React, { useEffect, useState } from "react";
import { QueueTab, Table, TR, TD, StatusBadge, Btn, Card, MetricCard } from "./shared";
import { Input, Select, Modal } from "./ui";
import { apiFetch, reportError } from "../lib/api";
import type { Notice } from "../types";

type Invoice = {
  id: number;
  invoice_no: string;
  patient_id: string;
  module: string;
  doctor_name: string | null;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: string;
  created_at: string;
};

type Claim = {
  id: number;
  invoice_id: number;
  insurer_name: string;
  claim_amount: number;
  claim_status: string;
};

type RevenueSummary = {
  total_billed: number;
  total_collected: number;
  total_due: number;
  aging_buckets: { bucket_0_30: number; bucket_31_60: number; bucket_61_90: number; bucket_91_plus: number };
  payment_mode_breakdown: { count: number; label: string }[];
  collections_by_module: { count: number; label: string }[];
};

const STATUS_QUEUES = ["All", "paid", "partial", "due", "refunded"];

function currency(n: number | undefined | null) {
  return `$${(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PaymentModal({ invoice, onClose, onSaved, setNotice }: { invoice: Invoice; onClose: () => void; onSaved: () => void; setNotice: (n: Notice | null) => void }) {
  const [amount, setAmount] = useState(String(invoice.due_amount || ""));
  const [mode, setMode] = useState("cash");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setNotice({ type: "warning", message: "Enter a valid payment amount." });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/billing/invoices/${invoice.id}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount: value, payment_mode: mode }),
      });
      setNotice({ type: "success", message: `Payment of ${currency(value)} recorded for ${invoice.invoice_no}.` });
      onSaved();
      onClose();
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to record payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Record Payment — ${invoice.invoice_no}`}>
      <div className="flex flex-col gap-3 p-1">
        <div className="text-[12px] text-[#64748B]">Due: <span className="font-mono font-semibold text-[#DC2626]">{currency(invoice.due_amount)}</span></div>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">
          Amount
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">
          Payment Mode
          <Select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank Transfer</option>
          </Select>
        </label>
        <div className="flex justify-end gap-2 mt-2">
          <Btn variant="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn variant="primary" onClick={() => void submit()} disabled={saving}>{saving ? "Saving..." : "Record Payment"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

function NewClaimModal({ invoices, onClose, onSaved, setNotice }: { invoices: Invoice[]; onClose: () => void; onSaved: () => void; setNotice: (n: Notice | null) => void }) {
  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id ? String(invoices[0].id) : "");
  const [insurer, setInsurer] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!invoiceId || !insurer.trim() || !amount) {
      setNotice({ type: "warning", message: "Fill in invoice, insurer, and claim amount." });
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/billing/claims", {
        method: "POST",
        body: JSON.stringify({ invoice_id: Number(invoiceId), insurer_name: insurer.trim(), claim_amount: parseFloat(amount) }),
      });
      setNotice({ type: "success", message: "Insurance claim filed." });
      onSaved();
      onClose();
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to file claim.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="New Insurance Claim">
      <div className="flex flex-col gap-3 p-1">
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">
          Invoice
          <Select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>{inv.invoice_no} — {inv.patient_id} — {currency(inv.total_amount)}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">
          Insurer Name
          <Input value={insurer} onChange={(e) => setInsurer(e.target.value)} placeholder="e.g. BlueCross PPO" />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-gray-700">
          Claim Amount
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <div className="flex justify-end gap-2 mt-2">
          <Btn variant="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn variant="primary" onClick={() => void submit()} disabled={saving || invoices.length === 0}>{saving ? "Filing..." : "File Claim"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

export default function Billing() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [activeQueue, setActiveQueue] = useState(0);
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch<{ invoices: Invoice[] }>("/api/billing/invoices"),
      apiFetch<{ claims: Claim[] }>("/api/billing/claims"),
      apiFetch<RevenueSummary>("/api/billing/revenue-summary"),
    ])
      .then(([invRes, claimRes, summaryRes]) => {
        setInvoices(invRes.invoices || []);
        setClaims(claimRes.claims || []);
        setSummary(summaryRes);
      })
      .catch((error) => reportError(setNotice, error, "Unable to load billing data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const activeStatus = STATUS_QUEUES[activeQueue];
  const filteredInvoices = activeStatus === "All" ? invoices : invoices.filter((i) => i.payment_status === activeStatus);
  const dueInvoices = invoices.filter((i) => i.due_amount > 0);

  const aging = summary?.aging_buckets;
  const agingTotal = aging ? Object.values(aging).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      {paymentTarget && (
        <PaymentModal invoice={paymentTarget} onClose={() => setPaymentTarget(null)} onSaved={load} setNotice={setNotice} />
      )}
      {claimModalOpen && (
        <NewClaimModal invoices={dueInvoices.length > 0 ? dueInvoices : invoices} onClose={() => setClaimModalOpen(false)} onSaved={load} setNotice={setNotice} />
      )}

      {notice && (
        <div className={`p-3 mx-6 mt-3 rounded-lg text-[12px] font-medium flex items-center justify-between ${notice.type === "error" ? "bg-red-50 text-red-800 border border-red-200" : notice.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}>
          <span>{notice.message}</span>
          <button className="underline" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Billing & Claims</h1>
          <p className="text-[11.5px] text-[#64748B]">Revenue cycle — live from the connected database</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="primary" size="sm" onClick={() => setClaimModalOpen(true)} disabled={invoices.length === 0}>+ New Claim</Btn>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Financial Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total Billed" value={loading ? "—" : currency(summary?.total_billed)} sub="all invoices" />
          <MetricCard label="Total Collected" value={loading ? "—" : currency(summary?.total_collected)} color="#16A34A" sub="payments received" />
          <MetricCard label="Total Due" value={loading ? "—" : currency(summary?.total_due)} color="#D97706" sub={`${dueInvoices.length} invoices with balance`} />
          <MetricCard label="Insurance Claims" value={loading ? "—" : claims.length} color="#7C3AED" sub={claims.length === 0 ? "none filed yet" : `${claims.filter(c => c.claim_status === "submitted").length} pending`} />
        </div>

        {/* Invoice Status Queues */}
        <div className="bg-white border border-[#DDE2EC] rounded overflow-hidden">
          <div className="flex overflow-x-auto">
            {STATUS_QUEUES.map((label, i) => (
              <QueueTab
                key={label}
                label={label === "All" ? "All" : label.charAt(0).toUpperCase() + label.slice(1)}
                count={label === "All" ? invoices.length : invoices.filter((inv) => inv.payment_status === label).length}
                active={activeQueue === i}
                onClick={() => setActiveQueue(i)}
              />
            ))}
          </div>
        </div>

        {/* Invoices Table */}
        <Card title="Invoices">
          <Table headers={["Invoice #", "Patient ID", "Module", "Doctor", "Total", "Paid", "Due", "Status", "Date", ""]}>
            {!loading && filteredInvoices.length === 0 && (
              <TR><TD colSpan={10} className="text-center text-[#64748B] py-6">No invoices in this queue.</TD></TR>
            )}
            {filteredInvoices.map((inv) => (
              <TR key={inv.id}>
                <TD><span className="font-mono text-[11.5px]">{inv.invoice_no}</span></TD>
                <TD><span className="font-mono text-[11.5px] text-[#64748B]">{inv.patient_id}</span></TD>
                <TD><span className="text-[#64748B] text-[11.5px]">{inv.module}</span></TD>
                <TD><span className="text-[#64748B] text-[11.5px]">{inv.doctor_name || "—"}</span></TD>
                <TD><span className="font-mono font-semibold text-[12.5px] text-gray-800">{currency(inv.total_amount)}</span></TD>
                <TD><span className="font-mono text-[12px] text-[#16A34A]">{currency(inv.paid_amount)}</span></TD>
                <TD><span className={`font-mono font-semibold text-[12px] ${inv.due_amount > 0 ? "text-[#D97706]" : "text-[#16A34A]"}`}>{currency(inv.due_amount)}</span></TD>
                <TD><StatusBadge status={inv.payment_status} /></TD>
                <TD><span className="font-mono text-[11px] text-[#94A3B8]">{new Date(inv.created_at).toLocaleDateString()}</span></TD>
                <TD>
                  {inv.due_amount > 0 && (
                    <Btn variant="primary" size="xs" onClick={() => setPaymentTarget(inv)}>Record Payment</Btn>
                  )}
                </TD>
              </TR>
            ))}
          </Table>
        </Card>

        {/* Insurance Claims */}
        <Card title="Insurance Claims">
          <Table headers={["Invoice", "Insurer", "Claim Amount", "Status"]}>
            {claims.length === 0 ? (
              <TR><TD colSpan={4} className="text-center text-[#64748B] py-4">No claims filed yet.</TD></TR>
            ) : claims.map((c) => (
              <TR key={c.id}>
                <TD><span className="font-mono text-[11.5px]">#{c.invoice_id}</span></TD>
                <TD>{c.insurer_name}</TD>
                <TD><span className="font-mono">{currency(c.claim_amount)}</span></TD>
                <TD><StatusBadge status={c.claim_status} /></TD>
              </TR>
            ))}
          </Table>
        </Card>

        {/* Payment Mode Mix & A/R Aging */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Collections by Payment Mode">
            <div className="space-y-2">
              {(summary?.payment_mode_breakdown || []).length === 0 && (
                <div className="text-[12px] text-[#64748B] py-2">No payments recorded yet.</div>
              )}
              {(summary?.payment_mode_breakdown || []).map((p, i) => {
                const total = (summary?.payment_mode_breakdown || []).reduce((a, b) => a + b.count, 0) || 1;
                const pct = Math.round((p.count / total) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-28 text-[12px] text-gray-700 truncate capitalize">{p.label}</div>
                    <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full">
                      <div className="h-full rounded-full bg-[#1B4FD8]" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[11.5px] font-mono text-[#64748B] w-8 text-right">{pct}%</div>
                    <div className="text-[11.5px] font-mono font-semibold text-gray-800 w-20 text-right">{currency(p.count)}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="A/R Aging">
            <div className="space-y-2">
              {agingTotal === 0 && (
                <div className="text-[12px] text-[#64748B] py-2">No outstanding receivables.</div>
              )}
              {aging && agingTotal > 0 && [
                { bucket: "0–30 Days", amount: aging.bucket_0_30, color: "#16A34A" },
                { bucket: "31–60 Days", amount: aging.bucket_31_60, color: "#D97706" },
                { bucket: "61–90 Days", amount: aging.bucket_61_90, color: "#DC2626" },
                { bucket: "91+ Days", amount: aging.bucket_91_plus, color: "#7F1D1D" },
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-24 text-[12px] text-gray-700">{a.bucket}</div>
                  <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${Math.round((a.amount / agingTotal) * 100)}%`, backgroundColor: a.color }} />
                  </div>
                  <div className="text-[11.5px] font-mono text-[#64748B] w-8 text-right">{Math.round((a.amount / agingTotal) * 100)}%</div>
                  <div className="text-[11.5px] font-mono font-semibold text-gray-800 w-16 text-right">{currency(a.amount)}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
