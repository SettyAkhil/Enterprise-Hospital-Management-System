import { usePharmacyData } from "../data/usePharmacyData";
import { useState, useEffect } from "react";
import { Search, X, Plus, Minus, Printer, CreditCard, Smartphone, Wallet, ShieldCheck, ReceiptText, Trash2, ChevronDown, CheckCircle } from "lucide-react";
import { PharmacyDatabase } from "../../../services/pharmacyDb";
import PageHeader from "../components/PageHeader";

const paymentMethods = [
  { id: "cash", label: "Cash", icon: Wallet },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "insurance", label: "Insurance", icon: ShieldCheck },
  { id: "credit", label: "Credit", icon: ReceiptText },
];

interface DispensingProps { onNavigate: (page: string) => void }

export default function Dispensing({ onNavigate }: DispensingProps) {
  const {  medicines } = usePharmacyData();
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  
  const [payment, setPayment] = useState("cash");
  const [patientName, setPatientName] = useState("");
  const [rxId, setRxId] = useState("");
  const [discount, setDiscount] = useState(0);
  
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastBillId, setLastBillId] = useState("");
  const [printDate, setPrintDate] = useState("");

  useEffect(() => {
    const savedRx = localStorage.getItem("_v2_pharmacy_dispense_rx");
    if (savedRx) {
      setRxId(savedRx);
      localStorage.removeItem("_v2_pharmacy_dispense_rx");
      setTimeout(() => autoLoadRx(savedRx), 100);
    }
  }, []);

  const autoLoadRx = (targetRxId: string) => {
    const prescriptions = PharmacyDatabase.getPrescriptions();
    const rx = prescriptions.find(p => p.id === targetRxId);
    if (!rx) return;
    
    setPatientName(rx.patientName);
    
    const newCart: any[] = [];
    const allMedicines = PharmacyDatabase.getMedicines();
    
    rx.items?.forEach(item => {
        let med = allMedicines.find(m => m.id === item.medicineId);
        // Fallback for mocked prescriptions with unlinked medicine names
        if (!med) {
           med = allMedicines.find(m => m.medicineName.toLowerCase() === item.medicineName.toLowerCase());
        }
        
        if (!med) return;
        const batches = PharmacyDatabase.getBatches().filter(b => b.medicineId === med.id);
        const { splits } = PharmacyDatabase.executeFEFOSplit(med.id, item.quantity, batches);
        
        splits.forEach(split => {
            const b = split.batch;
            newCart.push({
                id: Date.now() + Math.random(),
                medicineId: med.id,
                batchId: b.id,
                medicine: med.brandName || med.medicineName,
                batch: b.batchNumber,
                expiry: b.expiryDate,
                qty: split.usedQty,
                mrp: b.mrp,
                discount: 0,
                tax: (med.taxPercentage || 12),
                hsnCode: med.hsnCode || "300490",
                total: b.mrp * split.usedQty * (1 + (med.taxPercentage || 12)/100)
            });
        });
    });
    setCart(newCart);
  };

  const loadPrescriptionFEFO = () => {
    if (!rxId) return alert("Enter Prescription ID");
    autoLoadRx(rxId);
  };

  const filteredMeds = searchQuery.length > 1
    ? medicines.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.generic.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  const subtotal = cart.reduce((s, i) => s + (i.mrp * i.qty), 0);
  const discountAmt = subtotal * discount / 100;
  // Calculate exact GST splits for invoice based on each item
  let totalCGST = 0;
  let totalSGST = 0;
  cart.forEach(item => {
      const taxable = (item.mrp * item.qty) - (item.mrp * item.qty * (item.discount || 0) / 100);
      const taxTotal = taxable * (item.tax / 100);
      totalCGST += taxTotal / 2;
      totalSGST += taxTotal / 2;
  });
  
  const grand = subtotal - discountAmt + totalCGST + totalSGST;
  const roundOff = Math.round(grand) - grand;
  const finalAmount = Math.round(grand);

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta), total: Math.max(1, i.qty + delta) * i.mrp * (1 - (i.discount||0)/100) * (1 + (i.tax||0)/100) } : i));
  };
  const removeItem = (id: number) => setCart(prev => prev.filter(i => i.id !== id));
  
  const addMedicine = (med: typeof medicines[0]) => {
    const exists = cart.find(i => i.medicine === med.name);
    if (exists) { updateQty(exists.id, 1); return; }
    
    // Quick add doesn't have batch selection yet, just grab first batch for mock manual add
    const batches = PharmacyDatabase.getBatches().filter(b => b.medicineId === med.id && b.availableQuantity > 0);
    const b = batches[0];
    
    const newItem = {
      id: Date.now() + Math.random(),
      medicineId: med.id,
      batchId: b ? b.id : "MANUAL-001",
      medicine: med.name,
      batch: b ? b.batchNumber : "B2026",
      expiry: b ? b.expiryDate : "2026-12-31",
      qty: 1,
      mrp: med.mrp,
      discount: 0,
      tax: med.gst || 12,
      hsnCode: med.sku,
      total: med.mrp * (1 + (med.gst||12)/100),
    };
    setCart(prev => [...prev, newItem]);
    setSearchQuery("");
  };

  const completeTransaction = () => {
      if (cart.length === 0) return;
      
      const billId = "INV-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
      setLastBillId(billId);
      setPrintDate(new Date().toLocaleString());
      
      // Update DB
      const bill = {
          id: billId,
          prescriptionId: rxId || undefined,
          patientName: patientName || "Walk-in Patient",
          totalAmount: subtotal - discountAmt,
          discountAmt: discountAmt,
          taxAmount: totalCGST + totalSGST,
          netAmount: finalAmount,
          paymentMode: payment,
          status: "paid",
          date: new Date().toISOString(),
          items: cart.map(c => ({
              medicineId: c.medicineId,
              batchId: c.batchId,
              quantity: c.qty,
              unitPrice: c.mrp,
              taxPercent: c.tax,
              totalPrice: c.total
          }))
      };
      
      PharmacyDatabase.addPharmacyBill(bill as any);
      
      // Update Batches
      const currentBatches = PharmacyDatabase.getBatches();
      cart.forEach(c => {
          const b = currentBatches.find(bat => bat.id === c.batchId);
          if (b) {
              b.availableQuantity -= c.qty;
              PharmacyDatabase.updateBatch(b.id, b);
          }
      });
      
      if (rxId) {
          PharmacyDatabase.updatePrescription(rxId, { status: "dispensed", dispensingStatus: "Dispensed" });
      }

      PharmacyDatabase.logAudit("Pharmacist (You)", "Created", "Billing", billId, "Created bill for " + finalAmount);
      
      setShowInvoice(true);
  };

  const printInvoice = () => {
      window.print();
  };

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Invoice Modal Overlay */}
      {showInvoice && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm print:bg-white print:p-0 print:block">
            <div className="bg-white rounded-none shadow-2xl w-full max-w-2xl max-h-full overflow-y-auto print:max-w-none print:shadow-none print:w-[80mm] print:m-0 print:overflow-visible">
                <div className="p-6 print:p-2 border-b border-[#e5e7eb] flex justify-between items-center print:hidden bg-[#f9fafb]">
                    <h2 className="text-xl font-bold text-[#111827] flex items-center gap-2">
                        <CheckCircle className="text-green-600" /> Transaction Complete
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={printInvoice} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors">
                            <Printer size={16} /> Print Receipt
                        </button>
                        <button onClick={() => { setShowInvoice(false); setCart([]); setRxId(""); setPatientName(""); }} className="bg-white border border-[#e5e7eb] hover:bg-gray-50 text-[#111827] px-4 py-2 text-sm font-semibold transition-colors">
                            Close
                        </button>
                    </div>
                </div>
                
                {/* Detailed A4 Print Layout matching requested invoice */}
                <div className="p-8 print:p-0 font-sans text-sm print:text-[10px] text-black w-full max-w-5xl mx-auto bg-white">
                    <div className="flex justify-between border-b-2 border-black pb-4 mb-4">
                        <div className="flex-1">
                            <h1 className="text-2xl print:text-lg font-bold tracking-wider mb-2">VH PHARMACY</h1>
                            <p className="print:text-[9px]">27-1-7/3/1, Premises Of Imperial Hospital,</p>
                            <p className="print:text-[9px]">J P Road, Bhimavaram, West Godavari,</p>
                            <p className="print:text-[9px]">Andhra Pradesh-534202</p>
                            <p className="font-bold print:text-[9px] mt-1">GST No : 37AASFV7563M1Z1</p>
                            <h2 className="text-lg print:text-sm font-bold uppercase mt-2">Pharmacy Receipt <br/> TAX INVOICE</h2>
                        </div>
                        <div className="flex-1">
                            <table className="w-full text-left print:text-[9px] border-collapse">
                                <tbody>
                                    <tr><td className="py-0.5 font-semibold">Bill No</td><td>: {lastBillId || "VH368375"}</td><td className="font-semibold">Bill Date</td><td>: {printDate || "10-Sep-2026"}</td></tr>
                                    <tr><td className="py-0.5 font-semibold">UMR No</td><td>: UMR112320</td><td className="font-semibold">Dt of Supply</td><td>: {printDate || "10-Sep-2026 07:14:38"}</td></tr>
                                    <tr><td className="py-0.5 font-semibold">Patient Name</td><td colSpan={3}>: {patientName || "Mr G KUMAR"}</td></tr>
                                    <tr><td className="py-0.5 font-semibold">Doctor Name</td><td colSpan={3}>: Dr. CHAITANYA BANDARU</td></tr>
                                    <tr><td className="py-0.5 font-semibold">RCM Invoice</td><td colSpan={3}>: NO</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <table className="w-full mb-4 border border-black print:text-[9px]">
                        <thead className="border-b border-black">
                            <tr>
                                <th className="border-r border-black p-1 text-left font-semibold">Item Desc</th>
                                <th className="border-r border-black p-1 text-center font-semibold">HSN<br/>Code</th>
                                <th className="border-r border-black p-1 text-center font-semibold">Mnf</th>
                                <th className="border-r border-black p-1 text-center font-semibold">Sh</th>
                                <th className="border-r border-black p-1 text-center font-semibold">Batch No</th>
                                <th className="border-r border-black p-1 text-center font-semibold">Exp Dt</th>
                                <th className="border-r border-black p-1 text-center font-semibold">Bin<br/>No</th>
                                <th className="border-r border-black p-1 text-center font-semibold">Qty</th>
                                <th className="border-r border-black p-1 text-right font-semibold">Rate</th>
                                <th className="border-r border-black p-1 text-right font-semibold">Amount</th>
                                <th className="border-r border-black p-1 text-right font-semibold">Disc Amt</th>
                                <th className="border-r border-black p-1 text-right font-semibold">Taxable<br/>Amt</th>
                                <th className="border-r border-black p-1 text-center font-semibold" colSpan={2}>CGST<br/><div className="flex justify-between text-[8px]"><span className="w-1/2 text-center">%</span><span className="w-1/2 text-center">Amt</span></div></th>
                                <th className="border-r border-black p-1 text-center font-semibold" colSpan={2}>SGST<br/><div className="flex justify-between text-[8px]"><span className="w-1/2 text-center">%</span><span className="w-1/2 text-center">Amt</span></div></th>
                                <th className="p-1 text-right font-semibold">Bill<br/>Amt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cart.map((c, i) => {
                                const amount = c.qty * c.mrp;
                                const discAmt = amount * (c.discount || 0) / 100;
                                const taxable = amount - discAmt;
                                const cgstRate = (c.tax || 12) / 2;
                                const sgstRate = (c.tax || 12) / 2;
                                const cgstAmt = taxable * (cgstRate / 100);
                                const sgstAmt = taxable * (sgstRate / 100);
                                const billAmt = taxable + cgstAmt + sgstAmt;
                                
                                return (
                                <tr key={i} className="border-b border-gray-300 last:border-black">
                                    <td className="border-r border-black p-1">{c.medicine}</td>
                                    <td className="border-r border-black p-1 text-center">{c.hsnCode || "300490"}</td>
                                    <td className="border-r border-black p-1 text-center">SUN</td>
                                    <td className="border-r border-black p-1 text-center">H</td>
                                    <td className="border-r border-black p-1 text-center">{c.batch}</td>
                                    <td className="border-r border-black p-1 text-center">{c.expiry}</td>
                                    <td className="border-r border-black p-1 text-center">-</td>
                                    <td className="border-r border-black p-1 text-center">{c.qty}</td>
                                    <td className="border-r border-black p-1 text-right">{c.mrp.toFixed(2)}</td>
                                    <td className="border-r border-black p-1 text-right">{amount.toFixed(2)}</td>
                                    <td className="border-r border-black p-1 text-right">{discAmt.toFixed(2)}</td>
                                    <td className="border-r border-black p-1 text-right">{taxable.toFixed(2)}</td>
                                    <td className="border-r border-black p-1 text-center w-8">{cgstRate}%</td>
                                    <td className="border-r border-black p-1 text-right">{cgstAmt.toFixed(2)}</td>
                                    <td className="border-r border-black p-1 text-center w-8">{sgstRate}%</td>
                                    <td className="border-r border-black p-1 text-right">{sgstAmt.toFixed(2)}</td>
                                    <td className="p-1 text-right font-bold">{billAmt.toFixed(2)}</td>
                                </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="border-t-2 border-black font-bold">
                            <tr>
                                <td colSpan={9} className="border-r border-black p-1 text-right">Totals:</td>
                                <td className="border-r border-black p-1 text-right">{subtotal.toFixed(2)}</td>
                                <td className="border-r border-black p-1 text-right">{discountAmt.toFixed(2)}</td>
                                <td className="border-r border-black p-1 text-right">{(subtotal - discountAmt).toFixed(2)}</td>
                                <td className="border-r border-black p-1 text-center"></td>
                                <td className="border-r border-black p-1 text-right">{totalCGST.toFixed(2)}</td>
                                <td className="border-r border-black p-1 text-center"></td>
                                <td className="border-r border-black p-1 text-right">{totalSGST.toFixed(2)}</td>
                                <td className="p-1 text-right text-sm">{finalAmount.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <div className="flex justify-between items-end mt-4 print:text-[9px]">
                        <div>
                            <p>Received sum of <span className="font-bold uppercase">Rupees {finalAmount} Only</span> towards Above Bill</p>
                            <p className="mt-8">Card Amount: <span className="font-bold">{payment === 'card' ? finalAmount.toFixed(2) : '0.00'}</span></p>
                            <p>Receipt Amount: <span className="font-bold">{payment === 'cash' ? finalAmount.toFixed(2) : '0.00'}</span></p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold mt-12 border-t border-black pt-1">Authorized Signatory</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Left: main dispensing area */}
      <div className="flex-1 flex flex-col overflow-hidden print:hidden">
        <div className="p-6 pb-0">
          <PageHeader
            breadcrumbs={[{ label: "Pharmacy" }, { label: "Dispensing & Billing" }]}
            title="Dispensing & Billing"
            description="New sale · POS"
            onNavigate={onNavigate}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {/* Patient / Rx Info */}
          <div className="bg-white rounded-none border border-[#e5e7eb] p-4 flex gap-4 items-end">
            <div className="grid grid-cols-2 gap-4 flex-1">
                <div>
                  <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Prescription ID</label>
                  <input
                    value={rxId}
                    onChange={e => setRxId(e.target.value)}
                    placeholder="e.g. RX-2026-1041"
                    className="w-full px-3 py-2 rounded-none border border-[#e5e7eb] text-[13px] text-[#111827] focus:border-[#4f46e5] focus:outline-none transition-colors bg-[#f9fafb] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Patient Name</label>
                  <input
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-none border border-[#e5e7eb] text-[13px] text-[#111827] focus:border-[#4f46e5] focus:outline-none transition-colors bg-[#f9fafb] focus:bg-white"
                  />
                </div>
            </div>
            <button onClick={loadPrescriptionFEFO} className="bg-[#4f46e5] text-white px-4 py-2 h-[38px] text-[13px] font-bold hover:bg-[#4338ca] transition-colors whitespace-nowrap">
                Load Rx & Auto-Allocate
            </button>
          </div>

          {/* Medicine Search */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-white rounded-none border border-[#e5e7eb] px-4 py-3 focus-within:border-[#4f46e5] transition-colors">
              <Search size={16} className="text-[#6b7280] flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search medicine by name, generic, SKU or scan barcode…"
                className="flex-1 text-[14px] text-[#111827] outline-none placeholder:text-[#9ca3af]"
              />
              {searchQuery && <button onClick={() => setSearchQuery("")}><X size={14} className="text-[#9ca3af]" /></button>}
            </div>
            {filteredMeds.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-none border border-[#e5e7eb] shadow-xl overflow-hidden">
                {filteredMeds.map(m => (
                  <button
                    key={m.id}
                    onClick={() => addMedicine(m)}
                    className="w-full flex items-center px-4 py-3 hover:bg-[#f9fafb] transition-colors border-b border-[#f3f4f6] last:border-0"
                  >
                    <div className="flex-1 text-left">
                      <p className="text-[13px] font-semibold text-[#111827]">{m.name}</p>
                      <p className="text-[11px] text-[#6b7280]">{m.generic} · {m.form} · {m.manufacturer}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-[13px] font-bold text-[#111827]">₹{m.mrp}</p>
                      <p className="text-[11px]" style={{ color: m.stock > 50 ? "#15803d" : m.stock > 0 ? "#d97706" : "#dc2626" }}>
                        {m.stock > 0 ? `Stock: ${m.stock}` : "Out of stock"}
                      </p>
                    </div>
                    <div className="ml-3 w-7 h-7 rounded-none flex items-center justify-center flex-shrink-0" style={{ background: "#eff6ff" }}>
                      <Plus size={14} style={{ color: "#4f46e5" }} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart Table */}
          <div className="bg-white rounded-none border border-[#e5e7eb] overflow-hidden">
            <table>
              <thead><tr>
                <th className="text-left px-4 py-3 bg-[#f9fafb] text-[11px] font-bold text-[#6b7280] uppercase tracking-wider border-b border-[#e5e7eb]">Medicine</th>
                <th className="text-left px-4 py-3 bg-[#f9fafb] text-[11px] font-bold text-[#6b7280] uppercase tracking-wider border-b border-[#e5e7eb]">Batch</th>
                <th className="text-left px-4 py-3 bg-[#f9fafb] text-[11px] font-bold text-[#6b7280] uppercase tracking-wider border-b border-[#e5e7eb]">Expiry</th>
                <th className="text-center px-4 py-3 bg-[#f9fafb] text-[11px] font-bold text-[#6b7280] uppercase tracking-wider border-b border-[#e5e7eb]">Qty</th>
                <th className="text-right px-4 py-3 bg-[#f9fafb] text-[11px] font-bold text-[#6b7280] uppercase tracking-wider border-b border-[#e5e7eb]">MRP (₹)</th>
                <th className="text-center px-4 py-3 bg-[#f9fafb] text-[11px] font-bold text-[#6b7280] uppercase tracking-wider border-b border-[#e5e7eb]">Tax%</th>
                <th className="text-right px-4 py-3 bg-[#f9fafb] text-[11px] font-bold text-[#6b7280] uppercase tracking-wider border-b border-[#e5e7eb]">Total (₹)</th>
                <th className="px-4 py-3 bg-[#f9fafb] border-b border-[#e5e7eb]"></th>
              </tr></thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-[#9ca3af]">
                    <Search size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No medicines added</p>
                    <p className="text-[12px] mt-1">Search or Load Rx above</p>
                  </td></tr>
                ) : cart.map((item, i) => (
                  <tr key={i} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f9fafb]">
                    <td className="px-4 py-3 font-medium text-[13px] text-[#111827]">{item.medicine}</td>
                    <td className="px-4 py-3 text-[#6b7280] font-mono text-[12px]">{item.batch}</td>
                    <td className="px-4 py-3 text-[#6b7280] text-[13px]">{item.expiry}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-[#e5e7eb] rounded-none text-[#6b7280]"><Minus size={14} /></button>
                        <span className="w-8 text-center font-medium text-[13px] text-[#111827]">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-[#e5e7eb] rounded-none text-[#6b7280]"><Plus size={14} /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] text-[#111827]">{(item.mrp || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center text-[13px] text-[#111827]">{item.tax || 0}%</td>
                    <td className="px-4 py-3 text-right font-bold text-[13px] text-[#111827]">{(item.total || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeItem(item.id)} className="p-1 text-[#9ca3af] hover:text-[#dc2626] transition-colors"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right: Payment summary */}
      <div className="w-[340px] bg-white border-l border-[#e5e7eb] flex flex-col print:hidden">
        <div className="p-5 border-b border-[#e5e7eb]">
          <h3 className="font-bold text-[16px] text-[#111827]">Payment Summary</h3>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Bill Breakup */}
          <div className="space-y-3 bg-[#f9fafb] p-4 rounded-none border border-[#f3f4f6]">
            <div className="flex justify-between text-[13px] text-[#4b5563]">
              <span>Subtotal</span><span className="font-medium text-[#111827]">₹{subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center text-[13px] text-[#4b5563]">
              <span>Discount</span>
              <div className="flex items-center gap-2">
                <input
                  type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))}
                  className="w-12 px-2 py-1 text-right border border-[#e5e7eb] bg-white text-[#111827] focus:border-[#4f46e5] focus:outline-none"
                />
                <span className="text-[#9ca3af]">%</span>
                <span className="font-medium text-[#16a34a]">-₹{discountAmt.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between text-[13px] text-[#4b5563]">
              <span>CGST</span><span className="font-medium text-[#111827]">₹{totalCGST.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[13px] text-[#4b5563]">
              <span>SGST</span><span className="font-medium text-[#111827]">₹{totalSGST.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[13px] text-[#4b5563]">
              <span>Round Off</span><span className="font-medium text-[#111827]">₹{roundOff > 0 ? "+" : ""}{roundOff.toFixed(2)}</span>
            </div>
            
            <div className="h-px bg-[#e5e7eb] my-3"></div>
            
            <div className="flex justify-between items-end">
              <span className="text-[13px] font-bold text-[#4b5563] uppercase tracking-wide">Net Payable</span>
              <div className="text-right">
                <span className="text-[11px] text-[#6b7280] block mb-1">Total Amount</span>
                <span className="text-[28px] font-black text-[#4f46e5] leading-none">₹{finalAmount}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-3">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map(method => {
                const Icon = method.icon;
                const active = payment === method.id;
                return (
                  <button
                    key={method.id} onClick={() => setPayment(method.id)}
                    className={`flex items-center gap-2 px-3 py-3 rounded-none border text-[13px] font-medium transition-colors ${
                      active ? "border-[#4f46e5] bg-[#eff6ff] text-[#4f46e5]" : "border-[#e5e7eb] bg-white text-[#4b5563] hover:border-[#d1d5db]"
                    }`}
                  >
                    <Icon size={16} className={active ? "text-[#4f46e5]" : "text-[#9ca3af]"} />
                    {method.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-[#e5e7eb] bg-white">
          <button 
            disabled={cart.length === 0}
            onClick={completeTransaction}
            className={`w-full py-4 text-[14px] font-bold shadow-sm transition-colors uppercase tracking-wide ${
                cart.length > 0 ? "bg-[#4f46e5] text-white hover:bg-[#4338ca]" : "bg-[#f3f4f6] text-[#9ca3af] cursor-not-allowed"
            }`}
          >
            Complete Transaction
          </button>
        </div>
      </div>
    </div>
  );
}
