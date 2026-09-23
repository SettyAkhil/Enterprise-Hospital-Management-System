import { usePharmacyData } from "../data/usePharmacyData";
import { PharmacyDatabase } from "../../../services/pharmacyDb";
import { useState } from "react";
import { Search, X, Plus, Printer, RefreshCw, Undo2, ArrowRight, CheckCircle2, FileText, Send, Building2, Package, XCircle, RotateCcw } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import toast from "react-hot-toast";

const RETURN_REASONS = [
  "Expired",
  "Near Expiry",
  "Damaged",
  "Manufacturer Recall",
  "Wrong Supply",
  "Quality Issue",
  "Excess Stock"
];

const STATUS_ORDER = ["Draft", "Submitted", "Approved", "Sent To Supplier", "Credit Note Pending", "Credit Received", "Closed"];

export default function SupplierReturns({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { supplierReturns, suppliers, batches, medicines, refresh } = usePharmacyData();
  const [viewState, setViewState] = useState<"list" | "create" | "print">("list");
  
  // Create Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [returnQuantity, setReturnQuantity] = useState("");
  const [returnReason, setReturnReason] = useState(RETURN_REASONS[0]);
  const [poNumber, setPoNumber] = useState("");
  const [grnNumber, setGrnNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  
  // Print State
  const [printReturnId, setPrintReturnId] = useState("");

  const activeBatches = batches.filter(b => b.availableQuantity > 0 && (!selectedSupplierId || b.supplierId === selectedSupplierId));
  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const purchaseRate = selectedBatch?.purchasePrice || 0;
  const returnAmountPreview = (parseInt(returnQuantity || "0") * purchaseRate) || 0;

  const handleInitiateReturn = () => {
    if (!selectedSupplierId || !selectedBatchId || !returnQuantity) {
      toast.error("Please fill all required fields");
      return;
    }
    
    const qty = parseInt(returnQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Invalid quantity");
      return;
    }

    if (selectedBatch && qty > selectedBatch.availableQuantity) {
      toast.error(`Return quantity cannot exceed available stock (${selectedBatch.availableQuantity})`);
      return;
    }

    try {
      // Create return as Draft
      PharmacyDatabase.processSupplierReturn({
        supplierId: selectedSupplierId,
        medicineId: selectedBatch!.medicineId,
        batchId: selectedBatch!.id,
        quantity: qty,
        reason: returnReason,
        poNumber,
        grnNumber,
        invoiceNumber,
        createdBy: "Pharmacist" // Pass inside payload
      }, "Pharmacist");
      toast.success("Draft Return Created (Stock not deducted yet)");
      setViewState("list");
      setSelectedSupplierId("");
      setSelectedBatchId("");
      setReturnQuantity("");
      setPoNumber("");
      setGrnNumber("");
      setInvoiceNumber("");
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to process return");
    }
  };

  const advanceStatus = (returnId: string, currentStatus: string) => {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex === STATUS_ORDER.length - 1) return;
    
    const nextStatus = STATUS_ORDER[currentIndex + 1] as any;
    try {
      PharmacyDatabase.updateSupplierReturnStatus(returnId, nextStatus, "Pharmacy Manager");
      toast.success(`Status advanced to ${nextStatus}`);
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to advance status");
    }
  };

  const seedTestData = () => {
    try {
      const sId = "SUP-TEST-" + Date.now();
      const mId = "MED-TEST-" + Date.now();
      const bId = "BAT-TEST-" + Date.now();

      const newSuppliers = PharmacyDatabase.getSuppliers();
      newSuppliers.push({
        id: sId, supplierName: "Apollo Demo Pharma", contactInformation: "John Doe", phone: "9876543210", email: "demo@apollo.com", gstInformation: "29ABCDE1234F1Z5", licenseDetails: "DL-12345", status: "Active", createdAt: new Date().toISOString(),
        address: "123 Pharma St", paymentTerms: "Net 30"
      });
      PharmacyDatabase.saveSuppliers(newSuppliers);

      const newMedicines = PharmacyDatabase.getMedicines();
      newMedicines.push({
        id: mId, medicineName: "DemoAmoxicillin 500mg", genericName: "Amoxicillin",  manufacturer: "Apollo Demo Pharma", reorderLevel: 20, activeStatus: "Active", createdAt: new Date().toISOString(),
        brandName: "Amox", dosageForm: "Tablet", strength: "500mg", unit: "Strip", barcode: "12345", taxPercentage: 12, hsnCode: "3004", scheduleType: "H", storageCondition: "Room Temperature", controlledSubstanceFlag: false
      });
      PharmacyDatabase.saveMedicines(newMedicines);

      const newBatches = PharmacyDatabase.getBatches();
      newBatches.push({
        id: bId, medicineId: mId, supplierId: sId, batchNumber: "TX-2026A", expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), availableQuantity: 100, purchasePrice: 12, mrp: 20, status: "Active", createdAt: new Date().toISOString(),
        manufacturingDate: new Date().toISOString(), quantity: 100
      });
      PharmacyDatabase.saveBatches(newBatches);

      toast.success("Test Data Injected successfully! You can now initiate a return.");
      refresh();
    } catch (e: any) {
      toast.error("Failed to inject data");
    }
  };

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || id;
  const getMedicineName = (id: string) => medicines.find(m => m.id === id)?.name || id;
  const getBatchNumber = (id: string) => batches.find(b => b.id === id)?.batchNumber || id;

  if (viewState === "create") {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F6F9]">
        <PageHeader
          breadcrumbs={[{ label: "Pharmacy" }, { label: "Inventory" }, { label: "Supplier Returns" }, { label: "Initiate Return" }]}
          title="Initiate Supplier Return"
          description="Create a draft Debit Note and link to original purchase"
          onNavigate={onNavigate}
        icon={RotateCcw} iconBg="bg-orange-600"
      />

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-8 shadow-sm">
            {/* Section 1: Supplier & Batch */}
            <div className="space-y-4">
              <h3 className="font-bold text-[14px] text-[#0F1624] flex items-center gap-2"><Building2 size={16} className="text-[#1B4FD8]" /> 1. Select Supplier & Product</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Supplier *</label>
                  <select value={selectedSupplierId} onChange={(e) => { setSelectedSupplierId(e.target.value); setSelectedBatchId(""); }} className="w-full px-3 py-2.5 border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-[13px] rounded-lg focus:border-[#1B4FD8] focus:outline-none transition-all">
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Select Batch (In Stock) *</label>
                  <select value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)} disabled={!selectedSupplierId} className="w-full px-3 py-2.5 border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-[13px] rounded-lg disabled:bg-gray-100 disabled:text-gray-400 focus:border-[#1B4FD8] focus:outline-none transition-all">
                    <option value="">-- Choose Batch --</option>
                    {activeBatches.map(b => (
                      <option key={b.id} value={b.id}>
                        {getMedicineName(b.medicineId)} - {b.batchNumber} (Stock: {b.availableQuantity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <hr className="border-[#F1F5F9]" />

            {/* Section 2: Reference Details */}
            <div className="space-y-4">
              <h3 className="font-bold text-[14px] text-[#0F1624] flex items-center gap-2"><FileText size={16} className="text-[#1B4FD8]" /> 2. Original Purchase Details (Optional)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">PO Number</label>
                  <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="PO-2026-..." className="w-full px-3 py-2.5 border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-[13px] rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">GRN Number</label>
                  <input type="text" value={grnNumber} onChange={e => setGrnNumber(e.target.value)} placeholder="GRN-2026-..." className="w-full px-3 py-2.5 border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-[13px] rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Supplier Invoice</label>
                  <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-..." className="w-full px-3 py-2.5 border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-[13px] rounded-lg font-mono" />
                </div>
              </div>
            </div>

            <hr className="border-[#F1F5F9]" />

            {/* Section 3: Return Specifics */}
            <div className="space-y-4">
              <h3 className="font-bold text-[14px] text-[#0F1624] flex items-center gap-2"><Package size={16} className="text-[#1B4FD8]" /> 3. Return Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Return Quantity *</label>
                  <input type="number" min="1" value={returnQuantity} onChange={(e) => setReturnQuantity(e.target.value)} className="w-full px-3 py-2.5 border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-[13px] rounded-lg font-mono" placeholder="e.g. 50" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Reason</label>
                  <select value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className="w-full px-3 py-2.5 border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-[13px] rounded-lg">
                    {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex justify-between items-center mt-4">
                <div>
                  <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Purchase Rate</p>
                  <p className="text-[16px] font-bold text-[#334155] font-mono">₹{purchaseRate.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Total Return Value</p>
                  <p className="text-[20px] font-bold text-[#dc2626] font-mono">₹{returnAmountPreview.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200/60 text-[#1D4ED8] p-3.5 rounded-xl text-[12px] flex gap-2.5 items-start">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <p>Creating this return will save it as a <strong>Draft</strong>. Stock will <strong>not</strong> be deducted until the Pharmacy Manager Approves it.</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#F1F5F9]">
              <button onClick={() => setViewState("list")} className="px-5 py-2.5 rounded-lg border border-[#E2E8F0] text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors">Cancel</button>
              <button onClick={handleInitiateReturn} className="px-6 py-2.5 rounded-lg text-white font-semibold text-[13px] hover:bg-[#1e40af] shadow-sm transition-all" style={{ background: "#1B4FD8" }}>Create Draft Return</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewState === "print" && printReturnId) {
    const rtn = supplierReturns.find(r => r.id === printReturnId);
    if (!rtn) return null;
    const batch = batches.find(b => b.id === rtn.batchId);
    
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto bg-white border border-[#DDE2EC] p-10 shadow-sm" style={{ fontFamily: "monospace" }}>
          <div className="text-center mb-8 border-b-2 border-dashed border-[#94A3B8] pb-4">
            <h1 className="text-xl font-bold">HOSPITAL NAME</h1>
            <h2 className="text-lg mt-2">DEBIT NOTE</h2>
          </div>
          
          <div className="flex justify-between mb-8">
            <div>
              <p>Debit Note No: <strong>{rtn.debitNoteNumber}</strong></p>
              <p>Date: {new Date(rtn.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p>Supplier: <strong>{getSupplierName(rtn.supplierId)}</strong></p>
              {rtn.poNumber && <p>PO Ref: {rtn.poNumber}</p>}
              {rtn.invoiceNumber && <p>Inv Ref: {rtn.invoiceNumber}</p>}
            </div>
          </div>

          <div className="border-t-2 border-b-2 border-dashed border-[#94A3B8] py-2 mb-8">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Batch</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="mt-2">
                <tr>
                  <td className="pt-2">{getMedicineName(rtn.medicineId)}</td>
                  <td className="pt-2">{getBatchNumber(rtn.batchId)}</td>
                  <td className="pt-2">{rtn.quantity}</td>
                  <td className="pt-2">₹{rtn.purchaseRate}</td>
                  <td className="pt-2 text-right">₹{rtn.returnAmount}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-right mb-8">
            <p>Total: <strong>₹{rtn.returnAmount}</strong></p>
          </div>

          <div className="mb-12">
            <p>Reason: {rtn.reason}</p>
            <p>Status: {rtn.status}</p>
          </div>

          <div className="border-t-2 border-dashed border-[#94A3B8] pt-4 mt-16 flex justify-between">
            <div>
              <p>Created By: {rtn.createdBy}</p>
            </div>
            <div className="text-center">
              <p className="mt-8 border-t border-black pt-1">Authorized By</p>
              <p>{rtn.approvedBy || "Pharmacy Manager"}</p>
            </div>
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto mt-6 flex justify-between">
          <button onClick={() => setViewState("list")} className="px-4 py-2 border rounded">Back to List</button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2"><Printer size={16}/> Print Document</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F6F9]">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Inventory" }, { label: "Supplier Returns" }]}
        title="Purchase Returns (Debit Notes)"
        description={`${supplierReturns.length} historical returns and vendor credit notes tracking`}
        actions={
          <div className="flex items-center gap-2">
            <button 
              onClick={seedTestData} 
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-[13px] font-semibold text-emerald-700 hover:bg-emerald-100 shadow-sm transition-colors"
            >
              Inject Test Data
            </button>
            <button 
              onClick={() => setViewState("create")} 
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-[13px] font-semibold shadow-sm hover:bg-blue-700 transition-colors" 
              style={{ background: "#1B4FD8" }}
            >
              <Plus size={14} /> Initiate Return
            </button>
          </div>
        }
        onNavigate={onNavigate}
        icon={RotateCcw} iconBg="bg-orange-600"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-[#FAFCFF] border-b border-[#E2E8F0] flex items-center justify-between">
            <span className="text-[12px] font-bold text-[#475569] uppercase tracking-wider">
              Debit Note Records ({supplierReturns.length})
            </span>
            <span className="text-[11px] text-[#94A3B8]">Vendor Reconciled</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="px-4 py-3">Debit Note No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Medicine / Batch</th>
                  <th className="px-4 py-3 text-right">Return Val</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[13px]">
                {supplierReturns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-[#94A3B8] text-[13px]">
                      No supplier returns found. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  supplierReturns.map((rtn) => {
                    const nextStatus = STATUS_ORDER[STATUS_ORDER.indexOf(rtn.status) + 1];
                    return (
                      <tr key={rtn.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-mono text-[12px] font-bold text-[#1B4FD8]">{rtn.debitNoteNumber}</p>
                          {(rtn.poNumber || rtn.grnNumber) && (
                            <p className="text-[10px] text-[#64748B] mt-0.5 font-mono">PO: {rtn.poNumber || '-'} | GRN: {rtn.grnNumber || '-'}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#64748B] whitespace-nowrap">{new Date(rtn.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-semibold text-[#0F1624]">{getSupplierName(rtn.supplierId)}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[13px] text-[#0F1624]">{getMedicineName(rtn.medicineId)}</p>
                          <p className="text-[11px] text-[#94A3B8] font-mono">Batch: {getBatchNumber(rtn.batchId)} | Qty: {rtn.quantity}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#dc2626] font-mono">₹{rtn.returnAmount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-[12px] text-[#64748B]">{rtn.reason}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold border
                            ${rtn.status === 'Draft' ? 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]' : 
                              rtn.status === 'Approved' ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]' :
                              rtn.status === 'Credit Received' || rtn.status === 'Closed' ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' :
                              'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'}
                          `}>
                            {rtn.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            {nextStatus && (
                              <button 
                                onClick={() => advanceStatus(rtn.id, rtn.status)}
                                className="p-1.5 rounded-lg hover:bg-[#F0F2F5] text-[#1B4FD8] transition-colors" 
                                title={`Advance to ${nextStatus}`}
                              >
                                <ArrowRight size={14} />
                              </button>
                            )}
                            <button 
                              onClick={() => { setPrintReturnId(rtn.id); setViewState("print"); }}
                              className="p-1.5 rounded-lg hover:bg-[#F0F2F5] text-[#64748B] transition-colors" 
                              title="Print Document"
                            >
                              <Printer size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
