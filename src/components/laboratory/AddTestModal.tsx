import React, { useState, useMemo } from "react"
import { ALL_LAB_TESTS, LabTestDefinition } from "./labCatalogueSchema"
import { LabOrder } from "../../services/labOrdersDb"

interface AddTestModalProps {
  order: LabOrder
  onClose: () => void
  onAddTest: (testData: {
    name: string
    category?: string
    urgency?: "Routine" | "Urgent" | "STAT"
    price?: number
    clinicalNotes?: string
  }) => void
}

export default function AddTestModal({
  order,
  onClose,
  onAddTest,
}: AddTestModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedModule, setSelectedModule] = useState("all")
  const [selectedTest, setSelectedTest] = useState<LabTestDefinition | null>(null)
  const [customTestName, setCustomTestName] = useState("")
  const [urgency, setUrgency] = useState<"Routine" | "Urgent" | "STAT">("Routine")
  const [price, setPrice] = useState<number>(350)
  const [clinicalNotes, setClinicalNotes] = useState("")
  const [isCustom, setIsCustom] = useState(false)

  // Names of tests already ordered for this patient
  const existingTestNames = useMemo(() => {
    return new Set(order.tests.map((t) => t.name.toLowerCase().trim()))
  }, [order.tests])

  // Filtered catalogue tests
  const filteredTests = useMemo(() => {
    return ALL_LAB_TESTS.filter((test) => {
      // Module filter
      if (
        selectedModule !== "all" &&
        test.category.toLowerCase() !== selectedModule.toLowerCase()
      ) {
        return false
      }

      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const matchName = test.name.toLowerCase().includes(q)
        const matchCode = test.code.toLowerCase().includes(q)
        const matchSub = test.subModule?.toLowerCase().includes(q)
        if (!matchName && !matchCode && !matchSub) return false
      }

      return true
    })
  }, [searchTerm, selectedModule])

  const handleSelectCatalogueTest = (test: LabTestDefinition) => {
    setSelectedTest(test)
    setIsCustom(false)
    setPrice(test.price || 350)
  }

  const handleSwitchToCustom = () => {
    setIsCustom(true)
    setSelectedTest(null)
    setPrice(350)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const testName = isCustom ? customTestName.trim() : selectedTest?.name
    if (!testName) return

    onAddTest({
      name: testName,
      category: isCustom ? "PATHOLOGY" : selectedTest?.category,
      urgency,
      price: Number(price) || 0,
      clinicalNotes: clinicalNotes.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="bg-linear-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/40 uppercase tracking-wider">
                Laboratory Desk
              </span>
              <span className="text-xs text-indigo-100">
                • Add Investigation Manually
              </span>
            </div>
            <h2 className="text-xl font-bold mt-1 text-white tracking-tight">
              Add Test to Patient Order
            </h2>
            <div className="flex items-center gap-4 text-xs text-indigo-100 mt-1">
              <span>
                Patient: <strong className="text-white">{order.patientName}</strong> ({order.umr})
              </span>
              <span>
                Order ID: <strong className="text-white font-mono">{order.id}</strong>
              </span>
              <span>
                Current Tests: <strong className="text-white">{order.tests.length}</strong>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            
            {/* Toggle Between Catalogue & Custom */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustom(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    !isCustom
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  📖 Select from Hospital Catalogue
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToCustom}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isCustom
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  ✏️ Custom / Ad-Hoc Test
                </button>
              </div>
              <span className="text-xs text-gray-500">
                {ALL_LAB_TESTS.length} Standard Catalogue Tests Available
              </span>
            </div>

            {!isCustom ? (
              /* Catalogue Search & Selector */
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8 relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search test name or code (e.g. Troponin, CBC, LFT, Lipid, HbA1c, Urine)..."
                      className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                      autoFocus
                    />
                    <span className="absolute left-2.5 top-2 text-gray-400 text-xs">🔍</span>
                  </div>
                  <div className="sm:col-span-4">
                    <select
                      value={selectedModule}
                      onChange={(e) => setSelectedModule(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="all">All Modules</option>
                      <option value="hematology">Hematology</option>
                      <option value="pathology">Pathology</option>
                      <option value="microbiology">Microbiology</option>
                      <option value="biochemistry">Biochemistry</option>
                      <option value="immunology / serology">Immunology / Serology</option>
                      <option value="thyroid function">Thyroid Function</option>
                      <option value="other special tests">Other Special Tests</option>
                    </select>
                  </div>
                </div>

                {/* Catalogue Tests List */}
                <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100 bg-gray-50/50">
                  {filteredTests.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400">
                      No matching investigations found. Use the Custom Test tab above to enter an unlisted test.
                    </div>
                  ) : (
                    filteredTests.map((test) => {
                      const isSelected = selectedTest?.id === test.id
                      const alreadyInOrder = existingTestNames.has(test.name.toLowerCase().trim())

                      return (
                        <div
                          key={test.id}
                          onClick={() => !alreadyInOrder && handleSelectCatalogueTest(test)}
                          className={`p-2.5 px-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            alreadyInOrder
                              ? "opacity-50 cursor-not-allowed bg-gray-100"
                              : isSelected
                              ? "bg-indigo-50 border-l-4 border-indigo-600 font-semibold"
                              : "hover:bg-blue-50/60"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                              {test.code}
                            </span>
                            <div>
                              <strong className="text-gray-900 block text-xs">{test.name}</strong>
                              <span className="text-[11px] text-gray-500">
                                {test.category} {test.subModule ? `• ${test.subModule}` : ""} · {test.parameters.length} param(s)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-gray-800">
                              ₹{test.price}
                            </span>
                            {alreadyInOrder ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                                Already Ordered
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSelectCatalogueTest(test)
                                }}
                                className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                                  isSelected
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "bg-white border border-gray-300 text-gray-700 hover:bg-indigo-50"
                                }`}
                              >
                                {isSelected ? "✓ Selected" : "Select"}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Custom Test Form */
              <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-3">
                <label className="text-xs font-bold text-gray-800 block">
                  Investigation / Test Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customTestName}
                  onChange={(e) => setCustomTestName(e.target.value)}
                  placeholder="Enter full name of investigation (e.g. Serum Calcitonin, D-Dimer STAT, etc.)"
                  className="w-full text-xs font-semibold px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            )}

            {/* Selected Test Configuration Strip */}
            {(selectedTest || isCustom) && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <span className="text-[10.5px] uppercase font-bold text-indigo-700 tracking-wider">
                      Selected Investigation
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 mt-0.5">
                      {isCustom ? (customTestName || "Custom Test") : selectedTest?.name}
                    </h4>
                  </div>
                  {selectedTest?.sampleType && (
                    <span className="text-xs text-gray-500">
                      Sample: <strong className="text-gray-700">{selectedTest.sampleType}</strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Urgency */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Urgency Level
                    </label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value as "Routine" | "Urgent" | "STAT")}
                      className="w-full text-xs font-semibold px-3 py-1.5 border rounded-lg bg-white"
                    >
                      <option value="Routine">Routine</option>
                      <option value="Urgent">Urgent</option>
                      <option value="STAT">STAT Priority</option>
                    </select>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Rate Card Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full text-xs font-mono font-bold px-3 py-1.5 border rounded-lg bg-white"
                    />
                  </div>

                  {/* Added By / Role */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Billing Mode
                    </label>
                    <div className="text-xs text-gray-600 bg-white border px-3 py-1.5 rounded-lg font-medium">
                      Auto-added to {order.billing.status} bill
                    </div>
                  </div>
                </div>

                {/* Clinical Notes / Remark */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Technician Remark / Indication (Optional)
                  </label>
                  <input
                    type="text"
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="e.g. Clinical follow-up investigation ordered at specimen bench"
                    className="w-full text-xs px-3 py-1.5 border rounded-lg bg-white"
                  />
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="bg-gray-100 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={(!selectedTest && !customTestName.trim())}
              className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>➕</span> Add Test to Order
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
