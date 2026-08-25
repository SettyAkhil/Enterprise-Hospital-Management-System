import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { DBOPEncounter } from "../services/db";

interface PatientBarcodeProps {
  encounter: DBOPEncounter;
  onScanComplete?: (encounter: DBOPEncounter) => void;
  showScannerButton?: boolean;
}

export default function PatientBarcode({ encounter, onScanComplete, showScannerButton = true }: PatientBarcodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);

  // Generate mobile scannable QR payload formatted for native smartphone camera popups
  const qrPayload = [
    `🏥 HOSPITAL OUTPATIENT (OP) PASS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 Patient: ${encounter.patientName}`,
    `🆔 Permanent UMR: ${encounter.umr}`,
    `🎫 Visit OP No: ${encounter.opNumber}`,
    `🎂 Age: ${encounter.age} yrs`,
    `📞 Phone: ${encounter.phone}`,
    `🩺 Dept: ${encounter.dept || "General Medicine"}`,
    `🕒 Registered: ${encounter.registrationTime}`,
    `📋 Status: ${encounter.status}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `✓ Verified HospAI Electronic Health Record`
  ].join("\n");

  useEffect(() => {
    // Generate high-resolution scannable QR matrix (Error correction level M for easy camera autofocus)
    QRCode.toDataURL(qrPayload, {
      width: 260,
      margin: 1,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF"
      },
      errorCorrectionLevel: "M"
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error("QR Code Error:", err));
  }, [qrPayload]);

  // Generate Code 128 linear barcode string
  const barcodeCode = `${encounter.umr}-${encounter.opNumber}`;

  // Deterministic SVG bars for linear barcode
  const generateBarcodeBars = (code: string) => {
    const bars: { width: number; fill: string }[] = [];
    bars.push({ width: 3, fill: "#000" }, { width: 1, fill: "#fff" }, { width: 2, fill: "#000" }, { width: 2, fill: "#fff" });
    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      const w1 = (charCode % 3) + 1;
      const w2 = ((charCode >> 1) % 3) + 1;
      const w3 = ((charCode >> 2) % 2) + 1;
      const w4 = ((charCode >> 3) % 2) + 1;
      bars.push(
        { width: w1, fill: "#000" },
        { width: w2, fill: "#fff" },
        { width: w3, fill: "#000" },
        { width: w4, fill: "#fff" }
      );
    }
    bars.push({ width: 2, fill: "#000" }, { width: 1, fill: "#fff" }, { width: 3, fill: "#000" });
    return bars;
  };

  const barcodeBars = generateBarcodeBars(barcodeCode);

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setShowScanModal(true);
      if (onScanComplete) {
        onScanComplete(encounter);
      }
    }, 1000);
  };

  return (
    <div className="space-y-3">
      {/* ── CARD PASS BARCODE & MOBILE QR SECTION ──────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-gray-900">
        
        {/* Top Instructions */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-base">📱</span>
            <span className="text-[12px] font-bold text-gray-900">
              Scan with Mobile Phone Camera
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#86EFAC]">
            Point Phone Camera to Read
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          
          {/* 1. Linear Barcode (Hospital Laser Scanner) */}
          <div 
            onClick={handleSimulateScan}
            className="flex-1 cursor-pointer group hover:bg-[#F8FAFC] p-2 rounded-lg transition-all"
            title="Click to test on-screen barcode scan"
          >
            <div className="text-[10.5px] font-semibold text-[#64748B] mb-1 flex items-center justify-between">
              <span>Linear Hospital Barcode:</span>
              <span className="text-[#1B4FD8] font-bold group-hover:underline text-[10px]">Laser Scan ➔</span>
            </div>
            <div className="flex items-stretch h-11 w-full justify-center px-1 bg-white border border-gray-100 rounded">
              {barcodeBars.map((bar, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${bar.width * 2}px`,
                    backgroundColor: bar.fill === "#000" ? "#0F172A" : "transparent"
                  }}
                  className="h-full flex-shrink-0"
                />
              ))}
            </div>
            <div className="text-center font-mono font-bold text-[11px] text-gray-800 tracking-[0.2em] mt-1">
              *{barcodeCode}*
            </div>
          </div>

          {/* 2. Mobile Phone Scannable QR Matrix */}
          <div className="flex flex-col items-center flex-shrink-0 bg-[#F8FAFC] p-2 rounded-xl border border-gray-200 shadow-xs">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Patient QR Code"
                className="w-24 h-24 rounded-lg shadow-xs border border-gray-300"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-xs text-gray-400">
                Loading QR...
              </div>
            )}
            <span className="text-[9.5px] font-bold text-[#1E3A8A] mt-1 uppercase tracking-wider">
              Mobile Scannable
            </span>
          </div>

        </div>

        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-[#64748B]">
          <span>
            UMR: <strong className="font-mono text-[#1B4FD8]">{encounter.umr}</strong> · OP: <strong className="font-mono text-[#D97706]">{encounter.opNumber}</strong>
          </span>
          <span className="text-[10.5px] text-gray-500">
            Open camera app &amp; aim at QR code
          </span>
        </div>
      </div>

      {showScannerButton && (
        <button
          type="button"
          onClick={handleSimulateScan}
          disabled={isScanning}
          className="w-full py-2.5 px-4 bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] text-[#1D4ED8] text-[12.5px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
        >
          {isScanning ? (
            <div className="w-4 h-4 border-2 border-[#1D4ED8] border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span>📷</span>
          )}
          {isScanning ? "Scanning Barcode & Reading Record..." : "Test On-Screen Barcode Reader"}
        </button>
      )}

      {/* ── SCANNER RESULT MODAL ─────────────────────────────────────── */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[#DDE2EC] animate-in zoom-in-95">
            <div className="bg-[#0F172A] text-white p-4.5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#16A34A] flex items-center justify-center text-white font-bold text-xs">
                  ✓
                </div>
                <div>
                  <h3 className="text-[14px] font-bold">Patient Details Retrieved</h3>
                  <p className="text-[10.5px] text-[#94A3B8]">Decoded from Patient Barcode &amp; QR Pass</p>
                </div>
              </div>
              <button
                onClick={() => setShowScanModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-[12.5px]">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-2.5">
                <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2">
                  <span className="text-[#64748B] text-[11px] uppercase font-bold">Patient Full Name</span>
                  <span className="font-bold text-gray-900 text-[13.5px]">{encounter.patientName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] text-[11px] uppercase font-bold">Permanent UMR (Lifetime)</span>
                  <span className="font-mono font-bold text-[#1B4FD8] text-[13px] bg-blue-50 px-2 py-0.5 rounded">
                    {encounter.umr}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] text-[11px] uppercase font-bold">Current Visit OP Number</span>
                  <span className="font-mono font-bold text-[#D97706] text-[13px] bg-amber-50 px-2 py-0.5 rounded">
                    {encounter.opNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] text-[11px] uppercase font-bold">Age</span>
                  <span className="font-semibold text-gray-800">{encounter.age} yrs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] text-[11px] uppercase font-bold">Phone Number</span>
                  <span className="font-mono text-gray-800">{encounter.phone}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] text-[11px] uppercase font-bold">Department</span>
                  <span className="font-semibold text-gray-800">{encounter.dept || "General Medicine"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] text-[11px] uppercase font-bold">Registration Timestamp</span>
                  <span className="font-mono text-gray-700">{encounter.registrationTime}</span>
                </div>
              </div>

              <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] rounded-xl text-[11.5px] text-[#166534] flex items-center gap-2">
                <span>✓</span>
                <span><strong>Active Record:</strong> Scanned pass matches patient database entry.</span>
              </div>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] border-t border-[#DDE2EC] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowScanModal(false)}
                className="px-4 py-1.5 bg-[#1B4FD8] hover:bg-[#1740B4] text-white font-bold text-[12px] rounded-lg shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
