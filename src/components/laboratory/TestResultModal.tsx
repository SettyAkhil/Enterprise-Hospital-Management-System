import React, { useState, useEffect } from "react"
import {
  LabTestDefinition,
  findTestDefinition,
  evaluateFlag,
} from "./labCatalogueSchema"
import { LabOrder, LabOrderTest, LabParameterResult } from "../../services/labOrdersDb"
import { AuditDatabase } from "../../services/auditDb"

interface TestResultModalProps {
  order: LabOrder
  test: LabOrderTest
  onClose: () => void
  onSave: (
    testId: string,
    status: "Result Entered" | "Completed" | "Verified",
    results: Record<string, LabParameterResult>,
    clinicalComments?: string,
    technician?: string,
    verifier?: string,
    tableData?: any[]
  ) => void
}

export default function TestResultModal({
  order,
  test,
  onClose,
  onSave,
}: TestResultModalProps) {
  const testDef: LabTestDefinition | undefined = findTestDefinition(test.name)
  
  // State for parameters
  const [paramResults, setParamResults] = useState<Record<string, LabParameterResult>>({})
  const [clinicalComments, setClinicalComments] = useState<string>("")
  const [technician, setTechnician] = useState<string>("Ananya Sen, MLT")
  const [verifier, setVerifier] = useState<string>("Dr. Rajesh Gupta, MD (Path)")
  
  // Table state for Culture & Sensitivity tests
  const [cultureRows, setCultureRows] = useState<Array<{
    antibiotic: string
    zone: string
    mic: string
    susceptibility: "Sensitive" | "Intermediate" | "Resistant"
  }>>([
    { antibiotic: "Amoxicillin / Clavulanate", zone: "24 mm", mic: "<= 2 µg/mL", susceptibility: "Sensitive" },
    { antibiotic: "Ciprofloxacin", zone: "28 mm", mic: "<= 0.5 µg/mL", susceptibility: "Sensitive" },
    { antibiotic: "Ceftriaxone", zone: "26 mm", mic: "<= 1 µg/mL", susceptibility: "Sensitive" },
    { antibiotic: "Amikacin", zone: "22 mm", mic: "<= 4 µg/mL", susceptibility: "Sensitive" },
    { antibiotic: "Cotrimoxazole", zone: "18 mm", mic: "<= 2/38 µg/mL", susceptibility: "Intermediate" },
    { antibiotic: "Nitrofurantoin", zone: "20 mm", mic: "<= 16 µg/mL", susceptibility: "Sensitive" },
  ])

  // Initialize values from existing test results or catalogue schema
  useEffect(() => {
    const initial: Record<string, LabParameterResult> = {}
    
    if (testDef && testDef.parameters.length > 0) {
      testDef.parameters.forEach((param) => {
        const existing = test.results?.[param.name]
        const val = existing ? existing.value : (param.defaultValue || "")
        const flag = existing
          ? existing.flag
          : param.inputType === "numeric"
          ? evaluateFlag(val, param.referenceRange)
          : ""

        initial[param.name] = {
          value: val,
          unit: param.unit || "",
          referenceRange: param.referenceRange?.text || "",
          flag: flag as LabParameterResult["flag"],
        }
      })
    } else if (test.results && Object.keys(test.results).length > 0) {
      Object.assign(initial, test.results)
    } else {
      // Fallback single parameter
      initial[test.name] = {
        value: test.result || "Normal",
        unit: test.resultUnit || "",
        referenceRange: test.referenceRange || "Normal",
        flag: test.flag || "",
      }
    }

    setParamResults(initial)
    setClinicalComments(
      test.clinicalComments ||
      "Test performed on calibrated automated diagnostic analyzer. Results verified against biological reference intervals."
    )
    if (test.technician) setTechnician(test.technician)
    if (test.verifier) setVerifier(test.verifier)
    if (test.tableData && test.tableData.length > 0) {
      setCultureRows(test.tableData)
    }
  }, [test, testDef])

  const handleValueChange = (
    paramName: string,
    newValue: string,
    refRange?: LabTestDefinition["parameters"][0]["referenceRange"],
    inputType?: string
  ) => {
    let flag: LabParameterResult["flag"] = ""
    if (inputType === "numeric") {
      flag = evaluateFlag(newValue, refRange)
    }

    setParamResults((prev) => ({
      ...prev,
      [paramName]: {
        ...prev[paramName],
        value: newValue,
        flag,
      },
    }))
  }

  const handleSave = (markVerified: boolean) => {
    const status = markVerified ? "Completed" : "Result Entered"
    onSave(
      test.id,
      status,
      paramResults,
      clinicalComments,
      technician,
      markVerified ? verifier : undefined,
      testDef?.subModule.includes("Culture") ? cultureRows : undefined
    )

    AuditDatabase.logEvent(
      markVerified ? "Lab Result Verified" : "Lab Result Saved",
      "Laboratory",
      `${technician} ${markVerified ? "verified and signed out" : "entered results for"} ${test.name} for patient ${order.patientName} (${order.umr}) - Lab Order ${order.id}.`,
      "Success"
    )
  }

  const isCultureTest = testDef?.subModule?.includes("Culture") || test.name.includes("C/S")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Modal Header */}
        <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/40 uppercase tracking-wider">
                {testDef?.category || test.category}
              </span>
              <span className="text-xs text-blue-200">
                {testDef?.subModule ? `• ${testDef.subModule}` : ""}
              </span>
              {test.urgency === "STAT" && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-500 text-white animate-pulse">
                  STAT PRIORITY
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold mt-1 text-white tracking-tight">
              {testDef?.name || test.name}
            </h2>
            <div className="flex items-center gap-4 text-xs text-blue-100 mt-1">
              <span>Patient: <strong className="text-white">{order.patientName}</strong> ({order.age}y/{order.sex})</span>
              <span>Patient ID: <strong className="text-white">{order.umr}</strong></span>
              <span>Visit: <strong className="text-white">{order.opNumber || order.encounterId}</strong></span>
              <span>Order: <strong className="text-white">{order.id}</strong></span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Specimen & Doctor Bar */}
        <div className="bg-slate-50 border-b border-gray-200 px-6 py-2.5 flex flex-wrap items-center justify-between text-xs text-gray-600 gap-2">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-gray-400">Specimen:</span>{" "}
              <strong className="text-gray-800">{testDef?.sampleType || "Blood / Body Fluid"}</strong>
            </div>
            <div>
              <span className="text-gray-400">Ordering Doctor:</span>{" "}
              <strong className="text-gray-800">{order.doctorName}</strong> ({order.department})
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400">Billing Status:</span>
            <span
              className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                order.billing.status === "Paid"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-amber-100 text-amber-800 border border-amber-300"
              }`}
            >
              ● {order.billing.status}
            </span>
          </div>
        </div>

        {/* Modal Body - Parameter Form Fields */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                Investigation Parameters & Results
              </h3>
              <span className="text-xs text-gray-500">
                Reference standards from Hospital Diagnostic Laboratory Catalogue
              </span>
            </div>

            {testDef && testDef.parameters.length > 0 ? (
              <div className="space-y-3">
                {testDef.parameters.map((param) => {
                  const current = paramResults[param.name] || {
                    value: param.defaultValue || "",
                    unit: param.unit || "",
                    referenceRange: param.referenceRange?.text || "",
                    flag: "",
                  }

                  return (
                    <div
                      key={param.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-2.5 rounded-lg bg-gray-50/70 hover:bg-blue-50/40 border border-gray-200 transition-colors"
                    >
                      {/* Parameter Name */}
                      <div className="md:col-span-4">
                        <label className="text-xs font-semibold text-gray-900 block">
                          {param.name}
                        </label>
                        {param.referenceRange?.text && (
                          <span className="text-[11px] text-gray-500">
                            Ref: {param.referenceRange.text}
                          </span>
                        )}
                      </div>

                      {/* Input Field Based on Type */}
                      <div className="md:col-span-5">
                        {param.inputType === "numeric" && (
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              value={current.value}
                              onChange={(e) =>
                                handleValueChange(
                                  param.name,
                                  e.target.value,
                                  param.referenceRange,
                                  "numeric"
                                )
                              }
                              placeholder="Enter value"
                              className="w-full text-xs font-semibold px-3 py-1.5 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                            {param.unit && (
                              <span className="absolute right-3 top-1.5 text-xs text-gray-400 font-medium">
                                {param.unit}
                              </span>
                            )}
                          </div>
                        )}

                        {param.inputType === "select" && (
                          <select
                            value={current.value}
                            onChange={(e) =>
                              handleValueChange(param.name, e.target.value)
                            }
                            className="w-full text-xs font-medium px-3 py-1.5 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Select option</option>
                            {param.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}

                        {(param.inputType === "positive_negative" ||
                          param.inputType === "reactive_nonreactive" ||
                          param.inputType === "detected_not_detected" ||
                          param.inputType === "present_absent") && (
                          <div className="flex items-center gap-2">
                            {(param.options || [
                              param.inputType === "positive_negative" ? "Negative" :
                              param.inputType === "reactive_nonreactive" ? "Non-reactive" :
                              param.inputType === "detected_not_detected" ? "Not Detected" : "Absent",
                              param.inputType === "positive_negative" ? "Positive" :
                              param.inputType === "reactive_nonreactive" ? "Reactive" :
                              param.inputType === "detected_not_detected" ? "Detected" : "Present"
                            ]).map((opt) => {
                              const isChecked = current.value === opt
                              const isAbnormal =
                                opt === "Positive" ||
                                opt === "Reactive" ||
                                opt === "Detected" ||
                                opt === "Present"
                              return (
                                <button
                                  type="button"
                                  key={opt}
                                  onClick={() => handleValueChange(param.name, opt)}
                                  className={`px-3 py-1 text-xs font-semibold rounded-md border transition-all ${
                                    isChecked
                                      ? isAbnormal
                                        ? "bg-red-600 text-white border-red-600 shadow-xs"
                                        : "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                  }`}
                                >
                                  {opt}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {(param.inputType === "text" ||
                          param.inputType === "grade" ||
                          param.inputType === "time" ||
                          param.inputType === "table") && (
                          <input
                            type="text"
                            value={current.value}
                            onChange={(e) =>
                              handleValueChange(param.name, e.target.value)
                            }
                            placeholder={param.placeholder || "Enter description / observation"}
                            className="w-full text-xs px-3 py-1.5 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        )}
                      </div>

                      {/* Flag and Reference Range Indicator */}
                      <div className="md:col-span-3 flex items-center justify-between md:justify-end gap-2">
                        {current.flag === "H" && (
                          <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded">
                            ▲ High
                          </span>
                        )}
                        {current.flag === "L" && (
                          <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 rounded">
                            ▼ Low
                          </span>
                        )}
                        {current.flag === "Critical" && (
                          <span className="px-2 py-0.5 text-[11px] font-bold bg-red-600 text-white rounded animate-pulse">
                            CRITICAL
                          </span>
                        )}
                        {!current.flag && current.value && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded">
                            ✓ Normal
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              // Generic fallback if not explicitly found in catalogue
              <div className="p-4 bg-gray-50 border rounded-lg space-y-3">
                <label className="text-xs font-semibold text-gray-700 block">
                  Observed Result Value
                </label>
                <input
                  type="text"
                  value={paramResults[test.name]?.value || ""}
                  onChange={(e) =>
                    setParamResults({
                      [test.name]: {
                        value: e.target.value,
                        unit: test.resultUnit || "",
                        referenceRange: test.referenceRange || "Normal",
                        flag: "",
                      },
                    })
                  }
                  className="w-full text-sm px-3 py-2 rounded border border-gray-300 bg-white"
                  placeholder="Enter test result"
                />
              </div>
            )}
          </div>

          {/* Microbiology Culture & Sensitivity Table if Applicable */}
          {isCultureTest && (
            <div className="border border-indigo-200 rounded-lg p-3 bg-indigo-50/40">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-indigo-950 uppercase">
                  Antibiotic Susceptibility Testing (AST) Panel
                </h4>
                <span className="text-[11px] text-indigo-700">
                  CLSI Kirby-Bauer Disk Diffusion Method
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-indigo-100/70 text-indigo-900 text-[11px] font-bold">
                    <tr>
                      <th className="p-2">Antimicrobial Agent</th>
                      <th className="p-2">Zone Diameter</th>
                      <th className="p-2">MIC</th>
                      <th className="p-2">Susceptibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-100 bg-white">
                    {cultureRows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium text-gray-900">{row.antibiotic}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.zone}
                            onChange={(e) => {
                              const next = [...cultureRows]
                              next[idx].zone = e.target.value
                              setCultureRows(next)
                            }}
                            className="px-2 py-0.5 border rounded w-20 text-xs bg-gray-50"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.mic}
                            onChange={(e) => {
                              const next = [...cultureRows]
                              next[idx].mic = e.target.value
                              setCultureRows(next)
                            }}
                            className="px-2 py-0.5 border rounded w-24 text-xs bg-gray-50"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={row.susceptibility}
                            onChange={(e) => {
                              const next = [...cultureRows]
                              next[idx].susceptibility = e.target.value as any
                              setCultureRows(next)
                            }}
                            className={`px-2 py-0.5 rounded text-xs font-bold border ${
                              row.susceptibility === "Sensitive"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : row.susceptibility === "Intermediate"
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-red-100 text-red-800 border-red-300"
                            }`}
                          >
                            <option value="Sensitive">Sensitive (S)</option>
                            <option value="Intermediate">Intermediate (I)</option>
                            <option value="Resistant">Resistant (R)</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Clinical Comments & Remarks */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Pathologist / Clinical Comments
            </label>
            <textarea
              rows={2}
              value={clinicalComments}
              onChange={(e) => setClinicalComments(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="Enter remarks, morphological observations, or clinical notes..."
            />
          </div>

          {/* Technologist & Verifier Sign-off details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Medical Lab Technologist (MLT)
              </label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded border border-gray-300 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Verifying Pathologist / Doctor
              </label>
              <input
                type="text"
                value={verifier}
                onChange={(e) => setVerifier(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded border border-gray-300 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-100 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-xs"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Save Draft (Result Entered)
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span>✓</span> Verify & Sign Out (Complete)
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
