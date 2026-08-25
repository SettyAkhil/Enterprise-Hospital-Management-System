import React, { useState } from "react";
import { Icon } from "./icons";
import { DBOPEncounter } from "../services/db";

interface PatientBarcodeProps {
  encounter: DBOPEncounter;
  onScanComplete?: (encounter: DBOPEncounter) => void;
  showScannerButton?: boolean;
}

export default function PatientBarcode({ encounter, onScanComplete, showScannerButton = true }: PatientBarcodeProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);

  // Generate deterministic barcode pattern from UMR and OP number
  const barcodeCode = `${encounter.umr}-${encounter.opNumber}`;
  
  // Deterministic SVG bars based on string hash
  const generateBarcodeBars = (code: string) => {
    const bars: { width: number; fill: string }[] = [];
    // Start guard
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
    // End guard
    bars.push({ width: 2, fill: "#000" }, { width: 1, fill: "#fff" }, { width: 3, fill: "#000" });
    return bars;
  };

  const barcodeBars = generateBarcodeBars(barcodeCode);

  const handleTriggerScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setShowScanModal(true);
      if (onScanComplete) {
        onScanComplete(encounter);
      }
    }, 1100);
  };

  return (
    <div className="space-y-3">
      {/* Visual Barcode Container */}
      <div 
        onClick={handleTriggerScan}
        className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs cursor-pointer hover:border-[#1B4FD8] hover:shadow-md transition-all group relative overflow-hidden"
        title="Click to simulate hospital barcode scanner"
      >
        {/* Laser scan line animation */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-center">
            <div className="h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse"></div>
            <div className="text-[10px] text-red-500 font-mono text-center font-bold mt-1 animate-bounce">
              SCANNING OP BARCODE...
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          {/* 1D Linear Barcode */}
          <div className="flex-1 flex flex-col items-center">
            <div className="flex items-stretch h-12 w-full justify-center px-2 bg-white">
              {barcodeBars.map((bar, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${bar.width * 2.2}px`,
                    backgroundColor: bar.fill === "#000" ? "#0F172A" : "transparent"
                  }}
                  className="h-full flex-shrink-0"
                />
              ))}
            </div>
            <span className="font-mono text-[11px] tracking-[0.25em] text-gray-800 font-bold mt-1">
              *{barcodeCode}*
            </span>
          </div>

          {/* 2D QR Code Matrix */}
          <div className="w-16 h-16 bg-[#0F172A] p-1.5 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-xs border border-gray-300">
            <svg viewBox="0 0 24 24" className="w-full h-full text-white" fill="currentColor">
              <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 2h2v2h-2v-2zm-4-4h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2zm0 4h2v2h-2v-2zm-4 0h2v2h-2v-2zm2 2h2v2h-2v-2z" />
            </svg>
          </div>
        </div>

        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 text-[10.5px] text-[#64748B]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
            Encoded: <strong>{encounter.patientName}</strong> ({encounter.umr})
          </span>
          <span className="text-[#1B4FD8] font-semibold group-hover:underline flex items-center gap-1">
            📷 Click to Scan
          </span>
        </div>
      </div>

      {showScannerButton && (
        <button
          type="button"
          onClick={handleTriggerScan}
          disabled={isScanning}
          className="w-full py-2 px-3 bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] text-[#1D4ED8] text-[12px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
        >
          {isScanning ? (
            <div className="w-3.5 h-3.5 border-2 border-[#1D4ED8] border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span>📷</span>
          )}
          {isScanning ? "Scanning Barcode..." : "Test Hospital Barcode Scanner"}
        </button>
      )}

      {/* ── SCANNER DECODE MODAL ─────────────────────────────────────── */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[#DDE2EC] animate-in zoom-in-95">
            <div className="bg-[#0F172A] text-white p-5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#16A34A] flex items-center justify-center text-white font-bold text-sm">
                  ✓
                </div>
                <div>
                  <h3 className="text-[14.5px] font-bold">Barcode Scanned Successfully</h3>
                  <p className="text-[11px] text-[#94A3B8]">Decoded from Code 128 / QR Matrix</p>
                </div>
              </div>
              <button
                onClick={() => setShowScanModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-[13px]">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2">
                  <span className="text-[#64748B] text-[11.5px] uppercase font-bold">Patient Name</span>
                  <span className="font-bold text-gray-900 text-[14px]">{encounter.patientName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] text-[11.5px] uppercase font-bold">Permanent UMR (Lifetime)</span>
                  <span className="font-mono font-bold text-[#1B4FD8] text-[14px] bg-blue-50 px-2 py-0.5 rounded">
                    {encounter.umr}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] text-[11.5px] uppercase font-bold">Current Visit OP Number</span>
                  <span className="font-mono font-bold text-[#D97706] text-[14px] bg-amber-50 px-2 py-0.5 rounded">
                    {encounter.opNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] text-[11.5px] uppercase font-bold">Age / Demographics</span>
                  <span className="font-semibold text-gray-800">{encounter.age} yrs · {encounter.sex}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] text-[11.5px] uppercase font-bold">Registered Phone</span>
                  <span className="font-mono text-gray-800">{encounter.phone}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] text-[11.5px] uppercase font-bold">Department</span>
                  <span className="font-semibold text-gray-800">{encounter.dept}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] text-[11.5px] uppercase font-bold">Registration Timestamp</span>
                  <span className="font-mono text-gray-700">{encounter.registrationTime}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-[#E2E8F0]">
                  <span className="text-[#64748B] text-[11.5px] uppercase font-bold">Barcode Key</span>
                  <span className="font-mono text-[11px] text-gray-500">*{barcodeCode}*</span>
                </div>
              </div>

              <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] rounded-xl text-[12px] text-[#166534] flex items-center gap-2">
                <span>🛡️</span>
                <span><strong>Identity Authenticated:</strong> Valid Outpatient Pass linked to permanent hospital record.</span>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] border-t border-[#DDE2EC] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowScanModal(false)}
                className="px-4 py-2 bg-[#1B4FD8] hover:bg-[#1740B4] text-white font-bold text-[12.5px] rounded-lg shadow-sm"
              >
                Close Scan Result
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
