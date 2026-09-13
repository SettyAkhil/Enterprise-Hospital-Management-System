import { useState } from "react";
import { Upload, ZoomIn, ZoomOut, RotateCw, Maximize2, CheckCircle, Edit3, XCircle, Search, AlertTriangle, Loader } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { usePharmacyData } from "../data/usePharmacyData";

const extractedMeds: any[] = []

const confColor = (c: number) => c >= 90 ? "#15803d" : c >= 75 ? "#d97706" : "#dc2626";
const confBg = (c: number) => c >= 90 ? "#f0fdf4" : c >= 75 ? "#fffbeb" : "#fef2f2";
const confLabel = (c: number) => c >= 90 ? "High" : c >= 75 ? "Medium" : "Low";

interface OCRProps { onNavigate: (page: string) => void }

export default function OCRVerification({ onNavigate }: OCRProps) {
  const { medicines } = usePharmacyData();
  const [zoom, setZoom] = useState(100);
  const [uploaded, setUploaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [extractedMeds, setExtractedMeds] = useState<any[]>([]);

  const handleUpload = () => {
    setProcessing(true);
    setUploaded(true);
    setTimeout(() => { 
      setProcessing(false); 
      setDone(true);
      
      const meds = medicines.slice(0, 3).map(m => ({
        id: m.id,
        matched: m.name,
        generic: m.generic,
        stock: m.stock,
        mrp: m.mrp,
        price: m.price,
        batchId: null, // User picks later or we auto-pick
        quantity: 1, // default qty
        ocr: m.name.substring(0, 5) + "...",
        confidence: Math.floor(Math.random() * (99 - 75) + 75),
        status: m.stock < 20 ? "warning" : "ok",
        warning: m.stock < 20 ? "Low stock available" : ""
      }));
      setExtractedMeds(meds);
    }, 1500);
  };

  const handleConfirm = () => {
    if (extractedMeds.length === 0) return;
    
    const cart = extractedMeds.map(m => ({
      medicineId: m.id,
      medicineName: m.matched,
      genericName: m.generic,
      quantity: 1,
      mrp: m.mrp,
      price: m.price,
      batchId: null // To be filled in Dispensing
    }));
    
    localStorage.setItem("_v2_pharmacy_cart", JSON.stringify(cart));
    onNavigate("dispensing");
  };

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Prescription Processing" }, { label: "OCR Verification" }]}
        title="AI Prescription OCR Verification"
        description="Upload a prescription image for AI-powered extraction and verification"
        onNavigate={onNavigate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Image */}
        <div className="bg-white rounded-none border border-[#e5e7eb] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#f3f4f6]">
            <p className="font-semibold text-[14px] text-[#111827]">Prescription Image</p>
            <div className="flex items-center gap-1">
              {[
                { icon: ZoomOut, action: () => setZoom(z => Math.max(50, z - 10)) },
                { icon: ZoomIn, action: () => setZoom(z => Math.min(200, z + 10)) },
                { icon: RotateCw, action: () => {} },
                { icon: Maximize2, action: () => {} },
              ].map(({ icon: Icon, action }, i) => (
                <button key={i} onClick={action} className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#6b7280] transition-colors">
                  <Icon size={14} />
                </button>
              ))}
              <span className="text-[12px] text-[#6b7280] ml-1">{zoom}%</span>
            </div>
          </div>

          {!uploaded ? (
            <div className="flex flex-col items-center justify-center h-80 m-5 rounded-none border-2 border-dashed border-[#e5e7eb] cursor-pointer hover:border-[#4f46e5] hover:bg-[#f8faff] transition-all" onClick={handleUpload}>
              <div className="w-14 h-14 rounded-none flex items-center justify-center mb-3" style={{ background: "#eff6ff" }}>
                <Upload size={22} style={{ color: "#4f46e5" }} />
              </div>
              <p className="font-semibold text-[14px] text-[#111827]">Upload Prescription</p>
              <p className="text-[12px] text-[#6b7280] mt-1">Click to upload or drag & drop</p>
              <p className="text-[11px] text-[#9ca3af] mt-1">JPG, PNG, PDF — max 10MB</p>
              <button onClick={handleUpload} className="mt-4 px-4 py-2 rounded-none text-white text-[13px] font-medium" style={{ background: "#4f46e5" }}>
                Simulate Upload
              </button>
            </div>
          ) : (
            <div className="relative h-80 m-4 rounded-none bg-[#f9fafb] overflow-hidden flex items-center justify-center" style={{ transform: `scale(${zoom/100})` }}>
              {/* Prescription mockup */}
              <div className="w-full h-full p-6 text-[11px] leading-relaxed" style={{ fontFamily: "monospace", color: "#111827" }}>
                <div className="text-center mb-4">
                  <p className="font-bold text-[13px]">Apollo Hospital</p>
                  <p className="text-[10px] text-[#6b7280]">Bannerghatta Road, Bangalore · Tel: 080-2345-6789</p>
                  <div className="border-b border-[#e5e7eb] my-2" />
                </div>
                <div className="grid grid-cols-2 gap-x-4 mb-4 text-[10px]">
                  <div><span className="text-[#6b7280]">Patient:</span> <span className="font-semibold">Arjun Sharma</span></div>
                  <div><span className="text-[#6b7280]">Age:</span> <span className="font-semibold">45M</span></div>
                  <div><span className="text-[#6b7280]">Date:</span> <span className="font-semibold">12/09/2026</span></div>
                  <div><span className="text-[#64Tabcde64748b]">Dr:</span> <span className="font-semibold">Dr. Priya Menon</span></div>
                </div>
                <div className="mb-2 text-[10px] font-semibold text-[#6b7280]">Rx</div>
                {[
                  "1. Tab. Paracetamol 500mg — 1-0-1 × 5 days (after meals)",
                  "2. Tab. None 250mg — 1-0-0 × 3 days",
                  "3. Tab. Pantoprazole 40mg — 1-0-0 × 7 days (before breakfast)",
                  "4. Tab. Cetirizine 10mg — 0-0-1 × 5 days (at night)",
                ].map((line, i) => (
                  <div key={i} className="mb-2 p-1.5 rounded border-l-2 border-[#4f46e5] pl-2 bg-[#eff6ff]/50 text-[10px]">{line}</div>
                ))}
                <div className="mt-4 pt-2 border-t border-[#e5e7eb] text-[10px] text-right text-[#6b7280]">
                  <p>Dr. Priya Menon · MCI: 2015/1234</p>
                </div>
              </div>
            </div>
          )}

          {processing && (
            <div className="mx-5 mb-4 flex items-center gap-3 p-3 rounded-none" style={{ background: "#eff6ff" }}>
              <Loader size={16} className="text-[#4f46e5] animate-spin" />
              <p className="text-[13px] text-[#4f46e5] font-medium">AI is processing the prescription…</p>
            </div>
          )}
        </div>

        {/* Right: Extracted data */}
        <div className="space-y-4">
          {/* Patient info */}
          <div className="bg-white rounded-none border border-[#e5e7eb] p-5">
            <p className="text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide mb-3">Extracted Patient Info</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Patient Name", value: "-", conf: 97 },
                { label: "Age / Gender", value: "-", conf: 99 },
                { label: "Doctor", value: "-", conf: 91 },
                { label: "Reg. Number", value: "-", conf: 85 },
              ].map(f => (
                <div key={f.label} className="p-3 rounded-none bg-[#f9fafb] border border-[#f3f4f6]">
                  <p className="text-[11px] text-[#9ca3af]">{f.label}</p>
                  <p className="text-[13px] font-semibold text-[#111827] mt-0.5">{done ? f.value : <span className="skeleton w-24 h-4 inline-block" />}</p>
                  {done && (
                    <div className="flex items-center gap-1 mt-1">
                      <div className="h-1 flex-1 rounded-none bg-[#e5e7eb] overflow-hidden">
                        <div className="h-full rounded-none" style={{ width: `${f.conf}%`, background: confColor(f.conf) }} />
                      </div>
                      <span className="text-[10px] font-medium" style={{ color: confColor(f.conf) }}>{f.conf}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Medicines */}
          <div className="bg-white rounded-none border border-[#e5e7eb] p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide">Extracted Medicines</p>
              {done && <span className="text-[11px] font-medium px-2 py-0.5 rounded-none" style={{ background: "#f0fdf4", color: "#15803d" }}>4 medicines extracted</span>}
            </div>
            <div className="space-y-3">
              {done ? extractedMeds.map((m, i) => (
                <div key={i} className="p-3 rounded-none border" style={{ borderColor: m.status === "warning" ? "#fef3c7" : "#f3f4f6" }}>
                  {m.status === "warning" && (
                    <div className="flex items-start gap-2 mb-2 p-2 rounded-none" style={{ background: "#fffbeb" }}>
                      <AlertTriangle size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700">{m.warning}</p>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[13px] font-semibold text-[#111827]">{m.matched}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: confBg(m.confidence), color: confColor(m.confidence) }}>
                          {confLabel(m.confidence)} · {m.confidence}%
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6b7280]">OCR: "{m.ocr}" · Generic: {m.generic}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: m.stock < 20 ? "#dc2626" : "#6b7280" }}>
                        Stock: {m.stock} {m.stock < 20 ? "⚠ Low" : ""}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded-none hover:bg-[#f0fdf4] text-[#15803d] transition-colors" title="Confirm"><CheckCircle size={14} /></button>
                      <button className="p-1.5 rounded-none hover:bg-[#eff6ff] text-[#4f46e5] transition-colors" title="Edit"><Edit3 size={14} /></button>
                      <button className="p-1.5 rounded-none hover:bg-[#fef2f2] text-[#dc2626] transition-colors" title="Reject"><XCircle size={14} /></button>
                    </div>
                  </div>
                </div>
              )) : [1,2,3].map(i => (
                <div key={i} className="p-3 rounded-none border border-[#f3f4f6]">
                  <div className="skeleton h-4 w-3/4 mb-2" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {done && (
            <div className="flex gap-3">
              <button onClick={handleConfirm} className="flex-1 py-2.5 rounded-none text-white font-semibold text-[13px]" style={{ background: "#16a34a" }}>
                Confirm All & Proceed
              </button>
              <button className="flex-1 py-2.5 rounded-none border border-[#e5e7eb] font-semibold text-[13px] text-[#374151] hover:bg-[#f9fafb] transition-colors">
                Review Manually
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
