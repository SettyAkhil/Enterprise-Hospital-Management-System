import { usePharmacyData } from "../data/usePharmacyData"
import { PharmacyDatabase } from "../../../services/pharmacyDb"
import { useState } from "react"
import {
  Search,
  Plus,
  Upload,
  Download,
  Filter,
  Edit2,
  Trash2,
  Eye,
  ChevronDown,
  X,
} from "lucide-react"

import PageHeader from "../components/PageHeader"
import StatusBadge from "../components/StatusBadge"
import ImportMedicinesModal from "../components/ImportMedicinesModal"

interface MedicineMasterProps {
  onNavigate: (page: string) => void
}

export default function MedicineMaster({ onNavigate }: MedicineMasterProps) {
  const { medicines, refresh } = usePharmacyData()
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selected, setSelected] = useState<typeof medicines[0] | null>(null)
  const [editingMedicine, setEditingMedicine] = useState<any>(null)

  const handleEdit = (m: any) => {
    setEditingMedicine({
      ...m,
      hsnCode: m.hsnCode || m.sku || "3004 039",
      mnfCode: m.mnfCode || (m.manufacturer ? m.manufacturer.substring(0, 3).toUpperCase() : "MAN"),
      binNo: m.binNo || "",
      schedule: m.schedule || "H",
      gst: m.gst ?? 5,
    })
    setShowModal(true)
  }

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this medicine?")) {
      PharmacyDatabase.deleteMedicine(id)
      refresh()
    }
  }

  const openAddModal = () => {
    setEditingMedicine({
      name: "",
      generic: "",
      strength: "",
      form: "TABLETS",
      manufacturer: "",
      mnfCode: "",
      hsnCode: "",
      schedule: "H",
      binNo: "",
      category: "General",
      gst: 5,
      mrp: "",
      price: "",
      stock: "",
      batchNumber: "",
      expiryDate: "",
      reorderLevel: "",
    })
    setShowModal(true)
  }

  const handleSave = () => {
    if (!editingMedicine.name) return alert("Medicine Name is required")

    const taxVal = editingMedicine.gst !== undefined ? Number(editingMedicine.gst) : 5
    const mnfShort = (
      editingMedicine.mnfCode ||
      (editingMedicine.manufacturer ? editingMedicine.manufacturer.substring(0, 3).toUpperCase() : "MAN")
    ).toUpperCase()

    if (editingMedicine.id) {
      PharmacyDatabase.updateMedicine(editingMedicine.id, {
        brandName: editingMedicine.name,
        medicineName: editingMedicine.name,
        genericName: editingMedicine.generic,
        strength: editingMedicine.strength,
        dosageForm: editingMedicine.form,
        manufacturer: editingMedicine.manufacturer,
        mnfCode: mnfShort,
        taxPercentage: taxVal,
        hsnCode: editingMedicine.hsnCode || editingMedicine.sku || "3004 039",
        binNo: editingMedicine.binNo || "",
        barcode: editingMedicine.barcode || "",
        scheduleType: editingMedicine.schedule || "H",
        controlledSubstanceFlag: editingMedicine.prescription || false,
        categoryId: editingMedicine.category || "General",
        reorderLevel: Number(editingMedicine.reorderLevel) || 10,
      } as any)
    } else {
      const newMed = {
        id: "MED" + Date.now(),
        brandName: editingMedicine.name,
        medicineName: editingMedicine.name,
        genericName: editingMedicine.generic,
        strength: editingMedicine.strength,
        dosageForm: editingMedicine.form || "TABLETS",
        manufacturer: editingMedicine.manufacturer || "MAN",
        mnfCode: mnfShort,
        taxPercentage: taxVal,
        activeStatus: "Active" as const,
        hsnCode: editingMedicine.hsnCode || "3004 039",
        binNo: editingMedicine.binNo || "",
        barcode: editingMedicine.barcode || "",
        scheduleType: editingMedicine.schedule || "H",
        controlledSubstanceFlag: editingMedicine.prescription || false,
        categoryId: editingMedicine.category || "General",
        reorderLevel: Number(editingMedicine.reorderLevel) || 10,
        createdAt: new Date().toISOString(),
      }
      PharmacyDatabase.addMedicine(newMed as any)

      if (Number(editingMedicine.stock) > 0) {
        const batchNum = editingMedicine.batchNumber?.trim() || "B" + Math.floor(100000 + Math.random() * 900000)
        const expDate = editingMedicine.expiryDate?.trim() || "2028-03-31"
        const batchId = "BAT" + Date.now()
        const purchaseRate = Number(editingMedicine.purchasePrice) || ((Number(editingMedicine.mrp) || 0) * 0.7)
        PharmacyDatabase.addBatch({
          id: batchId,
          medicineId: newMed.id,
          batchNumber: batchNum,
          expiryDate: expDate,
          manufacturingDate: new Date().toISOString().split("T")[0],
          quantity: Number(editingMedicine.stock),
          availableQuantity: Number(editingMedicine.stock),
          mrp: Number(editingMedicine.mrp) || 0,
          purchasePrice: purchaseRate,
          location: editingMedicine.binNo || "",
          grnId: "INIT",
          createdAt: new Date().toISOString(),
        })

        PharmacyDatabase.addTransaction({
          id: "TXN" + Math.floor(Math.random() * 100000),
          date: new Date().toISOString(),
          medicineId: newMed.id,
          batchId: batchId,
          quantity: Number(editingMedicine.stock),
          transactionType: "PURCHASE_RECEIVED",
          userId: "Pharmacist",
          reason: "Initial Stock / Opening Balance",
        })
      }
    }
    setShowModal(false)
    setEditingMedicine(null)
    refresh()
  }
  const handleExport = () => {
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

    const rows = filtered.map((m: any) => [
      `"${(m.name || "").replace(/"/g, '""')}"`,
      `"${(m.generic || "").replace(/"/g, '""')}"`,
      `"${(m.form || "TABLETS").replace(/"/g, '""')}"`,
      `"${(m.strength || "").replace(/"/g, '""')}"`,
      `"${(m.manufacturer || "").replace(/"/g, '""')}"`,
      `"${(m.mnfCode || (m.manufacturer ? m.manufacturer.substring(0, 3).toUpperCase() : "MAN")).replace(/"/g, '""')}"`,
      `"${(m.hsnCode || m.sku || "3004 039").replace(/"/g, '""')}"`,
      `"${(m.schedule || "H").replace(/"/g, '""')}"`,
      m.gst ?? 5,
      m.mrp || 0,
      m.price || +(m.mrp * 0.75).toFixed(2),
      0,
      m.stock || 0,
      `"${(m.batchNumber || "B" + Math.floor(100000 + Math.random() * 900000)).replace(/"/g, '""')}"`,
      `"${(m.expiryDate || "2028-03-31").replace(/"/g, '""')}"`,
      `"${(m.binNo || "RACK-GEN-01").replace(/"/g, '""')}"`,
    ])

    const csvContent =
      headers.join(",") +
      "\n" +
      rows.map((r) => r.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `hospital_medicines_export_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    window.dispatchEvent(
      new CustomEvent("hospai_pharmacy_toast", {
        detail: { message: `Exported ${filtered.length} medicines to CSV!` },
      }),
    )
  }

  const handleImport = () => {
    setShowImportModal(true)
  }

  const filtered = medicines.filter((m) => {
    return (
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.generic.toLowerCase().includes(search.toLowerCase()) ||
      m.sku.toLowerCase().includes(search.toLowerCase())
    )
  })

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "Pharmacy" },
          { label: "Inventory" },
          { label: "Medicine Master" },
        ]}
        title="Medicine Master"
        description={`${medicines.length} medicines · ${medicines.filter((m) => m.status === "active").length} active`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              className="flex items-center gap-1.5 px-3 py-2 rounded border border-[#E2E8F0] bg-white text-[13px] text-[#334155] hover:bg-[#F5F7FA] transition-colors"
            >
              <Upload size={13} /> Import
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#E2E8F0] text-[13px] font-medium text-[#334155] hover:bg-[#F5F7FA] transition-colors"
            >
              <Download size={14} /> Export
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-white font-medium text-[13px] transition-colors"
              style={{ background: "#0F766E" }}
            >
              <Plus size={14} /> Add Medicine
            </button>
          </div>
        }
        onNavigate={onNavigate}
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded px-3 py-2 flex-1 max-w-xs">
          <Search size={14} className="text-[#94A3B8] flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, generic, SKU…"
            className="text-[13px] outline-none text-[#0F1624] placeholder:text-[#94A3B8] w-full"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={12} className="text-[#94A3B8]" />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 text-[13px] text-[#64748B]">
          <span className="font-medium text-[#0F1624]">{filtered.length}</span>{" "}
          results
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        <table>
          <thead className="bg-[#ECFDF5] border-y border-[#A7F3D0]">
            <tr>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Medicine</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Generic Name</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Strength</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Form</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Manufacturer</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Stock</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">MRP (₹)</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Price (₹)</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Status</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr className="hover:bg-[#F0FDFA] transition-colors" key={m.id}>
                <td>
                  <div>
                    <p className="font-semibold text-[13px] text-[#0F1624]">
                      {m.name}
                    </p>
                    <p className="text-[11px] text-[#94A3B8]">
                      HSN: {m.hsnCode || m.sku} · Mnf: {m.mnfCode || "MAN"} {m.binNo ? `· Bin: ${m.binNo}` : ""}
                    </p>
                  </div>
                </td>
                <td className="text-[13px] text-[#334155]">{m.generic}</td>
                <td className="text-[13px] font-medium text-[#334155]">
                  {m.strength}
                </td>
                <td className="text-[12px] text-[#64748B]">{m.form}</td>
                <td className="text-[13px] text-[#334155]">{m.manufacturer}</td>
                <td>
                  <span
                    className="font-semibold text-[13px]"
                    style={{
                      color:
                        m.stock === 0
                          ? "#dc2626"
                          : m.stock < m.reorderLevel
                            ? "#d97706"
                            : "#15803d",
                    }}
                  >
                    {m.stock}
                  </span>
                  {m.prescription && (
                    <span
                      className="ml-1 text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: "#faf5ff", color: "#7c3aed" }}
                    >
                      Rx
                    </span>
                  )}
                </td>
                <td className="text-[13px] font-medium text-[#0F1624]">
                  ₹{m.mrp.toFixed(2)}
                </td>
                <td className="text-[13px] text-[#334155]">
                  ₹{m.price.toFixed(2)}
                </td>
                <td>
                  <StatusBadge status={m.status} size="sm" />
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelected(m)}
                      className="p-1.5 rounded hover:bg-[#F0F2F5] text-[#64748B] transition-colors"
                      title="View"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      onClick={() => handleEdit(m)}
                      className="p-1.5 rounded hover:bg-[#E8EDF5] text-[#0F766E] transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-1.5 rounded hover:bg-[#FEE2E2] text-[#dc2626] transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-[#94A3B8]">
                  No medicines found in master catalog.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Medicine Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.6)" }}
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F2F5]">
              <div>
                <p className="font-bold text-[16px] text-[#0F1624]">
                  {selected.name}
                </p>
                <p className="text-[12px] text-[#64748B]">
                  {selected.generic} · SKU: {selected.sku}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded hover:bg-[#F0F2F5] text-[#94A3B8] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5">
              <Grid
                title="Basic Information"
                rows={[
                  ["Medicine Name", selected.name],
                  ["Generic Name", selected.generic],
                  ["Manufacturer", selected.manufacturer],
                  ["SKU", selected.sku],
                ]}
              />
              <Grid
                title="Product Information"
                rows={[
                  ["Dosage Form", selected.form],
                  ["Strength", selected.strength],
                  ["Barcode", selected.barcode],
                  ["Schedule", selected.schedule],
                  [
                    "Prescription Required",
                    selected.prescription ? "Yes" : "No",
                  ],
                ]}
              />
              <Grid
                title="Pricing"
                rows={[
                  ["MRP", `₹${selected.mrp.toFixed(2)}`],
                  ["Selling Price", `₹${selected.price.toFixed(2)}`],
                  ["GST", `${selected.gst}%`],
                ]}
              />
              <Grid
                title="Inventory"
                rows={[
                  ["Current Stock", selected.stock.toString()],
                  ["Reorder Level", selected.reorderLevel.toString()],
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Medicine Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.6)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded shadow-2xl w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F2F5]">
              <div>
                <p className="font-bold text-[16px] text-[#0F1624]">
                  {editingMedicine?.id ? "Edit Medicine" : "Add New Medicine"}
                </p>
                <p className="text-[12px] text-[#64748B]">
                  Configure item specifications, taxation, and initial batch details for billing & tax invoices.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded hover:bg-[#F0F2F5] text-[#94A3B8]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Section 1: Item Identification */}
              <div>
                <p className="text-[11px] font-bold text-[#0F766E] uppercase tracking-wider mb-2">
                  1. Medicine & Clinical Info
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      Medicine Brand Name / Item Description *
                    </label>
                    <input
                      placeholder="Enter medicine brand name"
                      value={editingMedicine?.name || ""}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px] font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      Generic Name
                    </label>
                    <input
                      placeholder="Enter generic composition"
                      value={editingMedicine?.generic || ""}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          generic: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      Strength
                    </label>
                    <input
                      placeholder="e.g. 500mg or 10mg"
                      value={editingMedicine?.strength || ""}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          strength: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      Dosage Form
                    </label>
                    <select
                      value={editingMedicine?.form || "TABLETS"}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          form: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px] bg-white"
                    >
                      <option value="BOX KIT">BOX KIT / PACK</option>
                      <option value="SOLUTION">SOLUTION / LIQUID</option>
                      <option value="SYRUP">SYRUP / SUSPENSION</option>
                      <option value="TABLETS">TABLETS</option>
                      <option value="CAPSULES">CAPSULES</option>
                      <option value="INJECTION">INJECTION</option>
                      <option value="OINTMENT">OINTMENT / GEL</option>
                      <option value="DROPS">DROPS / BOTTLE</option>
                      <option value="POWDER">POWDER / SACHET</option>
                      <option value="RESPULES">RESPULES</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      Reorder Threshold (Min Stock)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 10"
                      value={editingMedicine?.reorderLevel || ""}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          reorderLevel: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Taxation & Manufacturer Info */}
              <div className="pt-2 border-t border-[#F0F2F5]">
                <p className="text-[11px] font-bold text-[#0F766E] uppercase tracking-wider mb-2">
                  2. Manufacturer, Tax & Schedule (Printed on Bill)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      Manufacturer
                    </label>
                    <input
                      placeholder="Enter manufacturer name"
                      value={editingMedicine?.manufacturer || ""}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          manufacturer: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      Mnf Short (3-letter)
                    </label>
                    <input
                      placeholder="e.g. ABC"
                      maxLength={4}
                      value={editingMedicine?.mnfCode || ""}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          mnfCode: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px] uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      HSN Code
                    </label>
                    <input
                      placeholder="Enter HSN code"
                      value={editingMedicine?.hsnCode || ""}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          hsnCode: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      Schedule Type
                    </label>
                    <select
                      value={editingMedicine?.schedule || "H"}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          schedule: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px] bg-white"
                    >
                      <option value="H">Schedule H</option>
                      <option value="H1">Schedule H1</option>
                      <option value="G">Schedule G</option>
                      <option value="X">Schedule X (Narcotic)</option>
                      <option value="OTC">OTC (Non-Rx)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      GST Rate %
                    </label>
                    <select
                      value={editingMedicine?.gst ?? 5}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          gst: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px] bg-white font-medium"
                    >
                      <option value={5}>5% (2.5% CGST + 2.5% SGST)</option>
                      <option value={12}>12% (6% CGST + 6% SGST)</option>
                      <option value={18}>18% (9% CGST + 9% SGST)</option>
                      <option value={0}>0% (Tax Exempt)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      Bin / Rack No
                    </label>
                    <input
                      placeholder="Enter rack or shelf"
                      value={editingMedicine?.binNo || ""}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          binNo: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Batch & Initial Stock */}
              <div className="pt-2 border-t border-[#F0F2F5]">
                <p className="text-[11px] font-bold text-[#0F766E] uppercase tracking-wider mb-2">
                  3. Batch, Rates & Stock (Matches Supplier / Purchase Invoice)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      M.R.P (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 750.05"
                      value={editingMedicine?.mrp !== undefined ? editingMedicine.mrp : ""}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          mrp: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px] font-bold text-[#0F766E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      Purchase Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 571.47"
                      value={editingMedicine?.purchasePrice !== undefined ? editingMedicine.purchasePrice : ""}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          purchasePrice: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px] font-semibold text-[#334155]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      Dis %
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 3.00"
                      value={editingMedicine?.purchaseDiscount !== undefined ? editingMedicine.purchaseDiscount : ""}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          purchaseDiscount: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      Qty (Stock)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 10"
                      value={editingMedicine?.stock !== undefined ? editingMedicine.stock : ""}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          stock: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px] font-semibold"
                      disabled={!!editingMedicine?.id}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      Batch Number
                    </label>
                    <input
                      placeholder="e.g. A25007MA"
                      value={editingMedicine?.batchNumber || ""}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          batchNumber: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px] font-mono uppercase"
                      disabled={!!editingMedicine?.id}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={editingMedicine?.expiryDate || ""}
                      onChange={(e) =>
                        setEditingMedicine({
                          ...editingMedicine,
                          expiryDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-[13px]"
                      disabled={!!editingMedicine?.id}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-[#F0F2F5]">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 rounded text-white font-semibold text-[13px] shadow-sm hover:opacity-95 transition-opacity"
                  style={{ background: "#0F766E" }}
                >
                  Save & Put in Active Inventory
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 rounded border border-[#E2E8F0] text-[13px] font-medium text-[#334155] hover:bg-[#F5F7FA] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Medicines Modal */}
      <ImportMedicinesModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => refresh()}
        existingMedicines={medicines}
      />
    </div>
  )
}

function Grid({ title, rows }: { title: string ;rows: [string, string][] }) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wide mb-2">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="p-3 rounded bg-[#F5F7FA]">
            <p className="text-[11px] text-[#94A3B8]">{label}</p>
            <p className="text-[13px] font-semibold text-[#0F1624] mt-0.5">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
