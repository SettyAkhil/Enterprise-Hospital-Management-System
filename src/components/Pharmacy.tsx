import React, { useEffect, useState } from "react";
import { QueueTab, Table, TR, TD, StatusBadge, Btn, Card } from "./shared";
import { apiFetch, reportError } from "../lib/api";
import type { Notice } from "../types";

type InventoryItem = {
  id: number;
  medicine_name: string;
  batch_no: string;
  quantity: number;
  reorder_level: number;
  unit_price: number;
  expiry_date: string | null;
  stock_condition: string;
};

type Medicine = { name: string; dosage: string; quantity: number };

type Prescription = {
  id: number;
  patient_id: string;
  patient_name: string;
  patient_last_name: string | null;
  doctor_username: string;
  medicines_json: string;
  status: string;
  created_at: string;
  fulfilled_at: string | null;
};

type Summary = {
  damaged_stock_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  sales_total: number;
};

function parseMedicines(json: string): Medicine[] {
  try {
    return JSON.parse(json) || [];
  } catch {
    return [];
  }
}

export default function Pharmacy() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activeQueue, setActiveQueue] = useState(0);
  const [fulfilling, setFulfilling] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch<{ items: InventoryItem[] }>("/api/pharmacy/inventory"),
      apiFetch<{ prescriptions: Prescription[] }>("/api/pharmacy/prescriptions"),
      apiFetch<Summary>("/api/pharmacy/summary"),
    ])
      .then(([invRes, presRes, summaryRes]) => {
        setInventory(invRes.items || []);
        setPrescriptions(presRes.prescriptions || []);
        setSummary(summaryRes);
      })
      .catch((error) => reportError(setNotice, error, "Unable to load pharmacy data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const pending = prescriptions.filter((p) => p.status === "pending");
  const fulfilled = prescriptions.filter((p) => p.status === "fulfilled");
  const lowStock = inventory.filter((i) => i.quantity <= i.reorder_level);

  const QUEUES = [
    { label: "Pending", count: pending.length },
    { label: "Fulfilled", count: fulfilled.length },
    { label: "Low Stock", count: lowStock.length },
  ];

  const visiblePrescriptions = activeQueue === 0 ? pending : activeQueue === 1 ? fulfilled : [];

  const handleFulfill = async (id: number) => {
    setFulfilling(id);
    try {
      await apiFetch(`/api/pharmacy/prescriptions/${id}/fulfill`, { method: "POST", body: JSON.stringify({}) });
      setNotice({ type: "success", message: "Prescription fulfilled and stock updated." });
      load();
    } catch (error) {
      reportError(setNotice, error as { status?: number; message?: string }, "Unable to fulfill prescription.");
    } finally {
      setFulfilling(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      {notice && (
        <div className={`p-3 mx-6 mt-3 rounded-lg text-[12px] font-medium flex items-center justify-between ${notice.type === "error" ? "bg-red-50 text-red-800 border border-red-200" : notice.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}>
          <span>{notice.message}</span>
          <button className="underline" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Pharmacy</h1>
          <p className="text-[11.5px] text-[#64748B]">Inventory and prescriptions — live from the connected database</p>
        </div>
        <Btn variant="outline" size="sm" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</Btn>
      </div>

      {/* Queue Tabs */}
      <div className="bg-white border-b border-[#DDE2EC] flex">
        {QUEUES.map((q, i) => (
          <QueueTab key={q.label} label={q.label} count={q.count} active={activeQueue === i} onClick={() => setActiveQueue(i)} />
        ))}
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {activeQueue !== 2 ? (
            <Card title={activeQueue === 0 ? "Pending Prescriptions" : "Fulfilled Prescriptions"}>
              <Table headers={["Patient", "Medicines", "Prescribed By", "Date", "Status", ""]}>
                {!loading && visiblePrescriptions.length === 0 && (
                  <TR><TD colSpan={6} className="text-center text-[#64748B] py-6">No prescriptions in this queue.</TD></TR>
                )}
                {visiblePrescriptions.map((p) => {
                  const meds = parseMedicines(p.medicines_json);
                  return (
                    <TR key={p.id}>
                      <TD>
                        <div>
                          <div className="font-semibold text-gray-800 text-[12.5px]">{p.patient_name} {p.patient_last_name || ""}</div>
                          <div className="font-mono text-[10.5px] text-[#94A3B8]">{p.patient_id}</div>
                        </div>
                      </TD>
                      <TD>
                        <div className="flex flex-col gap-0.5">
                          {meds.map((m, i) => (
                            <span key={i} className="text-[11.5px] text-gray-700">{m.name} {m.dosage ? `(${m.dosage})` : ""} × {m.quantity}</span>
                          ))}
                        </div>
                      </TD>
                      <TD><span className="text-[#64748B] text-[11.5px]">{p.doctor_username}</span></TD>
                      <TD><span className="font-mono text-[11px] text-[#94A3B8]">{new Date(p.created_at).toLocaleDateString()}</span></TD>
                      <TD><StatusBadge status={p.status} /></TD>
                      <TD>
                        {p.status === "pending" && (
                          <Btn variant="primary" size="xs" onClick={() => void handleFulfill(p.id)} disabled={fulfilling === p.id}>
                            {fulfilling === p.id ? "Fulfilling…" : "Fulfill"}
                          </Btn>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </Table>
            </Card>
          ) : (
            <Card title="Low Stock Items">
              <Table headers={["Medicine", "Batch", "Quantity", "Reorder Level", "Unit Price", "Expiry", "Condition"]}>
                {!loading && lowStock.length === 0 && (
                  <TR><TD colSpan={7} className="text-center text-[#64748B] py-6">No items below reorder level.</TD></TR>
                )}
                {lowStock.map((item) => (
                  <TR key={item.id}>
                    <TD><span className="font-semibold text-gray-800">{item.medicine_name}</span></TD>
                    <TD><span className="font-mono text-[11.5px] text-[#64748B]">{item.batch_no}</span></TD>
                    <TD><span className="font-mono font-semibold text-[#DC2626]">{item.quantity}</span></TD>
                    <TD><span className="font-mono text-[11.5px]">{item.reorder_level}</span></TD>
                    <TD><span className="font-mono text-[11.5px]">${item.unit_price?.toFixed?.(2) ?? item.unit_price}</span></TD>
                    <TD><span className="font-mono text-[11px] text-[#94A3B8]">{item.expiry_date || "—"}</span></TD>
                    <TD><StatusBadge status={item.stock_condition} /></TD>
                  </TR>
                ))}
              </Table>
            </Card>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <Card title="Pharmacy Workload">
            <div className="space-y-2 text-[12px]">
              {[
                { label: "Pending prescriptions", value: pending.length, color: "#D97706" },
                { label: "Low stock items", value: summary?.low_stock_count ?? 0, color: "#DC2626" },
                { label: "Out of stock", value: summary?.out_of_stock_count ?? 0, color: "#B91C1C" },
                { label: "Damaged stock", value: summary?.damaged_stock_count ?? 0, color: "#7C3AED" },
              ].map((w) => (
                <div key={w.label} className="flex items-center justify-between py-1 border-b border-[#F8FAFC] last:border-0">
                  <span className="text-[#64748B]">{w.label}</span>
                  <span className="font-mono font-semibold text-[14px]" style={{ color: w.color }}>{loading ? "—" : w.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-1 pt-2 mt-1 border-t border-[#E2E8F0]">
                <span className="text-[#64748B] font-medium">Total sales</span>
                <span className="font-mono font-bold text-[14px] text-[#16A34A]">{loading ? "—" : `$${summary?.sales_total?.toFixed?.(2) ?? summary?.sales_total ?? 0}`}</span>
              </div>
            </div>
          </Card>

          <Card title="Inventory">
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {!loading && inventory.length === 0 && (
                <div className="text-center text-[12px] text-[#64748B] py-4">No inventory items on file.</div>
              )}
              {inventory.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9] last:border-0">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-gray-800 truncate">{item.medicine_name}</div>
                    <div className="text-[10.5px] text-[#94A3B8] font-mono">Batch {item.batch_no}</div>
                  </div>
                  <span className={`font-mono text-[12px] font-semibold flex-shrink-0 ${item.quantity <= item.reorder_level ? "text-[#DC2626]" : "text-gray-700"}`}>
                    {item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
