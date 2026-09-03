import React, { useState, useEffect } from "react";
import { FiArrowLeft, FiRefreshCw, FiUser, FiChevronDown } from "react-icons/fi";
import { apiFetch, reportError } from "../lib/api";
import type { Notice } from "../types";
import {
  VisitDetailPanel,
  type ErVisitDetail,
  type TriageCategory,
  type ErVisit,
} from "../pages/ErPage";
import PrescriptionUploadModal from "./PrescriptionUploadModal";

export default function Triage({
  initialVisitId,
  setNotice,
  onNavigate,
}: {
  initialVisitId?: number | null;
  setNotice?: (notice: Notice | null) => void;
  onNavigate?: (module: string) => void;
}) {
  const [visits, setVisits] = useState<ErVisit[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(initialVisitId || null);
  const [detail, setDetail] = useState<ErVisitDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [categories, setCategories] = useState<TriageCategory[]>([]);
  const [prescriptionTarget, setPrescriptionTarget] = useState<{
    id: string;
    name: string;
    doctorName?: string;
  } | null>(null);

  const loadVisitsAndConfig = async () => {
    try {
      const [visitsRes, catsRes] = await Promise.all([
        apiFetch<{ visits: ErVisit[] }>("/api/er/visits?active_only=true"),
        apiFetch<{ categories: TriageCategory[] }>("/api/er/triage-config"),
      ]);
      const list = visitsRes.visits || [];
      setVisits(list);
      setCategories(catsRes.categories || []);

      if (initialVisitId && list.some((v) => v.id === initialVisitId)) {
        setSelectedVisitId(initialVisitId);
      } else if (!selectedVisitId && list.length > 0) {
        setSelectedVisitId(list[0].id);
      }
    } catch (error: any) {
      if (setNotice) reportError(setNotice, error, "Failed to load ER triage visits.");
    }
  };

  const loadDetail = async (visitId: number) => {
    setDetailLoading(true);
    try {
      const data = await apiFetch<ErVisitDetail>(`/api/er/visits/${visitId}`);
      setDetail(data);
    } catch (error: any) {
      if (setNotice) reportError(setNotice, error, "Failed to load patient triage details.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadVisitsAndConfig();
  }, [initialVisitId]);

  useEffect(() => {
    if (selectedVisitId) {
      loadDetail(selectedVisitId);
    }
  }, [selectedVisitId]);

  const refreshAfterAction = async () => {
    await loadVisitsAndConfig();
    if (selectedVisitId) {
      await loadDetail(selectedVisitId);
    }
  };

  const getPatientDisplayName = (v: ErVisit) => {
    if (v.is_unknown_patient) return v.unknown_patient_label || "Unidentified Patient";
    return [v.patient_name, v.patient_last_name].filter(Boolean).join(" ") || v.patient_id || v.visit_no;
  };

  if (!selectedVisitId && visits.length === 0 && !detailLoading) {
    return (
      <div className="flex-1 bg-[#F0F2F5] p-5 sm:p-6 min-h-full">
        <div className="bg-white border border-[#DDE2EC] rounded p-12 text-center text-[#64748B] shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded bg-blue-50 text-[#1B4FD8] flex items-center justify-center text-2xl mx-auto">
            🛡️
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">No Active ER Patients</h2>
            <p className="text-[12.5px] text-[#64748B] mt-1">
              There are currently no active patients in the emergency triage queue.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.("emergency")}
            className="px-4 py-2 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white font-semibold rounded text-[12px] transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <FiArrowLeft /> Return to ED Track Board
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#F0F2F5] p-5 sm:p-6 min-h-full space-y-3">
      {/* Top Triage Switcher & Return Bar */}
      <div className="bg-white border border-[#DDE2EC] rounded p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate?.("emergency")}
            className="px-3.5 py-1.5 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-gray-700 font-semibold rounded text-[12px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <FiArrowLeft className="text-gray-500" />
            <span>Return to ED Track Board</span>
          </button>

          {/* Quick Patient Switcher */}
          {visits.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-bold text-[#64748B] uppercase hidden sm:inline">
                Switch Patient:
              </span>
              <div className="relative">
                <select
                  value={selectedVisitId || ""}
                  onChange={(e) => setSelectedVisitId(Number(e.target.value))}
                  className="bg-[#F8FAFC] border border-[#CBD5E1] hover:border-[#1B4FD8] rounded px-3 py-1.5 text-[12px] font-semibold text-gray-900 focus:outline-none focus:border-[#1B4FD8] cursor-pointer shadow-2xs pr-7"
                >
                  {visits.map((v) => (
                    <option key={v.id} value={v.id}>
                      {getPatientDisplayName(v)} ({v.visit_no} • {v.triage_category || "B1"})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#16A34A] bg-green-50 border border-green-200 px-2.5 py-1 rounded">
            ● Active Triage View
          </span>
          <button
            type="button"
            onClick={refreshAfterAction}
            className="p-1.5 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-gray-700 rounded transition-colors cursor-pointer shadow-2xs"
            title="Refresh patient chart"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${detailLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Patient Clinical Chart / Visit Detail Panel */}
      {detail ? (
        <VisitDetailPanel
          detail={detail}
          loading={detailLoading}
          categories={categories}
          setNotice={setNotice || (() => {})}
          onNavigate={onNavigate}
          onBack={() => onNavigate?.("emergency")}
          onRefresh={refreshAfterAction}
          onOrderMedication={() =>
            setPrescriptionTarget({
              id: detail.patient_id || "",
              name: detail.patient_id
                ? detail.patient_id
                : detail.unknown_patient_label || detail.visit_no,
              doctorName: detail.assigned_doctor_name || undefined,
            })
          }
        />
      ) : (
        <div className="bg-white border border-[#DDE2EC] rounded p-12 text-center text-[#64748B]">
          <p className="text-[13px]">Loading patient chart...</p>
        </div>
      )}

      {/* Prescription Upload Modal */}
      {prescriptionTarget && (
        <PrescriptionUploadModal
          patientId={prescriptionTarget.id}
          patientName={prescriptionTarget.name}
          doctorName={prescriptionTarget.doctorName}
          mode="manual"
          setNotice={setNotice || (() => {})}
          onClose={() => setPrescriptionTarget(null)}
        />
      )}
    </div>
  );
}
