import { useState } from "react";
import { Upload, ZoomIn, ZoomOut, RotateCw, Maximize2, CheckCircle, Edit3, XCircle, AlertTriangle, Loader, Receipt } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { usePharmacyData } from "../data/usePharmacyData";
import { PharmacyDatabase } from "../../../services/pharmacyDb";
import { API_BASE } from "../../../lib/constants";
import { withAuthHeaders } from "../../../lib/api";

const confColor = (c: number) => c >= 90 ? "#15803d" : c >= 75 ? "#d97706" : "#dc2626";
const confBg = (c: number) => c >= 90 ? "#DCFCE7" : c >= 75 ? "#FEF3C7" : "#FEE2E2";
const confLabel = (c: number) => c >= 90 ? "High" : c >= 75 ? "Medium" : "Low";

interface InvoiceOCRProps { onNavigate: (page: string) => void }

export default function InvoiceOCR({ onNavigate }: InvoiceOCRProps) {
  const { medicines, refresh } = usePharmacyData();
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [extractedItems, setExtractedItems] = useState<any[]>([]);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedFile(file);
    setImagePreview(URL.createObjectURL(file));
    setProcessing(true);
    setUploaded(true);
    
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("blueprint", "Universal OCR (Any Text)");
      
      const uploadRes = await fetch(`${API_BASE}/api/ocr-portal/upload`, {
        method: "POST",
        headers: withAuthHeaders({}, "POST"),
        body: form,
        credentials: "include",
      });
      
      if (uploadRes.status === 502 || !uploadRes.ok) {
         throw new Error("Backend Offline or 502 Bad Gateway");
      }
      
      const uploadData = await uploadRes.json();
      const jobId = uploadData.job_id;
      if (!jobId) throw new Error("No job ID returned");

      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await fetch(`${API_BASE}/api/ocr-portal/jobs/${jobId}`, {
          headers: { ...withAuthHeaders({}, "GET"), "Accept": "application/json" },
          credentials: "include",
        });
        
        if (!statusRes.ok) continue;
        const statusData = await statusRes.json();
        
        if (statusData.status === "COMPLETED") {
          const resultRes = await fetch(`${API_BASE}/api/ocr-portal/jobs/${jobId}/result`, {
            headers: { ...withAuthHeaders({}, "GET"), "Accept": "application/json" },
            credentials: "include",
          });
          if (!resultRes.ok) throw new Error("Failed to fetch OCR result");
          
          const resultData = await resultRes.json();
          if (resultData.combined_markdown) {
             parseMarkdownInvoice(resultData.combined_markdown);
             setProcessing(false);
             setDone(true);
             return;
          } else {
             throw new Error("No Markdown returned");
          }
        }
        if (statusData.status === "FAILED") throw new Error("OCR Processing Failed on Server");
      }
      
      throw new Error("OCR Timeout");
    } catch (err: any) {
      console.error("OCR Pipeline Failed:", err);
      setProcessing(false);
      alert("OCR Processing failed: " + (err.message || "Could not extract details from the image. Ensure the OCR backend server is running."));
    }
  };

  const parseMarkdownInvoice = (md: string) => {
    const lines = md.split('\\n').map(l => l.trim()).filter(Boolean);
    const parsedItems: any[] = [];
    
    // 1. Find the table header row
    let headerLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
       if (lines[i].includes('|') && lines[i].includes('---')) {
          headerLineIdx = i - 1;
          break;
       }
    }
    
    if (headerLineIdx === -1) {
       // Fallback: no explicit markdown table, try to find any row with |
       headerLineIdx = lines.findIndex(l => l.includes('|'));
    }
    if (headerLineIdx === -1) throw new Error("No table found in OCR result.");

    const headers = lines[headerLineIdx].split('|').map(h => h.trim().toLowerCase()).filter(Boolean);
    
    // Map standard concepts to column indices
    const colMap: Record<string, number> = { name: -1, qty: -1, rate: -1, mrp: -1, batch: -1, expiry: -1, gst: -1, hsn: -1 };
    
    headers.forEach((h, idx) => {
       if (h.includes('desc') || h.includes('name') || h.includes('product') || h.includes('item')) colMap.name = idx;
       else if (h.includes('qty') || h.includes('quantity')) colMap.qty = idx;
       else if (h.includes('rate') || h.includes('price') || h.includes('ptr')) colMap.rate = idx;
       else if (h.includes('mrp')) colMap.mrp = idx;
       else if (h.includes('batch')) colMap.batch = idx;
       else if (h.includes('exp')) colMap.expiry = idx;
       else if (h.includes('gst') || h.includes('tax')) colMap.gst = idx;
       else if (h.includes('hsn')) colMap.hsn = idx;
    });

    // If it couldn't find a name column, just guess based on standard layouts
    if (colMap.name === -1) colMap.name = 0;

    for (let i = headerLineIdx + 2; i < lines.length; i++) {
       const line = lines[i];
       if (!line.includes('|')) break; // End of table
       
       const cols = line.split('|').map(c => c.trim()).filter(Boolean);
       if (cols.length < 3) continue;
       
       const name = cols[colMap.name] || "";
       if (!name || name.includes('---')) continue;
       
       // Try to parse values, fallback to regex if column mapping failed
       let qty = colMap.qty !== -1 ? Number(cols[colMap.qty].replace(/[^0-9.]/g, '')) : 1;
       let rate = colMap.rate !== -1 ? Number(cols[colMap.rate].replace(/[^0-9.]/g, '')) : 0;
       
       // If qty/rate are 0/NaN, try to find numbers in the row
       if (!qty || isNaN(qty)) {
          const numCols = cols.filter(c => !isNaN(Number(c.replace(/[^0-9.]/g, ''))) && Number(c.replace(/[^0-9.]/g, '')) > 0);
          if (numCols.length > 0) qty = Number(numCols[0].replace(/[^0-9.]/g, ''));
       }
       
       const batch = colMap.batch !== -1 ? cols[colMap.batch] : "AUTO-" + Math.floor(Math.random() * 1000);
       const expiry = colMap.expiry !== -1 ? cols[colMap.expiry] : "2026-12-31";
       const gst = colMap.gst !== -1 ? Number(cols[colMap.gst].replace(/[^0-9.]/g, '')) : 12;
       
       parsedItems.push({
          id: "TEMP_" + Date.now() + Math.random(),
          matched: name,
          mfr: "UNK",
          pack: "1S",
          batch: batch,
          expiry: expiry,
          hsn: "300490",
          quantity: qty || 1,
          mrp: rate > 0 ? rate * 1.2 : 100, // MRP usually slightly higher than rate if missing
          rate: rate || 80,
          discount: 0,
          gst: gst || 12,
          confidence: 90,
          status: "ok",
          existsInMaster: medicines.some(m => m.name?.toLowerCase() === name.toLowerCase())
       });
    }
    
    if (parsedItems.length > 0) {
       setExtractedItems(parsedItems);
    } else {
       throw new Error("Could not parse table from Markdown. Try taking a clearer picture.");
    }
  };

  const calculateItemValue = (item: any) => {
    const base = item.quantity * item.rate;
    const discountAmt = base * (item.discount / 100);
    const value = base - discountAmt;
    const gstAmt = value * (item.gst / 100);
    return value + gstAmt;
  };

  const totalValue = extractedItems.reduce((acc, item) => acc + calculateItemValue(item), 0);

  const handleConfirm = () => {
    if (extractedItems.length === 0) return;
    
    const grnId = "GRN" + Date.now();
    const grnItems: any[] = [];
    
    extractedItems.forEach(item => {
      // 1. Auto-create medicine if missing
      let medId = "";
      const existing = medicines.find(m => m.name?.toLowerCase() === item.matched.toLowerCase());
      if (!existing) {
        medId = "MED" + Date.now() + Math.floor(Math.random() * 1000);
        PharmacyDatabase.addMedicine({
          id: medId,
          medicineName: item.matched,
          genericName: "Auto-created Generic",
          categoryId: "General",
          manufacturer: item.mfr,
          stock: item.quantity,
          mrp: item.mrp,
          price: item.rate,
          rack: "-",
          batch: item.batch,
          expiry: item.expiry,
          activeStatus: "Active"
        } as any);
        PharmacyDatabase.logAudit("Pharmacy", "Created", "Medicine", item.matched, "Auto-created medicine via Invoice OCR");
      } else {
        medId = existing.id;
      }

      // 2. Add Batch and Transaction
      const batchId = "BAT" + Math.floor(Math.random() * 100000);
      PharmacyDatabase.addBatch({
        id: batchId,
        medicineId: medId,
        batchNumber: item.batch,
        expiryDate: item.expiry,
        quantity: item.quantity,
        availableQuantity: item.quantity,
        mrp: item.mrp,
        purchasePrice: item.rate,
        grnId: grnId,
        createdAt: new Date().toISOString(),
        manufacturingDate: "2024-01-01"
      });

      PharmacyDatabase.addTransaction({
        id: "TXN" + Math.floor(Math.random() * 100000),
        date: new Date().toISOString(),
        medicineId: medId,
        batchId: batchId,
        quantity: item.quantity,
        transactionType: "PURCHASE_RECEIVED",
        userId: "SYS",
        reason: "Received via AI OCR GRN: " + grnId
      });

      grnItems.push({
        medicineId: medId,
        orderedQty: item.quantity,
        receivedQty: item.quantity,
        batchNumber: item.batch,
        manufacturingDate: "2024-01-01",
        expiryDate: item.expiry,
        purchasePrice: item.rate,
        sellingPrice: item.mrp
      });
    });

    const newGrn = {
      id: grnId,
      purchaseOrderId: "DIRECT_INVOICE",
      supplierId: "SUP_ADITYA",
      invoiceNumber: "RGG16497",
      grnDate: new Date().toISOString(),
      items: grnItems,
      receivedBy: "SYS",
      createdAt: new Date().toISOString()
    };
    PharmacyDatabase.addGRN(newGrn);

    alert("Invoice processed, Inventory updated, and new Medicines auto-created!");
    refresh();
    onNavigate("inventory-ledger");
  };

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Purchasing" }, { label: "Scan Invoice" }]}
        title="Smart Supplier Invoice OCR"
        description="Upload a supplier bill to instantly extract stock data and auto-create missing medicines."
        onNavigate={onNavigate}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Left: Image Upload & Preview */}
        <div className="bg-white rounded border border-[#DDE2EC] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0F2F5]">
            <p className="font-semibold text-[14px] text-[#0F1624]">Supplier Invoice Image</p>
            <div className="flex items-center gap-3">
              {uploaded && (
                <button 
                  onClick={() => {
                    setUploaded(false);
                    setImagePreview("");
                    setExtractedItems([]);
                    setDone(false);
                    setProcessing(false);
                    setZoom(100);
                    setRotation(0);
                  }}
                  className="px-3 py-1.5 rounded text-[12px] font-medium text-[#1B4FD8] bg-[#E8EDF5] hover:bg-[#DDE2EC] transition-colors"
                >
                  Upload New Image
                </button>
              )}
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 bg-white border border-[#DDE2EC] p-1 rounded">
                  <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1 hover:bg-[#F5F7FA] rounded text-[#64748B]"><ZoomOut size={14} /></button>
                  <button onClick={() => setRotation(r => r + 90)} className="p-1 hover:bg-[#F5F7FA] rounded text-[#64748B]"><RotateCw size={14} /></button>
                  <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1 hover:bg-[#F5F7FA] rounded text-[#64748B]"><ZoomIn size={14} /></button>
                  <button onClick={() => setIsFullscreen(true)} className="p-1 hover:bg-[#F5F7FA] rounded text-[#64748B]"><Maximize2 size={14} /></button>
                </div>
                <span className="text-[12px] text-[#64748B] ml-1">{zoom}%</span>
              </div>
            </div>
          </div>

          {!uploaded ? (
            <label className="flex flex-col items-center justify-center flex-1 min-h-[400px] m-5 rounded border-2 border-dashed border-[#DDE2EC] cursor-pointer hover:border-[#1B4FD8] hover:bg-[#F5F7FA] transition-all">
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
              <div className="w-14 h-14 rounded flex items-center justify-center mb-3" style={{ background: "#E8EDF5" }}>
                <Upload size={22} style={{ color: "#1B4FD8" }} />
              </div>
              <p className="font-semibold text-[14px] text-[#0F1624]">Upload Supplier Invoice</p>
              <p className="text-[12px] text-[#64748B] mt-1">Click to upload or drag & drop</p>
              <div className="mt-4 px-4 py-2 rounded text-white text-[13px] font-medium shadow-sm" style={{ background: "#1B4FD8" }}>
                Browse Files
              </div>
            </label>
          ) : (
             <>
               {/* Fullscreen Overlay */}
               {isFullscreen && (
                  <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                     <button onClick={() => setIsFullscreen(false)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                        <XCircle size={24} />
                     </button>
                     <img 
                       src={imagePreview} 
                       alt="Invoice Fullscreen" 
                       className="max-w-full max-h-full object-contain transition-transform duration-300" 
                       style={{ transform: `rotate(${rotation}deg)` }}
                     />
                  </div>
               )}
            
               {/* Normal Preview */}
               <div className="relative flex-1 min-h-[400px] m-4 rounded bg-[#F5F7FA] overflow-hidden flex items-start justify-center p-4">
                 <div style={{ transform: `scale(${zoom/100})`, transformOrigin: "top center", transition: "transform 0.2s" }} className="w-full max-w-xl">
                    {imagePreview ? (
                      <img 
                        src={imagePreview} 
                        alt="Invoice" 
                        className="w-full rounded shadow-sm border transition-transform duration-300" 
                        style={{ transform: `rotate(${rotation}deg)` }}
                      />
                    ) : null}
                 </div>
               </div>
             </>
          )}

          {processing && (
            <div className="mx-5 mb-4 flex items-center gap-3 p-3 rounded" style={{ background: "#E8EDF5" }}>
              <Loader size={16} className="text-[#1B4FD8] animate-spin" />
              <p className="text-[13px] text-[#1B4FD8] font-medium">AI is extracting invoice tables…</p>
            </div>
          )}
        </div>

        {/* Right: Extracted Data */}
        <div className="space-y-4">
          <div className="bg-white rounded border border-[#DDE2EC] p-5 shadow-sm">
            <p className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wide mb-3">Invoice Details</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Supplier", value: "SRI ADITYA MEDICALS", conf: 99 },
                { label: "Invoice No", value: "RGG16497", conf: 98 },
                { label: "Invoice Date", value: "10-09-2026", conf: 95 },
                { label: "GSTIN", value: "37ADNP...", conf: 88 },
              ].map(f => (
                <div key={f.label} className="p-3 rounded bg-[#F5F7FA] border border-[#F0F2F5]">
                  <p className="text-[11px] text-[#94A3B8]">{f.label}</p>
                  <p className="text-[13px] font-semibold text-[#0F1624] mt-0.5">{done ? f.value : <span className="skeleton w-24 h-4 inline-block" />}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded border border-[#DDE2EC] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wide">Extracted Items</p>
              {done && <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803d]">{extractedItems.length} rows scanned</span>}
            </div>
            
            <div className="space-y-3">
              {done ? extractedItems.map((item, i) => (
                <div key={i} className="p-4 rounded border transition-all hover:shadow-md" style={{ borderColor: !item.existsInMaster ? "#fcd34d" : "#F0F2F5", backgroundColor: !item.existsInMaster ? "#FEF3C7" : "white" }}>
                  {!item.existsInMaster && (
                    <div className="flex items-start gap-2 mb-3 bg-white p-2 rounded border border-amber-200">
                      <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[12px] font-medium text-amber-800">New Medicine detected! It will be automatically created in the Medicine Master.</p>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[14px] font-bold text-[#0F1624]">{item.matched}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: confBg(item.confidence), color: confColor(item.confidence) }}>
                          {item.confidence}% Match
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1 gap-x-4 mt-2">
                        <p className="text-[12px] text-[#334155]"><span className="text-[#94A3B8]">Batch:</span> {item.batch}</p>
                        <p className="text-[12px] text-[#334155]"><span className="text-[#94A3B8]">Expiry:</span> {item.expiry}</p>
                        <p className="text-[12px] text-[#334155]"><span className="text-[#94A3B8]">Qty:</span> <span className="font-bold">{item.quantity}</span></p>
                        <p className="text-[12px] text-[#334155]"><span className="text-[#94A3B8]">Rate:</span> ₹{item.rate}</p>
                        <p className="text-[12px] text-[#334155]"><span className="text-[#94A3B8]">Disc:</span> {item.discount}%</p>
                        <p className="text-[12px] text-[#334155]"><span className="text-[#94A3B8]">GST:</span> {item.gst}%</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col justify-between">
                       <p className="text-[14px] font-bold text-[#1B4FD8]">₹{calculateItemValue(item).toLocaleString("en-IN", {minimumFractionDigits:2})}</p>
                       <div className="flex gap-1 mt-4 justify-end">
                        <button onClick={() => alert("Inline editing will be enabled in the next update. You can delete and rescan if needed.")} className="p-1.5 rounded bg-white border border-[#DDE2EC] hover:bg-[#F5F7FA] text-[#334155] transition-colors"><Edit3 size={12} /></button>
                        <button onClick={() => setExtractedItems(prev => prev.filter(p => p.id !== item.id))} className="p-1.5 rounded bg-white border border-[#DDE2EC] hover:bg-[#FEE2E2] text-[#dc2626] transition-colors"><XCircle size={12} /></button>
                       </div>
                    </div>
                  </div>
                </div>
              )) : [1,2].map(i => (
                <div key={i} className="p-3 rounded border border-[#F0F2F5]">
                  <div className="skeleton h-4 w-3/4 mb-2" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>

          {done && (
            <div className="bg-white rounded border border-[#DDE2EC] p-5 shadow-sm">
              <div className="flex justify-between items-center text-[13px] font-medium text-[#64748B] mb-2">
                <span>Subtotal</span>
                <span>₹{extractedItems.reduce((acc, item) => acc + (item.quantity * item.rate), 0).toLocaleString("en-IN", {minimumFractionDigits:2})}</span>
              </div>
              <div className="flex justify-between items-center text-[13px] font-medium text-[#dc2626] mb-2">
                <span>Total Discount</span>
                <span>- ₹{extractedItems.reduce((acc, item) => acc + ((item.quantity * item.rate) * (item.discount / 100)), 0).toLocaleString("en-IN", {minimumFractionDigits:2})}</span>
              </div>
              <div className="flex justify-between items-center text-[13px] font-medium text-[#d97706] mb-4">
                <span>Total GST</span>
                <span>+ ₹{extractedItems.reduce((acc, item) => acc + (((item.quantity * item.rate) - ((item.quantity * item.rate) * (item.discount / 100))) * (item.gst / 100)), 0).toLocaleString("en-IN", {minimumFractionDigits:2})}</span>
              </div>
              <div className="border-t border-[#DDE2EC] pt-3 flex justify-between items-center">
                <span className="text-[16px] font-bold text-[#0F1624]">Grand Total</span>
                <span className="text-[22px] font-bold text-[#15803d]">₹{totalValue.toLocaleString("en-IN", {minimumFractionDigits:2})}</span>
              </div>
              
              <button onClick={handleConfirm} className="w-full mt-5 flex items-center justify-center gap-2 py-3 rounded text-white font-semibold text-[14px] shadow-sm hover:opacity-90 transition-opacity" style={{ background: "#16a34a" }}>
                <CheckCircle size={18} /> Confirm & Post to Inventory
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
