import React, { useState, useRef } from "react"
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Search,
  RefreshCw,
  Info
} from "lucide-react"
import { PharmacyDatabase } from "../../../services/pharmacyDb"

interface ImportMedicinesModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  existingMedicines: any[]
}

export interface ParsedMedicineRow {
  name: string
  generic: string
  form: string
  strength: string
  manufacturer: string
  mnfCode: string
  hsnCode: string
  schedule: string
  gst: number
  mrp: number
  purchasePrice: number
  discount: number
  stock: number
  batchNumber: string
  expiryDate: string
  binNo: string
  category: string
  isValid: boolean
  errors: string[]
  isExisting: boolean
}

export default function ImportMedicinesModal({
  isOpen,
  onClose,
  onSuccess,
  existingMedicines,
}: ImportMedicinesModalProps) {
  const [parsedRows, setParsedRows] = useState<ParsedMedicineRow[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [createOpeningBatches, setCreateOpeningBatches] = useState(true)
  const [updateExisting, setUpdateExisting] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<{
    total: number
    valid: number
    existing: number
    totalStock: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  // Clean CSV text line by line handling quotes
  const parseCSVLines = (text: string): string[][] => {
    // Remove BOM if present
    const cleanText = text.replace(/^\uFEFF/, "")
    const lines = cleanText.split(/\r?\n/).filter((line) => line.trim().length > 0)
    
    return lines.map((line) => {
      const row: string[] = []
      let insideQuote = false
      let currentVal = ""

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          if (insideQuote && line[i + 1] === '"') {
            currentVal += '"'
            i++ // skip escaped quote
          } else {
            insideQuote = !insideQuote
          }
        } else if (char === "," && !insideQuote) {
          row.push(currentVal.trim())
          currentVal = ""
        } else {
          currentVal += char
        }
      }
      row.push(currentVal.trim())
      return row
    })
  }

  // Parse Date string into YYYY-MM-DD
  const normalizeExpiryDate = (val: string): string => {
    if (!val) return "2028-03-31"
    const trimmed = val.trim()

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

    // MM/YY or MM-YY -> 20YY-MM-lastDay
    const mmyyMatch = trimmed.match(/^(\d{1,2})[/-](\d{2})$/)
    if (mmyyMatch) {
      const month = mmyyMatch[1].padStart(2, "0")
      const year = "20" + mmyyMatch[2]
      return `${year}-${month}-28`
    }

    // MM/YYYY or MM-YYYY
    const mmyyyyMatch = trimmed.match(/^(\d{1,2})[/-](\d{4})$/)
    if (mmyyyyMatch) {
      const month = mmyyyyMatch[1].padStart(2, "0")
      const year = mmyyyyMatch[2]
      return `${year}-${month}-28`
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
    if (ddmmyyyyMatch) {
      const day = ddmmyyyyMatch[1].padStart(2, "0")
      const month = ddmmyyyyMatch[2].padStart(2, "0")
      const year = ddmmyyyyMatch[3]
      return `${year}-${month}-${day}`
    }

    return "2028-03-31"
  }

  const processCSVData = (rows: string[][], sourceName: string) => {
    if (rows.length < 2) {
      alert("The uploaded CSV file must contain a header row and at least one data row.")
      return
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ""))
    
    // Find index of headers with fuzzy matching
    const findIndex = (aliases: string[]) => {
      return headers.findIndex((h) => aliases.some((a) => h.includes(a.replace(/[^a-z0-9]/g, ""))))
    }

    const nameIdx = findIndex(["productname", "medicinename", "itemname", "brandname", "medicine", "name"])
    const genericIdx = findIndex(["genericname", "generic", "composition", "salt"])
    const formIdx = findIndex(["dosageform", "form", "dosage", "type"])
    const strengthIdx = findIndex(["strength", "pack", "packing", "size"])
    const mnfIdx = findIndex(["manufacturer", "mfg", "company", "brand"])
    const mnfCodeIdx = findIndex(["mnfcode", "mfgcode", "mfgshort"])
    const hsnIdx = findIndex(["hsncode", "hsn", "sku"])
    const scheduleIdx = findIndex(["schedule", "scheduletype"])
    const gstIdx = findIndex(["gst", "tax", "taxpercentage"])
    const mrpIdx = findIndex(["mrp", "maxretailprice", "retailprice", "rate"])
    const purchaseIdx = findIndex(["purchaserate", "purchaseprice", "ptr", "cost"])
    const disIdx = findIndex(["discount", "dis", "disc"])
    const stockIdx = findIndex(["openingstock", "stock", "quantity", "qty", "stockqty"])
    const batchIdx = findIndex(["batchnumber", "batchno", "batch"])
    const expIdx = findIndex(["expirydate", "expdate", "expiry", "exp"])
    const binIdx = findIndex(["bin", "rack", "location", "shelf"])

    const parsed: ParsedMedicineRow[] = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (row.length === 0 || (row.length === 1 && !row[0])) continue

      const name = nameIdx !== -1 ? row[nameIdx] || "" : row[0] || ""
      if (!name.trim()) continue // Skip empty line

      const generic = genericIdx !== -1 ? row[genericIdx] || "" : ""
      const form = (formIdx !== -1 ? row[formIdx] || "TABLETS" : "TABLETS").toUpperCase()
      const strength = strengthIdx !== -1 ? row[strengthIdx] || "" : ""
      const manufacturer = mnfIdx !== -1 ? row[mnfIdx] || "General Pharma" : "General Pharma"
      const mnfCode = mnfCodeIdx !== -1 && row[mnfCodeIdx] 
        ? row[mnfCodeIdx].toUpperCase() 
        : (manufacturer ? manufacturer.substring(0, 3).toUpperCase() : "GEN")
      
      const hsnCode = hsnIdx !== -1 ? row[hsnIdx] || "3004 039" : "3004 039"
      const schedule = scheduleIdx !== -1 ? (row[scheduleIdx] || "H").toUpperCase() : "H"
      
      const rawGst = gstIdx !== -1 ? parseFloat(row[gstIdx]) : 5
      const gst = isNaN(rawGst) ? 5 : rawGst

      const rawMrp = mrpIdx !== -1 ? parseFloat(row[mrpIdx]) : 100
      const mrp = isNaN(rawMrp) ? 100 : rawMrp

      const rawPurchase = purchaseIdx !== -1 ? parseFloat(row[purchaseIdx]) : mrp * 0.75
      const purchasePrice = isNaN(rawPurchase) ? +(mrp * 0.75).toFixed(2) : rawPurchase

      const rawDis = disIdx !== -1 ? parseFloat(row[disIdx]) : 0
      const discount = isNaN(rawDis) ? 0 : rawDis

      const rawStock = stockIdx !== -1 ? parseInt(row[stockIdx], 10) : 50
      const stock = isNaN(rawStock) ? 50 : Math.max(0, rawStock)

      const batchNumber = batchIdx !== -1 && row[batchIdx] 
        ? row[batchIdx].trim() 
        : "BT" + Math.floor(100000 + Math.random() * 900000)

      const expiryDate = normalizeExpiryDate(expIdx !== -1 ? row[expIdx] : "2028-03-31")
      const binNo = binIdx !== -1 && row[binIdx] ? row[binIdx].trim() : "RACK-GEN-01"

      const errors: string[] = []
      if (!name) errors.push("Medicine name required")
      if (mrp <= 0) errors.push("MRP must be > 0")

      const isExisting = existingMedicines.some(
        (m) => m.name?.trim().toLowerCase() === name.trim().toLowerCase()
      )

      parsed.push({
        name: name.trim().toUpperCase(),
        generic: generic.trim(),
        form,
        strength: strength.trim(),
        manufacturer: manufacturer.trim(),
        mnfCode,
        hsnCode,
        schedule,
        gst,
        mrp,
        purchasePrice,
        discount,
        stock,
        batchNumber,
        expiryDate,
        binNo,
        category: "General Pharmacy",
        isValid: errors.length === 0,
        errors,
        isExisting,
      })
    }

    setFileName(sourceName)
    setParsedRows(parsed)

    const validCount = parsed.filter((r) => r.isValid).length
    const existingCount = parsed.filter((r) => r.isExisting).length
    const totalStock = parsed.reduce((sum, r) => sum + (r.isValid ? r.stock : 0), 0)

    setImportSummary({
      total: parsed.length,
      valid: validCount,
      existing: existingCount,
      totalStock,
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      if (text) {
        const rows = parseCSVLines(text)
        processCSVData(rows, file.name)
      }
    }
    reader.readAsText(file)
  }

  const handleDownloadTemplate = () => {
    const headers = [
      "Product Name",
      "Generic Name",
      "Dosage Form",
      "Strength",
      "Manufacturer",
      "Mnf Code",
      "HSN Code",
      "Schedule",
      "GST %",
      "MRP",
      "Purchase Rate",
      "Discount %",
      "Opening Stock",
      "Batch Number",
      "Expiry Date",
      "Bin / Rack No",
    ]

    const csvContent = headers.join(",") + "\n"

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "hospital_medicine_import_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExecuteImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid)
    if (validRows.length === 0) {
      alert("No valid rows available to import.")
      return
    }

    setIsProcessing(true)

    try {
      let addedCount = 0
      let updatedCount = 0
      let batchesCreated = 0

      validRows.forEach((row) => {
        // Check if medicine exists
        const existing = existingMedicines.find(
          (m) => m.name?.trim().toLowerCase() === row.name.trim().toLowerCase()
        )

        let targetMedId = existing?.id

        if (existing && updateExisting) {
          PharmacyDatabase.updateMedicine(existing.id, {
            medicineName: row.name,
            genericName: row.generic,
            dosageForm: row.form,
            strength: row.strength,
            manufacturer: row.manufacturer,
            mnfCode: row.mnfCode,
            hsnCode: row.hsnCode,
            scheduleType: row.schedule,
            taxPercentage: row.gst,
            binNo: row.binNo,
          })
          updatedCount++
        } else if (!existing) {
          targetMedId = "MED" + Date.now() + Math.floor(Math.random() * 10000)
          const newMedRecord = {
            id: targetMedId,
            brandName: row.name,
            medicineName: row.name,
            genericName: row.generic,
            strength: row.strength,
            dosageForm: row.form,
            manufacturer: row.manufacturer,
            mnfCode: row.mnfCode,
            taxPercentage: row.gst,
            activeStatus: "Active" as const,
            hsnCode: row.hsnCode,
            binNo: row.binNo,
            barcode: "890" + Math.floor(1000000000 + Math.random() * 9000000000),
            scheduleType: row.schedule,
            controlledSubstanceFlag: row.schedule === "X" || row.schedule === "H1",
            categoryId: row.category || "General",
            reorderLevel: 15,
            createdAt: new Date().toISOString(),
          }
          PharmacyDatabase.addMedicine(newMedRecord as any)
          addedCount++
        }

        // Add Batch & Inventory Ledger if stock > 0
        if (createOpeningBatches && row.stock > 0 && targetMedId) {
          const batchId = "BAT" + Date.now() + Math.floor(Math.random() * 10000)
          PharmacyDatabase.addBatch({
            id: batchId,
            medicineId: targetMedId,
            batchNumber: row.batchNumber,
            expiryDate: row.expiryDate,
            manufacturingDate: new Date().toISOString().split("T")[0],
            quantity: row.stock,
            availableQuantity: row.stock,
            mrp: row.mrp,
            purchasePrice: row.purchasePrice,
            location: row.binNo,
            grnId: "IMPORT_OPENING",
            createdAt: new Date().toISOString(),
          })
          batchesCreated++

          PharmacyDatabase.addTransaction({
            id: "TXN" + Math.floor(100000 + Math.random() * 900000),
            date: new Date().toISOString(),
            medicineId: targetMedId,
            batchId: batchId,
            quantity: row.stock,
            transactionType: "PURCHASE_RECEIVED",
            userId: "Hospital Inventory Manager",
            reason: "Bulk Import Opening Stock",
          })
        }
      })

      // Add Notification
      PharmacyDatabase.addNotification(
        "Medicines Imported to Medicine Master",
        `Successfully imported ${validRows.length} medicines (${addedCount} new added, ${updatedCount} updated, ${batchesCreated} batches created).`,
        "info",
        "Medicine Master",
        "View Inventory",
        "stock"
      )

      // Audio chime
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.type = "sine"
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1) // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35)
        osc.start()
        osc.stop(audioCtx.currentTime + 0.35)
      } catch (e) {
        // audio fallback
      }

      window.dispatchEvent(
        new CustomEvent("hospai_pharmacy_toast", {
          detail: {
            message: `Import Success! Added ${addedCount} medicines, updated ${updatedCount}, with ${batchesCreated} active batches.`,
          },
        })
      )

      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))

      setIsProcessing(false)
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      alert("Error importing medicines: " + (err.message || "Unknown error"))
      setIsProcessing(false)
    }
  }

  const filteredPreviewRows = parsedRows.filter((r) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      r.name.toLowerCase().includes(term) ||
      r.generic.toLowerCase().includes(term) ||
      r.manufacturer.toLowerCase().includes(term) ||
      r.batchNumber.toLowerCase().includes(term)
    )
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#CBD5E1] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#0F766E] to-[#115E59] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <FileSpreadsheet className="text-white" size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Import Medicines from CSV</h2>
              <p className="text-xs text-teal-100 font-medium">
                Upload your medicine spreadsheet to import directly into Medicine Master & inventory batches
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Top Format Helper Bar */}
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[#475569]">
            <Info size={16} className="text-[#0F766E] flex-shrink-0" />
            <span>
              Your CSV file should have headers: <b>Product Name, Generic, Form, Manufacturer, HSN, Batch, Expiry, MRP, Stock</b>
            </span>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#0F766E] text-xs font-bold text-[#0F766E] hover:bg-teal-50 shadow-xs transition-colors"
            title="Download blank CSV template with column headers for entering your medicines"
          >
            <Download size={14} /> Download Blank CSV Template (.CSV)
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!parsedRows.length && (
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#CBD5E1] hover:border-[#0F766E] rounded-2xl p-10 bg-[#F8FAFC] hover:bg-teal-50/40 text-center cursor-pointer transition-all group flex flex-col items-center justify-center space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, text/csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="w-16 h-16 rounded-2xl bg-teal-100 text-[#0F766E] group-hover:scale-105 flex items-center justify-center transition-transform shadow-xs">
                  <Upload size={30} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">
                    Click to browse or drag & drop your Medicine CSV file
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1">
                    Accepts any CSV file exported from Microsoft Excel, Google Sheets, or your pharmacy software
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 text-[11px] font-semibold text-[#0F766E]">
                  <span>Supports: .csv format</span>
                </div>
              </div>

              {/* Explanatory Guide Card */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 mt-0.5">
                  <FileText size={18} />
                </div>
                <div className="text-xs space-y-1">
                  <h4 className="font-bold text-emerald-950">How to use the CSV Format Template:</h4>
                  <p className="text-emerald-900 leading-relaxed">
                    1. Click the <b>"Download CSV Format Template"</b> button above.<br />
                    2. Open the file in <b>Excel</b> or <b>Google Sheets</b>.<br />
                    3. Fill in your medicine names, dosage forms, batches, prices, and stock quantities.<br />
                    4. Save the file and upload it here. It will immediately populate into Medicine Master!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Parsed Data Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              {/* Summary Metrics */}
              {importSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200">
                    <p className="text-[11px] font-semibold text-teal-800 uppercase">Total Items In CSV</p>
                    <p className="text-xl font-bold text-teal-900 mt-0.5">{importSummary.total}</p>
                    <p className="text-[11px] text-teal-700 mt-0.5 font-medium truncate">File: {fileName}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-[11px] font-semibold text-emerald-800 uppercase">Valid Ready to Import</p>
                    <p className="text-xl font-bold text-emerald-900 mt-0.5">{importSummary.valid}</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">100% verified</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                    <p className="text-[11px] font-semibold text-blue-800 uppercase">Existing in Master</p>
                    <p className="text-xl font-bold text-blue-900 mt-0.5">{importSummary.existing}</p>
                    <p className="text-[11px] text-blue-700 mt-0.5 font-medium">Will update details</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-[11px] font-semibold text-amber-800 uppercase">Total Opening Stock</p>
                    <p className="text-xl font-bold text-amber-900 mt-0.5">
                      {importSummary.totalStock.toLocaleString("en-IN")} units
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5 font-medium">Will create batches</p>
                  </div>
                </div>
              )}

              {/* Filter and Re-upload */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-white border border-[#CBD5E1] rounded-xl px-3 py-1.5 flex-1 max-w-sm">
                  <Search size={14} className="text-[#94A3B8]" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter preview by medicine name, generic, batch..."
                    className="text-xs outline-none text-[#0F172A] placeholder:text-[#94A3B8] w-full"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm("")}>
                      <X size={12} className="text-[#94A3B8]" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setParsedRows([])
                      setFileName(null)
                      setImportSummary(null)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9] transition-colors"
                  >
                    <RefreshCw size={13} /> Select Different CSV File
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden max-h-[340px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F1F5F9] border-b border-[#CBD5E1] sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 text-[11px] font-bold text-[#475569] uppercase">Status</th>
                      <th className="py-2.5 px-3 text-[11px] font-bold text-[#475569] uppercase">Medicine Name</th>
                      <th className="py-2.5 px-3 text-[11px] font-bold text-[#475569] uppercase">Generic Composition</th>
                      <th className="py-2.5 px-3 text-[11px] font-bold text-[#475569] uppercase">Form & Pack</th>
                      <th className="py-2.5 px-3 text-[11px] font-bold text-[#475569] uppercase">Manufacturer</th>
                      <th className="py-2.5 px-3 text-[11px] font-bold text-[#475569] uppercase">HSN</th>
                      <th className="py-2.5 px-3 text-[11px] font-bold text-[#475569] uppercase">Batch</th>
                      <th className="py-2.5 px-3 text-[11px] font-bold text-[#475569] uppercase">Expiry</th>
                      <th className="py-2.5 px-3 text-[11px] font-bold text-[#475569] uppercase text-right">MRP (₹)</th>
                      <th className="py-2.5 px-3 text-[11px] font-bold text-[#475569] uppercase text-right">Purchase (₹)</th>
                      <th className="py-2.5 px-3 text-[11px] font-bold text-[#475569] uppercase text-right">Stock</th>
                      <th className="py-2.5 px-3 text-[11px] font-bold text-[#475569] uppercase">Rack/Bin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredPreviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-[#94A3B8] text-xs">
                          No matching medicines found in current preview filter.
                        </td>
                      </tr>
                    ) : (
                      filteredPreviewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-2 px-3 whitespace-nowrap">
                            {row.isExisting ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                Update
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 size={10} /> New
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-semibold text-[#0F172A] whitespace-nowrap">
                            {row.name}
                          </td>
                          <td className="py-2 px-3 text-[#475569] max-w-[200px] truncate" title={row.generic}>
                            {row.generic || "-"}
                          </td>
                          <td className="py-2 px-3 text-[#334155] whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] font-medium">
                              {row.form}
                            </span>{" "}
                            <span className="text-[11px] text-[#64748B]">{row.strength}</span>
                          </td>
                          <td className="py-2 px-3 text-[#334155] whitespace-nowrap">
                            <span className="font-medium">{row.mnfCode}</span> - {row.manufacturer}
                          </td>
                          <td className="py-2 px-3 text-[#64748B] whitespace-nowrap font-mono text-[11px]">
                            {row.hsnCode}
                          </td>
                          <td className="py-2 px-3 text-[#0F172A] font-medium whitespace-nowrap">
                            {row.batchNumber}
                          </td>
                          <td className="py-2 px-3 text-[#475569] whitespace-nowrap">
                            {row.expiryDate}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-[#0F172A] whitespace-nowrap">
                            ₹{row.mrp.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right text-[#475569] whitespace-nowrap">
                            ₹{row.purchasePrice.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-teal-700 whitespace-nowrap">
                            {row.stock}
                          </td>
                          <td className="py-2 px-3 text-[#64748B] whitespace-nowrap">
                            {row.binNo}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Import Options Checkboxes */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#334155] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={createOpeningBatches}
                      onChange={(e) => setCreateOpeningBatches(e.target.checked)}
                      className="w-4 h-4 text-[#0F766E] rounded focus:ring-0 cursor-pointer accent-[#0F766E]"
                    />
                    Create Opening Stock Batches & Register Inventory Ledger
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#334155] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={(e) => setUpdateExisting(e.target.checked)}
                      className="w-4 h-4 text-[#0F766E] rounded focus:ring-0 cursor-pointer accent-[#0F766E]"
                    />
                    Update Existing Records if Medicine Name Matches
                  </label>
                </div>

                <div className="text-xs text-[#64748B]">
                  Showing <span className="font-bold text-[#0F172A]">{filteredPreviewRows.length}</span> of{" "}
                  <span className="font-bold text-[#0F172A]">{parsedRows.length}</span> medicines
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-[#E2E8F0] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {parsedRows.length > 0 && (
              <button
                disabled={isProcessing || parsedRows.filter((r) => r.isValid).length === 0}
                onClick={handleExecuteImport}
                className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Importing to Database...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Confirm & Import {parsedRows.filter((r) => r.isValid).length} Medicines
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
