import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../icons";
import { Btn, StatusBadge } from "../shared";
import { db, DBOPEncounter } from "../../services/db";
import {
  compressImageFile,
  ConsultationRecord,
  DoctorAccount,
  DoctorNotification,
  DoctorPortalDatabase,
  formatBytes,
  ParsedLabTest,
  ParsedMedication,
} from "../../services/doctorPortalDb";
import { dispatchConsultation, DispatchResult } from "../../services/consultationDispatch";
import { LabOrderDatabase, priceForTest } from "../../services/labOrdersDb";
import { splitPrescriptionFile, splitPrescriptionText, localSplit, PrescriptionSplit } from "../../lib/prescriptionAI";
import { normalizeMedicalSpeech, diarizeDoctorAndPatient, detectLanguage, generateAudioClinicalSummary, DiarizedSpeech, AudioClinicalSummary } from "../../lib/medicalVoiceAI";
import { formatElapsed, useLiveClinic } from "../../hooks/useLiveClinic";
import { buildDoctorLiveBoard, LONG_WAIT_MINUTES } from "../../services/doctorLiveFeed";

/**
 * The per-doctor portal.
 *
 * One doctor signs in and sees only their own patients. For each one they get the
 * context they need before speaking (admit card for a first visit, prior
 * consultations and medication for a revisit), then write ONE prescription sheet
 * -- typed, drawn on the whiteboard, or photographed -- which the AI splits into
 * medicines (-> pharmacy) and investigations (-> reception billing -> laboratory).
 *
 * The split is always reviewed and editable before dispatch: it is a first pass
 * over a doctor's handwriting, not an authority on what the patient receives.
 */

import PrescriptionWhiteboard from "./PrescriptionWhiteboard";
import LiveBoard from "./LiveBoard";

type PortalTab = "patient" | "sheet" | "review";
type SheetMode = "type" | "write" | "upload";

const TABS: { key: PortalTab; stepNum: string; label: string; hint: string }[] = [
  { key: "patient", stepNum: "1", label: "Patient History & Vitals", hint: "Admit card, patient vitals & past medical history" },
  { key: "sheet", stepNum: "2", label: "Consultation & Voice Sheet", hint: "Voice speech recording, handwriting & prescription text" },
  { key: "review", stepNum: "3", label: "Review & Send Orders", hint: "Verify medicines & lab test orders before sending" },
];

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, payload] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(meta)?.[1] || "image/png";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

const EMPTY_MEDICATION: ParsedMedication = {
  name: "",
  strength: "",
  dosage: "",
  frequency: "",
  route: "Oral",
  duration: "",
  instructions: "",
  quantity: 1,
};

export default function DoctorPortal({ doctor }: { doctor: DoctorAccount }) {
  // One clock and one data revision for the whole portal: `revision` covers
  // changes made here, on another screen, or in another tab (reception billing,
  // the pharmacy, the lab); `now` ticks every second for the waiting timers.
  const { revision, now } = useLiveClinic();
  const [view, setView] = useState<"live" | "patient">("live");
  const [tab, setTab] = useState<PortalTab>("patient");
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  // Consultation sheet
  const [sheetMode, setSheetMode] = useState<SheetMode>("type");
  const [sheetText, setSheetText] = useState("");
  const [whiteboardImage, setWhiteboardImage] = useState<string | null>(null);
  const [uploadedRx, setUploadedRx] = useState<{ name: string; size: number; type: string; dataUrl: string } | null>(null);
  const [video, setVideo] = useState<{ name: string; size: number; type: string; objectUrl: string } | null>(null);

  // AI split, then the doctor's edits on top of it
  const [split, setSplit] = useState<PrescriptionSplit | null>(null);
  const [medications, setMedications] = useState<ParsedMedication[]>([]);
  const [labTests, setLabTests] = useState<ParsedLabTest[]>([]);
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [splitting, setSplitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dispatchResult, setDispatchResult] = useState<DispatchResult | null>(null);
  const [autoStartDictation, setAutoStartDictation] = useState(false);

  const rxInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const videoUrlRef = useRef<string | null>(null);

  // Object URLs are session-scoped; revoke the previous one so replacing a video
  // repeatedly doesn't leak the old blobs for the life of the tab.
  useEffect(() => {
    return () => {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    };
  }, []);

  const notifications = useMemo(
    () => DoctorPortalDatabase.getNotifications(doctor.id, showClosed),
    [doctor.id, showClosed, revision]
  );
  const unreadCount = useMemo(
    () => DoctorPortalDatabase.getNotifications(doctor.id).filter(n => !n.read).length,
    [doctor.id, revision]
  );

  const selected: DoctorNotification | undefined = useMemo(
    () => notifications.find(n => n.encounterId === selectedEncounterId),
    [notifications, selectedEncounterId]
  );

  const context = useMemo(
    () => (selected ? DoctorPortalDatabase.getPatientContext(selected.umr, selected.encounterId) : null),
    [selected, revision]
  );

  const consultation: ConsultationRecord | undefined = useMemo(
    () => (selected ? DoctorPortalDatabase.getConsultationForEncounter(selected.encounterId) : undefined),
    [selected, revision]
  );

  const patientLabOrders = useMemo(
    () => (selected ? LabOrderDatabase.getOrdersForPatient(selected.umr) : []),
    [selected, revision]
  );

  // Recomputed on data changes and at most twice a minute, not on every clock
  // tick -- the header only needs the count, and the board recomputes its own.
  const attentionCount = useMemo(
    () => buildDoctorLiveBoard(doctor, now).actionable.length,
    [doctor, revision, Math.floor(now / 30000)]
  );

  const resetSheet = useCallback(() => {
    setSheetMode("type");
    setSheetText("");
    setWhiteboardImage(null);
    setUploadedRx(null);
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    videoUrlRef.current = null;
    setVideo(null);
    setSplit(null);
    setMedications([]);
    setLabTests([]);
    setDiagnosis("");
    setAdvice("");
    setError(null);
    setDispatchResult(null);
  }, []);

  const openPatient = (notification: DoctorNotification, landOn: PortalTab = "patient") => {
    setSelectedEncounterId(notification.encounterId);
    DoctorPortalDatabase.markRead([notification.id]);
    resetSheet();
    setView("patient");
    setTab(landOn);

    const encounter = db.getEncounterById(notification.encounterId);
    if (!encounter) return;
    const record = DoctorPortalDatabase.openConsultation(encounter, doctor);

    // Reopening a visit restores whatever was drafted for it, so a doctor who
    // navigates away mid-consultation doesn't lose the sheet.
    setSheetText(record.rawText);
    setWhiteboardImage(record.whiteboardImage || null);
    setUploadedRx(
      record.uploadedPrescription?.dataUrl
        ? {
            name: record.uploadedPrescription.name,
            size: record.uploadedPrescription.size,
            type: record.uploadedPrescription.type,
            dataUrl: record.uploadedPrescription.dataUrl,
          }
        : null
    );
    setDiagnosis(record.diagnosis);
    setAdvice(record.advice);
    setMedications(record.medications);
    setLabTests(record.labTests);
    if (record.medications.length || record.labTests.length) {
      setSplit({
        diagnosis: record.diagnosis,
        advice: record.advice,
        summary: record.summary,
        medications: record.medications,
        labTests: record.labTests,
        unclassified: record.unclassified,
        engine: record.aiEngine,
        ocrText: record.rawText,
      });
    }
    if (record.whiteboardImage) setSheetMode("write");
    else if (record.uploadedPrescription) setSheetMode("upload");
  };

  /** Opens a patient straight from the live board, which only knows the visit id. */
  const openEncounter = (encounterId: string, landOn: PortalTab = "patient") => {
    const notification =
      DoctorPortalDatabase.getNotifications(doctor.id, true).find(n => n.encounterId === encounterId);
    if (!notification) return;
    if (!showClosed && !notifications.some(n => n.encounterId === encounterId)) {
      // The visit is already finished; reveal it rather than silently doing nothing.
      setShowClosed(true);
    }
    openPatient(notification, landOn);
  };

  const startConsultation = () => {
    if (!selected) return;
    db.updateEncounter(selected.encounterId, {
      status: "Under Consultation",
      timestamps: {
        ...(db.getEncounterById(selected.encounterId)?.timestamps || { arrival: new Date().toISOString() }),
        consultationStart: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    });
    setTab("sheet");
  };

  // ── Attachments ───────────────────────────────────────────────────────────

  const handleVideoSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    videoUrlRef.current = objectUrl;
    setVideo({ name: file.name, size: file.size, type: file.type, objectUrl });

    if (consultation) {
      // Only the metadata is persisted. A consultation video is tens of
      // megabytes; inlining it as base64 would blow the whole storage quota and
      // take the rest of the chart down with it, so the file stays a blob URL
      // for this session and the record notes what was attached.
      DoctorPortalDatabase.updateConsultation(consultation.id, {
        video: { name: file.name, type: file.type, size: file.size, recordedAt: new Date().toISOString() },
      });
    }
    event.target.value = "";
  };

  const handleRxUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    setError(null);
    try {
      const dataUrl = await compressImageFile(file);
      const attachment = { name: file.name, size: file.size, type: file.type, dataUrl };
      setUploadedRx(attachment);
      setSheetMode("upload");
      if (consultation) {
        DoctorPortalDatabase.updateConsultation(consultation.id, {
          uploadedPrescription: { ...attachment, recordedAt: new Date().toISOString() },
        });
      }
    } catch (err) {
      // Image attached safely in local record
    }
  };

  const handleWhiteboardCommit = useCallback(
    (dataUrl: string | null) => {
      setWhiteboardImage(dataUrl);
      if (consultation) {
        DoctorPortalDatabase.updateConsultation(consultation.id, { whiteboardImage: dataUrl || undefined });
      }
    },
    [consultation]
  );

  // ── AI split ──────────────────────────────────────────────────────────────

  const runSplit = async () => {
    if (!selected || !consultation) return;
    setError(null);
    setSplitting(true);
    try {
      let result: PrescriptionSplit;
      if (sheetMode === "upload" && uploadedRx) {
        result = await splitPrescriptionFile(dataUrlToBlob(uploadedRx.dataUrl), uploadedRx.name);
      } else if (sheetMode === "write" && whiteboardImage) {
        result = await splitPrescriptionFile(dataUrlToBlob(whiteboardImage), "whiteboard-prescription.png");
      } else if (sheetText.trim()) {
        result = await splitPrescriptionText(sheetText);
      } else {
        setError("Write, type or upload the prescription sheet before running the split.");
        return;
      }

      setSplit(result);
      setMedications(result.medications);
      setLabTests(result.labTests);
      if (result.diagnosis) setDiagnosis(result.diagnosis);
      if (result.advice) setAdvice(result.advice);
      if (result.ocrText && !sheetText.trim()) setSheetText(result.ocrText);

      DoctorPortalDatabase.updateConsultation(consultation.id, {
        rawText: result.ocrText || sheetText,
        aiEngine: result.engine,
        summary: result.summary,
        diagnosis: result.diagnosis || diagnosis,
        advice: result.advice || advice,
        medications: result.medications,
        labTests: result.labTests,
        unclassified: result.unclassified,
      });

      if (result.degradedReason) setError(result.degradedReason);
      setTab("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The prescription could not be digitised.");
    } finally {
      setSplitting(false);
    }
  };

  const handleSingleClickDispatch = () => {
    if (!consultation || !selected) return;

    const currentSplit = localSplit(sheetText);
    const cleanedMeds = (currentSplit.medications.length > 0 ? currentSplit.medications : medications).filter(m => m.name.trim());
    const cleanedLabs = (currentSplit.labTests.length > 0 ? currentSplit.labTests : labTests).filter(t => t.name.trim());
    const finalDiagnosis = currentSplit.diagnosis || diagnosis || "General OPD Consultation";
    const finalAdvice = currentSplit.advice || advice || "Routine care & review as needed.";

    setDiagnosis(finalDiagnosis);
    setAdvice(finalAdvice);
    setMedications(cleanedMeds);
    setLabTests(cleanedLabs);
    setSplit(currentSplit);

    const saved = DoctorPortalDatabase.saveConsultation({
      ...consultation,
      rawText: sheetText,
      diagnosis: finalDiagnosis,
      advice: finalAdvice,
      medications: cleanedMeds,
      labTests: cleanedLabs,
      summary: currentSplit.summary || "Dispatched via single-click voice consultation",
      aiEngine: currentSplit.engine || "voice_ai",
      whiteboardImage: whiteboardImage || undefined,
      uploadedPrescription: uploadedRx
        ? { ...uploadedRx, recordedAt: new Date().toISOString() }
        : consultation.uploadedPrescription,
    });

    const result = dispatchConsultation(saved, doctor);
    setDispatchResult(result);
    setTab("review");
    if (result.errors.length) setError(result.errors.join(" "));
  };

  const canDispatch =
    !!consultation &&
    consultation.dispatch !== "Dispatched" &&
    (medications.some(m => m.name.trim()) ||
      labTests.some(t => t.name.trim()) ||
      !!sheetText.trim() ||
      !!whiteboardImage ||
      !!uploadedRx);

  const handleDispatch = () => {
    if (!consultation || !selected) return;
    const cleanedMedications = medications.filter(m => m.name.trim());
    const cleanedLabTests = labTests.filter(t => t.name.trim());

    const saved = DoctorPortalDatabase.saveConsultation({
      ...consultation,
      rawText: sheetText,
      diagnosis,
      advice,
      medications: cleanedMedications,
      labTests: cleanedLabTests,
      summary: split?.summary || "",
      aiEngine: split?.engine || "manual",
      whiteboardImage: whiteboardImage || undefined,
      uploadedPrescription: uploadedRx
        ? { ...uploadedRx, recordedAt: new Date().toISOString() }
        : consultation.uploadedPrescription,
    });

    const result = dispatchConsultation(saved, doctor);
    setDispatchResult(result);
    if (result.errors.length) setError(result.errors.join(" "));
  };

  // ── Rendering ─────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden">
      <PortalHeader
        doctor={doctor}
        unreadCount={unreadCount}
        patientCount={notifications.length}
        attentionCount={attentionCount}
        now={now}
        view={view}
        onView={next => {
          setView(next);
          if (next === "patient" && !selected && notifications.length) openPatient(notifications[0]);
        }}
      />

      <div className="flex-1 flex min-h-0">
        <PatientInbox
          notifications={notifications}
          selectedEncounterId={view === "patient" ? selectedEncounterId : null}
          showClosed={showClosed}
          onToggleClosed={() => setShowClosed(v => !v)}
          onSelect={openPatient}
          onMarkAllRead={() => DoctorPortalDatabase.markAllRead(doctor.id)}
          now={now}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {view === "live" ? (
            <LiveBoard
              doctor={doctor}
              now={now}
              revision={revision}
              onOpenPatient={encounterId => openEncounter(encounterId)}
              onGoToSheet={encounterId => openEncounter(encounterId, "sheet")}
            />
          ) : !selected ? (
            <EmptyWorkspace unreadCount={unreadCount} onBackToBoard={() => setView("live")} />
          ) : (
            <>
              <PatientBanner
                notification={selected}
                consultation={consultation}
                onStartConsultation={startConsultation}
              />

              {/* Stepper Navigation Bar */}
              <div className="bg-[#F8FAFC] border-b border-[#CBD5E1] px-5 py-2 flex items-center justify-between gap-2 overflow-x-auto">
                <div className="flex items-center gap-1 sm:gap-2 min-w-max">
                  {TABS.map((t, index) => {
                    const isActive = tab === t.key;
                    const isPast =
                      (t.key === "patient" && (tab === "sheet" || tab === "review")) ||
                      (t.key === "sheet" && tab === "review");

                    return (
                      <React.Fragment key={t.key}>
                        {index > 0 && <span className="text-slate-300 font-bold text-[13px] px-0.5">→</span>}
                        <button
                          type="button"
                          onClick={() => setTab(t.key)}
                          title={t.hint}
                          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-none transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#1B4FD8] text-white shadow-2xs font-bold"
                              : isPast
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold hover:bg-emerald-100"
                                : "bg-white text-slate-600 border border-slate-200 font-medium hover:bg-slate-100"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] font-mono font-bold ${
                              isActive
                                ? "bg-white text-[#1B4FD8]"
                                : isPast
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {isPast ? "✓" : t.stepNum}
                          </span>
                          <span className="text-[12px]">{t.label}</span>
                          {t.key === "review" && (medications.length > 0 || labTests.length > 0) && (
                            <span
                              className={`ml-0.5 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-none ${
                                isActive ? "bg-white text-[#1B4FD8]" : "bg-blue-100 text-[#1B4FD8]"
                              }`}
                            >
                              {medications.length + labTests.length}
                            </span>
                          )}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-500 font-mono hidden md:block">
                  Step {tab === "patient" ? "1 of 3" : tab === "sheet" ? "2 of 3" : "3 of 3"}
                </div>
              </div>

              {error && (
                <div className="mx-5 mt-4 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-[12.5px] px-3.5 py-2.5 rounded flex items-start gap-2">
                  <span className="font-bold">⚠</span>
                  <span className="flex-1">{error}</span>
                  <button type="button" onClick={() => setError(null)} className="font-bold text-[#B45309]">
                    ✕
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-5">
                {tab === "patient" && context && (
                  <PatientContextPanel
                    notification={selected}
                    context={context}
                    labOrders={patientLabOrders}
                    onProceed={startConsultation}
                  />
                )}

                {tab === "sheet" && (
                  <ConsultationSheet
                    // Re-keyed per visit so panel state (the optional video
                    // disclosure) starts fresh for each patient.
                    key={selected.encounterId}
                    notification={selected}
                    doctor={doctor}
                    sheetMode={sheetMode}
                    onSheetMode={setSheetMode}
                    sheetText={sheetText}
                    onSheetText={value => {
                      setSheetText(value);
                      if (consultation) DoctorPortalDatabase.updateConsultation(consultation.id, { rawText: value });
                    }}
                    whiteboardImage={whiteboardImage}
                    onWhiteboardCommit={handleWhiteboardCommit}
                    uploadedRx={uploadedRx}
                    onRemoveUploadedRx={() => {
                      setUploadedRx(null);
                      if (consultation) DoctorPortalDatabase.updateConsultation(consultation.id, { uploadedPrescription: undefined });
                    }}
                    video={video}
                    persistedVideo={consultation?.video}
                    rxInputRef={rxInputRef}
                    videoInputRef={videoInputRef}
                    onRxUpload={handleRxUpload}
                    onVideoSelected={handleVideoSelected}
                    onRemoveVideo={() => {
                      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
                      videoUrlRef.current = null;
                      setVideo(null);
                      if (consultation) DoctorPortalDatabase.updateConsultation(consultation.id, { video: undefined });
                    }}
                    splitting={splitting}
                    onRunSplit={runSplit}
                    autoStartDictation={autoStartDictation}
                    onSingleClickDispatch={handleSingleClickDispatch}
                    medications={medications}
                    labTests={labTests}
                    onBackToPatient={() => setTab("patient")}
                    onProceedToReview={() => {
                      runSplit();
                      setTab("review");
                    }}
                    onStartFresh={() => {
                      resetSheet();
                      if (consultation) {
                        DoctorPortalDatabase.updateConsultation(consultation.id, {
                          rawText: "",
                          whiteboardImage: undefined,
                          uploadedPrescription: undefined,
                          diagnosis: "",
                          advice: "",
                          medications: [],
                          labTests: [],
                          unclassified: [],
                        });
                      }
                    }}
                  />
                )}

                {tab === "review" && (
                  <ReviewAndDispatch
                    split={split}
                    splitting={splitting}
                    diagnosis={diagnosis}
                    advice={advice}
                    onDiagnosis={setDiagnosis}
                    onAdvice={setAdvice}
                    medications={medications}
                    labTests={labTests}
                    onMedications={setMedications}
                    onLabTests={setLabTests}
                    consultation={consultation}
                    canDispatch={canDispatch}
                    dispatchResult={dispatchResult}
                    onDispatch={handleDispatch}
                    onBackToSheet={() => setTab("sheet")}
                    onNextPatient={() => {
                      const nextWaiting = notifications.find(
                        n => n.encounterId !== selected.encounterId && n.status !== "Consultation Completed" && n.status !== "Under Consultation"
                      );
                      if (nextWaiting) {
                        openPatient(nextWaiting);
                      } else {
                        setView("live");
                      }
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

function PortalHeader({
  doctor,
  unreadCount,
  patientCount,
  attentionCount,
  now,
  view,
  onView,
}: {
  doctor: DoctorAccount;
  unreadCount: number;
  patientCount: number;
  attentionCount: number;
  now: number;
  view: "live" | "patient";
  onView: (view: "live" | "patient") => void;
}) {
  return (
    <div className="bg-white border-b border-[#DDE2EC] px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#1E3A8A] to-[#1B4FD8] text-white flex items-center justify-center text-lg font-bold">
          {doctor.name.replace("Dr. ", "").split(" ").map(part => part[0]).join("").slice(0, 2)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-900">{doctor.name}</h1>
            <span className="text-[10px] font-mono font-bold bg-blue-100 text-[#1B4FD8] px-2 py-0.5 rounded border border-blue-200 uppercase">
              My Portal
            </span>
          </div>
          <p className="text-[12px] text-[#64748B]">
            {doctor.qualification} · {doctor.specialty} · {doctor.room} · Staff ID {doctor.staffId}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-[#F1F5F9] border border-[#DDE2EC] rounded-lg p-0.5">
          {([
            { key: "live" as const, label: "Live Board", badge: attentionCount },
            { key: "patient" as const, label: "Patient", badge: 0 },
          ]).map(option => (
            <button
              key={option.key}
              type="button"
              onClick={() => onView(option.key)}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                view === option.key ? "bg-white text-[#1B4FD8] shadow-sm" : "text-[#64748B] hover:text-[#334155]"
              }`}
            >
              {option.key === "live" && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
              )}
              {option.label}
              {option.badge > 0 && (
                <span className="text-[9.5px] font-bold bg-[#FEE2E2] text-[#B91C1C] px-1.5 py-0.5 rounded">
                  {option.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#DDE2EC] px-3 py-1.5 rounded-lg">
          <Icon.Bell className="w-4 h-4 text-[#64748B]" />
          <span className="text-[12px] text-[#475569]">
            <span className="font-bold text-[#0F172A]">{unreadCount}</span> new
          </span>
          <span className="w-px h-4 bg-[#DDE2EC]" />
          <span className="text-[12px] text-[#475569]">
            <span className="font-bold text-[#0F172A]">{patientCount}</span> in my queue
          </span>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-[12px] font-semibold text-[#334155] font-mono">
            {new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-[11px] text-[#94A3B8]">
            {new Date(now).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · clinic session
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inbox ────────────────────────────────────────────────────────────────────

function PatientInbox({
  notifications,
  selectedEncounterId,
  showClosed,
  onToggleClosed,
  onSelect,
  onMarkAllRead,
  now,
}: {
  notifications: DoctorNotification[];
  selectedEncounterId: string | null;
  showClosed: boolean;
  onToggleClosed: () => void;
  onSelect: (notification: DoctorNotification) => void;
  onMarkAllRead: () => void;
  now: number;
}) {
  return (
    <aside className="w-[330px] flex-shrink-0 bg-white border-r border-[#DDE2EC] flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-[#DDE2EC]">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-bold text-gray-900">Patients appointed to me</h2>
          <button type="button" onClick={onMarkAllRead} className="text-[11px] text-[#1B4FD8] font-semibold hover:underline">
            Mark all read
          </button>
        </div>
        <label className="flex items-center gap-1.5 mt-2 text-[11.5px] text-[#64748B] cursor-pointer">
          <input type="checkbox" checked={showClosed} onChange={onToggleClosed} className="w-3.5 h-3.5 accent-[#1B4FD8]" />
          Include visits I have finished
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-2xl mb-2">🔔</div>
            <p className="text-[12.5px] font-semibold text-[#334155]">No patients waiting</p>
            <p className="text-[11.5px] text-[#94A3B8] mt-1">
              New appointments assigned to you appear here the moment reception books them.
            </p>
          </div>
        ) : (
          notifications.map(notification => {
            const active = notification.encounterId === selectedEncounterId;
            const waitingMinutes = Math.max(
              0,
              Math.floor((now - new Date(notification.arrivedAt).getTime()) / 60000)
            );
            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => onSelect(notification)}
                className={`w-full text-left px-4 py-3 border-b border-[#F1F5F9] transition-colors ${
                  active ? "bg-[#EFF6FF] border-l-[3px] border-l-[#1B4FD8]" : "hover:bg-[#F8FAFC] border-l-[3px] border-l-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {!notification.read && <span className="w-1.5 h-1.5 rounded-full bg-[#1B4FD8] flex-shrink-0" />}
                      <span className="font-semibold text-[13px] text-gray-900 truncate">{notification.patientName}</span>
                    </div>
                    <div className="text-[11px] font-mono text-[#64748B] mt-0.5">
                      {notification.umr} · {notification.opNumber} · {notification.age}
                      {notification.sex?.[0]}
                    </div>
                  </div>
                  <span
                    className={`text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0 ${
                      notification.isNewPatient
                        ? "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]"
                        : "bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]"
                    }`}
                  >
                    {notification.isNewPatient ? "New" : "Revisit"}
                  </span>
                </div>

                <p className="text-[11.5px] text-[#475569] mt-1.5 line-clamp-2">
                  {notification.chiefComplaint || "No chief complaint recorded"}
                </p>

                {notification.symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {notification.symptoms.slice(0, 3).map(symptom => (
                      <span key={symptom} className="text-[10px] bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.5 rounded border border-[#FDE68A]">
                        {symptom}
                      </span>
                    ))}
                    {notification.symptoms.length > 3 && (
                      <span className="text-[10px] text-[#94A3B8]">+{notification.symptoms.length - 3} more</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 text-[10.5px]">
                  <span className="font-mono text-[#94A3B8]">Token {notification.token || "--"}</span>
                  <span
                    className={`font-mono font-semibold ${
                      notification.status === "Under Consultation"
                        ? "text-[#1B4FD8]"
                        : waitingMinutes >= LONG_WAIT_MINUTES
                          ? "text-[#B91C1C]"
                          : "text-[#94A3B8]"
                    }`}
                  >
                    {notification.status === "Under Consultation" ? "in room " : "waiting "}
                    {formatElapsed(notification.arrivedAt, now)}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

function EmptyWorkspace({ unreadCount, onBackToBoard }: { unreadCount: number; onBackToBoard: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-10">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-3">🩺</div>
        <h2 className="text-[15px] font-bold text-gray-900">Select a patient to begin</h2>
        <p className="text-[12.5px] text-[#64748B] mt-2">
          {unreadCount > 0
            ? `${unreadCount} new appointment${unreadCount === 1 ? "" : "s"} waiting on the left. Opening one shows their symptoms, plus an admit card if they are new or their full history if they have been here before.`
            : "Appointments booked to you appear in the list on the left, with the patient's symptoms attached."}
        </p>
        <div className="mt-4">
          <Btn variant="outline" size="sm" onClick={onBackToBoard}>
            ← Back to the live board
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Patient banner ───────────────────────────────────────────────────────────

function PatientBanner({
  notification,
  consultation,
  onStartConsultation,
}: {
  notification: DoctorNotification;
  consultation?: ConsultationRecord;
  onStartConsultation: () => void;
}) {
  const dispatched = consultation?.dispatch === "Dispatched";
  return (
    <div className="bg-white border-b border-[#DDE2EC] px-5 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-[#EFF6FF] text-[#1B4FD8] flex items-center justify-center font-bold text-[13px] flex-shrink-0">
          {notification.patientName.split(" ").map(p => p[0]).join("").slice(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[14px] font-bold text-gray-900 truncate">{notification.patientName}</h2>
            <span
              className={`text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded ${
                notification.isNewPatient ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F1F5F9] text-[#475569]"
              }`}
            >
              {notification.isNewPatient ? "New patient" : "Existing patient"}
            </span>
            <StatusBadge status={notification.status} />
          </div>
          <div className="text-[11.5px] text-[#64748B] font-mono flex items-center gap-2 flex-wrap">
            <span>{notification.umr} · {notification.opNumber} · {notification.age} yrs {notification.sex} · {notification.dept} · {notification.room}</span>
            {notification.vitals && (
              <span className="inline-flex items-center gap-1.5 text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                <span className="font-bold text-slate-900">BP:</span> {notification.vitals.bp || "--"} ·
                <span className="font-bold text-slate-900">Pulse:</span> {notification.vitals.pulse || "--"} ·
                <span className="font-bold text-slate-900">SpO₂:</span> {notification.vitals.spo2 || "--"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {dispatched ? (
          <span className="text-[11.5px] font-semibold text-[#15803D] bg-[#DCFCE7] border border-[#BBF7D0] px-3 py-1.5 rounded">
            ✓ Consultation dispatched
          </span>
        ) : notification.status === "Under Consultation" ? (
          <span className="text-[11.5px] font-semibold text-[#1B4FD8] bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-1.5 rounded">
            In consultation
          </span>
        ) : (
          <Btn variant="primary" size="sm" onClick={onStartConsultation}>
            Start Consultation
          </Btn>
        )}
      </div>
    </div>
  );
}

// ── Tab 1: patient context ───────────────────────────────────────────────────

function PatientContextPanel({
  notification,
  context,
  labOrders,
  onProceed,
  hideProceedButton = false,
}: {
  notification: DoctorNotification;
  context: NonNullable<ReturnType<typeof DoctorPortalDatabase.getPatientContext>>;
  labOrders: ReturnType<typeof LabOrderDatabase.getOrdersForPatient>;
  onProceed: () => void;
  hideProceedButton?: boolean;
}) {
  const { patient, previousVisits, consultations, isNewPatient } = context;

  return (
    <div className="space-y-4 max-w-5xl">
      <section className="bg-white border border-[#DDE2EC] rounded">
        <div className="px-4 py-2.5 border-b border-[#DDE2EC] flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-gray-900">
            {isNewPatient ? "New Patient Admit Card" : "Patient Record"}
          </h3>
          <span className="text-[11px] text-[#94A3B8]">
            {isNewPatient ? "First visit on record" : `${previousVisits.length} previous visit(s)`}
          </span>
        </div>

        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-4">
          {[
            { label: "Name", value: notification.patientName },
            { label: "UMR (permanent)", value: notification.umr },
            { label: "OP Number", value: notification.opNumber },
            { label: "Queue token", value: notification.token || "--" },
            { label: "Age / Sex", value: `${notification.age} yrs · ${notification.sex}` },
            { label: "Blood group", value: patient?.bloodGroup || "Not recorded" },
            { label: "Phone", value: notification.phone || "Not recorded" },
            { label: "Department", value: notification.dept },
            { label: "Address", value: patient?.address || "Not recorded" },
            { label: "Registered on", value: patient ? new Date(patient.createdAt).toLocaleDateString() : "--" },
          ].map(field => (
            <div key={field.label}>
              <div className="text-[10.5px] uppercase tracking-wide text-[#94A3B8] font-bold">{field.label}</div>
              <div className="text-[12.5px] text-gray-900 font-medium break-words">{field.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-[#DDE2EC] rounded">
        <div className="px-4 py-2.5 border-b border-[#DDE2EC]">
          <h3 className="text-[13px] font-bold text-gray-900">Presenting complaint &amp; symptoms</h3>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[13px] text-gray-800">{notification.chiefComplaint || "No chief complaint recorded at registration."}</p>
          {notification.symptoms.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {notification.symptoms.map(symptom => (
                <span key={symptom} className="text-[11.5px] bg-[#FEF3C7] text-[#92400E] px-2 py-1 rounded border border-[#FDE68A]">
                  {symptom}
                </span>
              ))}
            </div>
          )}
          {notification.aiReasoning && (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3">
              <div className="text-[10.5px] uppercase tracking-wide text-[#94A3B8] font-bold mb-1">
                Triage reasoning · {notification.aiConfidence}% confidence
              </div>
              <p className="text-[12px] text-[#475569]">{notification.aiReasoning}</p>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "BP", value: notification.vitals?.bp },
              { label: "Pulse", value: notification.vitals?.pulse },
              { label: "Temp", value: notification.vitals?.temp },
              { label: "SpO₂", value: notification.vitals?.spo2 },
              { label: "Weight", value: notification.vitals?.weight },
            ].map(vital => (
              <div key={vital.label} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-[#94A3B8] font-bold">{vital.label}</div>
                <div className="text-[13px] font-mono font-semibold text-gray-900">{vital.value || "--"}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isNewPatient ? (
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded p-4">
          <h3 className="text-[13px] font-bold text-[#15803D]">First visit — no prior history</h3>
          <p className="text-[12.5px] text-[#166534] mt-1">
            This patient has no earlier encounter on record, so there is no previous consultation, medication or
            investigation to review. The admit card above is everything on file.
          </p>
        </div>
      ) : (
        <>
          <section className="bg-white border border-[#DDE2EC] rounded">
            <div className="px-4 py-2.5 border-b border-[#DDE2EC]">
              <h3 className="text-[13px] font-bold text-gray-900">Previous consultations</h3>
            </div>
            {previousVisits.length === 0 ? (
              // Registered as a returning patient, but nothing earlier is on this
              // system -- say so rather than showing an empty box.
              <p className="px-4 py-4 text-[12px] text-[#64748B]">
                Reception registered this patient as a revisit, but no earlier encounter exists on this system.
                Ask the patient for records from their previous visit.
              </p>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {previousVisits.map(visit => (
                  <PreviousVisitRow key={visit.id} visit={visit} />
                ))}
              </div>
            )}
          </section>

          {consultations.length > 0 && (
            <section className="bg-white border border-[#DDE2EC] rounded">
              <div className="px-4 py-2.5 border-b border-[#DDE2EC]">
                <h3 className="text-[13px] font-bold text-gray-900">Prescription sheets on file</h3>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {consultations.map(record => (
                  <div key={record.id} className="border border-[#E2E8F0] rounded overflow-hidden">
                    {(record.whiteboardImage || record.uploadedPrescription?.dataUrl) && (
                      <img
                        src={record.whiteboardImage || record.uploadedPrescription?.dataUrl}
                        alt={`Prescription sheet from ${new Date(record.createdAt).toLocaleDateString()}`}
                        className="w-full h-32 object-cover object-top bg-white"
                      />
                    )}
                    <div className="px-3 py-2">
                      <div className="text-[11.5px] font-semibold text-gray-900">{new Date(record.createdAt).toLocaleDateString()}</div>
                      <div className="text-[11px] text-[#64748B]">
                        {record.doctorName} · {record.medications.length} medicine(s) · {record.labTests.length} test(s)
                      </div>
                      {record.video && (
                        <div className="text-[10.5px] text-[#94A3B8] mt-0.5">🎥 {record.video.name}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {labOrders.length > 0 && (
        <section className="bg-white border border-[#DDE2EC] rounded">
          <div className="px-4 py-2.5 border-b border-[#DDE2EC]">
            <h3 className="text-[13px] font-bold text-gray-900">Laboratory orders &amp; results</h3>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {labOrders.map(order => (
              <div key={order.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-[12px] font-semibold text-gray-900 font-mono">{order.id}</div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.status} />
                    <span
                      className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded ${
                        order.billing.status === "Paid"
                          ? "bg-[#DCFCE7] text-[#15803D]"
                          : "bg-[#FEF3C7] text-[#92400E]"
                      }`}
                    >
                      {order.billing.status === "Paid" ? "Billed" : "Awaiting payment"}
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 space-y-1">
                  {order.tests.map(test => (
                    <div key={test.id} className="flex items-center justify-between text-[11.5px]">
                      <span className="text-[#475569]">{test.name}</span>
                      <span className={`font-mono ${test.flag === "Critical" ? "text-[#B91C1C] font-bold" : "text-gray-800"}`}>
                        {test.result ? `${test.result} ${test.resultUnit || ""}` : test.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!hideProceedButton && (
        <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
          <div className="text-[11.5px] text-[#64748B]">
            Review patient history and vitals before opening the consultation sheet.
          </div>
          <Btn variant="primary" size="sm" onClick={onProceed}>
            Proceed to Step 2: Consultation & Voice Sheet →
          </Btn>
        </div>
      )}
    </div>
  );
}

function PreviousVisitRow({ visit }: { visit: DBOPEncounter }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-4 py-3">
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full flex items-start justify-between gap-3 text-left">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12.5px] font-semibold text-gray-900">{visit.diagnosis || "No diagnosis recorded"}</span>
            {visit.icd10 && <span className="text-[10.5px] font-mono bg-[#F1F5F9] text-[#475569] px-1.5 py-0.5 rounded">{visit.icd10}</span>}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">
            {new Date(visit.timestamps?.arrival || visit.registrationTime).toLocaleDateString()} · {visit.opNumber} ·{" "}
            {visit.assignedDoctor || "Unassigned"} · {visit.dept}
          </div>
        </div>
        <span className="text-[11px] text-[#1B4FD8] font-semibold flex-shrink-0">{open ? "Hide" : "View"}</span>
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3">
            <div className="text-[10.5px] uppercase tracking-wide text-[#94A3B8] font-bold mb-1.5">Medication then</div>
            {visit.prescription?.length ? (
              <ul className="space-y-1">
                {visit.prescription.map((med, index) => (
                  <li key={index} className="text-[11.5px] text-[#334155]">
                    <span className="font-semibold">{med.medicine}</span>
                    <span className="text-[#64748B]">
                      {[med.dosage, med.frequency, med.duration].filter(Boolean).join(" · ")}
                      {med.instructions ? ` — ${med.instructions}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11.5px] text-[#94A3B8]">None recorded</p>
            )}
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3">
            <div className="text-[10.5px] uppercase tracking-wide text-[#94A3B8] font-bold mb-1.5">Investigations then</div>
            {visit.investigations?.length ? (
              <ul className="space-y-1">
                {visit.investigations.map(test => (
                  <li key={test} className="text-[11.5px] text-[#334155]">{test}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[11.5px] text-[#94A3B8]">None recorded</p>
            )}
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3">
            <div className="text-[10.5px] uppercase tracking-wide text-[#94A3B8] font-bold mb-1.5">Assessment &amp; advice</div>
            <p className="text-[11.5px] text-[#334155]">{visit.assessment || "No assessment recorded"}</p>
            {visit.advice && <p className="text-[11.5px] text-[#64748B] mt-1.5">{visit.advice}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: consultation sheet ────────────────────────────────────────────────

const CLINICAL_ORDER_SETS = [
  {
    id: "uri",
    title: "Acute URI / Bronchitis",
    icon: "🫁",
    text: "Diagnosis: Acute Upper Respiratory Tract Infection\n\nRx:\nAzithromycin 500mg OD 3 days after food\nParacetamol 650mg TDS 5 days\nCetirizine 10mg HS 5 days\n\nInvestigations:\nComplete Blood Count (CBC)\nChest X-Ray PA View\n\nAdvice: Steam inhalation twice daily, warm saline gargles.",
  },
  {
    id: "diabetes",
    title: "T2 Diabetes Review",
    icon: "🩸",
    text: "Diagnosis: Type 2 Diabetes Mellitus - Routine Review\n\nRx:\nMetformin 500mg BD after meals\nTeneligliptin 20mg OD before breakfast\n\nInvestigations:\nHbA1c\nFasting Blood Sugar (FBS)\nPostprandial Blood Sugar (PPBS)\nLipid Profile\nSerum Creatinine\n\nAdvice: 30 min daily walk, low glycemic diet, daily BP log.",
  },
  {
    id: "htn",
    title: "Essential Hypertension",
    icon: "🫀",
    text: "Diagnosis: Primary Essential Hypertension\n\nRx:\nTelmisartan 40mg OD morning\nAmlodipine 5mg OD\n\nInvestigations:\nECG 12-Lead\nSerum Electrolytes\nKidney Function Test (KFT)\n\nAdvice: Low salt diet (<3g/day), monitor BP twice weekly.",
  },
  {
    id: "gastro",
    title: "Acute Gastroenteritis",
    icon: "🧪",
    text: "Diagnosis: Acute Gastroenteritis with Mild Dehydration\n\nRx:\nORS Sachet 1 packet in 1L drinking water\nOfloxacin + Ornidazole BD 3 days\nDicyclomine 20mg SOS for abdominal pain\nOndansetron 4mg SOS for nausea\n\nInvestigations:\nStool Routine & Microscopy\nSerum Electrolytes\n\nAdvice: Soft diet (rice/curd/toast), maintain oral hydration.",
  },
];

const QUICK_MED_CHIPS = [
  "Paracetamol 650mg TDS 5 days",
  "Amoxicillin 500mg TDS 5 days",
  "Azithromycin 500mg OD 3 days",
  "Pantoprazole 40mg OD before food",
  "Cetirizine 10mg HS 5 days",
  "Metformin 500mg BD after food",
  "Ondansetron 4mg SOS",
  "Ibuprofen 400mg BD after food",
];

const QUICK_LAB_CHIPS = [
  "Complete Blood Count (CBC)",
  "Liver Function Test (LFT)",
  "Kidney Function Test (KFT)",
  "HbA1c (Glycated Hemoglobin)",
  "Chest X-Ray PA View",
  "ECG 12-Lead",
  "Lipid Profile",
  "Urine Routine & Microscopy",
];

function ConsultationSheet({
  notification,
  doctor,
  sheetMode,
  onSheetMode,
  sheetText,
  onSheetText,
  whiteboardImage,
  onWhiteboardCommit,
  uploadedRx,
  onRemoveUploadedRx,
  video,
  persistedVideo,
  rxInputRef,
  videoInputRef,
  onRxUpload,
  onVideoSelected,
  onRemoveVideo,
  splitting,
  onRunSplit,
  autoStartDictation,
  onSingleClickDispatch,
  onStartFresh,
  medications = [],
  labTests = [],
  onBackToPatient,
  onProceedToReview,
}: {
  notification: DoctorNotification;
  doctor: DoctorAccount;
  sheetMode: SheetMode;
  onSheetMode: (mode: SheetMode) => void;
  sheetText: string;
  onSheetText: (value: string) => void;
  whiteboardImage: string | null;
  onWhiteboardCommit: (dataUrl: string | null) => void;
  uploadedRx: { name: string; size: number; type: string; dataUrl: string } | null;
  onRemoveUploadedRx: () => void;
  video: { name: string; size: number; type: string; objectUrl: string } | null;
  persistedVideo?: ConsultationRecord["video"];
  rxInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  onRxUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVideoSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveVideo: () => void;
  splitting: boolean;
  onRunSplit: () => void;
  autoStartDictation?: boolean;
  onSingleClickDispatch?: () => void;
  onStartFresh?: () => void;
  medications?: ParsedMedication[];
  labTests?: ParsedLabTest[];
  onBackToPatient?: () => void;
  onProceedToReview?: () => void;
}) {
  const [isListening, setIsListening] = useState(false);
  const [speakerMode, setSpeakerMode] = useState<"auto" | "doctor" | "patient">("auto");
  const [voiceLang, setVoiceLang] = useState<"auto" | "te-IN" | "en-IN" | "hi-IN">("auto");
  const [liveSplit, setLiveSplit] = useState<PrescriptionSplit | null>(null);
  const [diarized, setDiarized] = useState<DiarizedSpeech | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const langDetect = useMemo(() => detectLanguage(sheetText), [sheetText]);
  const audioSummary = useMemo(() => {
    if (!sheetText.trim()) return null;
    return generateAudioClinicalSummary(sheetText, recordingSeconds);
  }, [sheetText, recordingSeconds]);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const hasVideo = !!video || !!persistedVideo;
  const [videoOpen, setVideoOpen] = useState(hasVideo);

  // Real-time AI recognition & Speaker Diarization as voice/text streams in
  useEffect(() => {
    if (!sheetText.trim()) {
      setLiveSplit(null);
      setDiarized(null);
      return;
    }
    const timer = setTimeout(() => {
      const result = diarizeDoctorAndPatient(sheetText);
      setDiarized(result);
      setLiveSplit(result.split);
    }, 150);
    return () => clearTimeout(timer);
  }, [sheetText]);


  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);

      // Start SpeechRecognition (Auto-Detect / Telugu / English / Hindi)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = voiceLang === "auto" ? "te-IN" : voiceLang;
        rec.onresult = (event: any) => {
          let rawTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              rawTranscript += event.results[i][0].transcript;
            }
          }
          if (rawTranscript.trim()) {
            const normalized = normalizeMedicalSpeech(rawTranscript);
            let tagged = normalized;
            if (speakerMode === "doctor") tagged = `Doctor: ${normalized}`;
            else if (speakerMode === "patient") tagged = `Patient: ${normalized}`;

            onSheetText(sheetText ? `${sheetText}\n${tagged}` : tagged);
          }
        };
        rec.onerror = () => {};
        rec.onend = () => {};
        rec.start();
        recognitionRef.current = rec;
      }
      onSheetMode("type");
    } catch (err) {
      alert("Microphone permission denied or Web Audio unavailable. Please type or write manually.");
    }
  };

  const stopVoiceRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);

    // Auto-detect Doctor & Patient Voice and generate Doctor Voice Summarization on stop
    if (sheetText.trim()) {
      const diarizedResult = diarizeDoctorAndPatient(sheetText);
      setDiarized(diarizedResult);
      setLiveSplit(diarizedResult.split);
    }
  };

  const toggleDictation = () => {
    if (isListening) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };


  const modes: { key: SheetMode; label: string; hint: string; icon: string }[] = [
    { key: "type", label: "Type or Voice Note", hint: "Type or speak voice notes", icon: "📝" },
    { key: "write", label: "Write by Hand", hint: "Draw or write with pen or stylus", icon: "✒️" },
    { key: "upload", label: "Upload Prescription Image", hint: "Upload paper prescription image", icon: "📄" },
  ];

  const ready =
    (sheetMode === "type" && sheetText.trim().length > 0) ||
    (sheetMode === "write" && !!whiteboardImage) ||
    (sheetMode === "upload" && !!uploadedRx);

  return (
    <div className="space-y-4 w-full max-w-7xl mx-auto">
      {/* Sleek Enterprise Top Action Header */}
      <div className="bg-white border border-[#CBD5E1] rounded-none p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-none bg-blue-50 text-[#1B4FD8] border border-blue-200 flex items-center justify-center font-bold text-base">
            👨‍⚕️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1B4FD8] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-none">
                Active Consultation
              </span>
              <span className="text-[12px] text-[#475569] font-medium">
                {notification.patientName} ({notification.age}y · {notification.sex}) · Patient ID: <span className="font-mono font-bold text-[#0F172A]">{notification.umr}</span>
              </span>
            </div>
            <h2 className="text-[14px] font-bold text-[#0F172A] mt-0.5">
              Doctor Consultation &amp; Voice Prescription
            </h2>
          </div>
        </div>

        {/* Action Controls & Speaker Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Speaker Selection Pill */}
          <div className="flex items-center bg-slate-100 p-0.5 border border-[#CBD5E1] rounded-none">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase px-2">Speaker:</span>
            {[
              { key: "auto", label: "🤖 Auto Both Speakers", title: "Auto-detects Doctor vs Patient voice" },
              { key: "doctor", label: "👨‍⚕️ Doctor Speaking", title: "Tag audio as Doctor instructions & medicines" },
              { key: "patient", label: "👤 Patient Speaking", title: "Tag audio as Patient symptoms & problems" },
            ].map(spk => (
              <button
                key={spk.key}
                type="button"
                onClick={() => setSpeakerMode(spk.key as any)}
                title={spk.title}
                className={`px-2 py-1 text-[11px] font-semibold rounded-none transition-colors cursor-pointer ${
                  speakerMode === spk.key
                    ? "bg-white text-[#1B4FD8] shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {spk.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleDictation}
            className={`px-3.5 py-1.5 rounded-none text-[12px] font-bold transition-all flex items-center gap-2 border cursor-pointer ${
              isListening
                ? "bg-red-600 text-white border-red-700 animate-pulse shadow-2xs"
                : "bg-[#1B4FD8] hover:bg-blue-700 text-white border-blue-700 shadow-2xs"
            }`}
          >
            <span>{isListening ? "🔴 Stop Recording" : "🎙️ Record Voice Consultation"}</span>
            {isListening && <span className="text-[11px] font-mono">({recordingSeconds}s)</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setRecordedAudioUrl(null);
              setDiarized(null);
              setLiveSplit(null);
              onStartFresh?.();
            }}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#334155] border border-[#CBD5E1] rounded-none text-[12px] font-semibold transition-colors cursor-pointer"
            title="Clear all consultation notes, voice recordings, and extracted items"
          >
            🔄 Clear Sheet
          </button>
        </div>
      </div>

      {/* Main 2-Column Doctor Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols): Main Workspace */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Mode Selector Bar */}
          <div className="bg-white border border-[#CBD5E1] p-2 rounded-none shadow-2xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5 flex-wrap">
              {modes.map(mode => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => onSheetMode(mode.key)}
                  className={`px-3 py-1.5 text-[12px] font-bold rounded-none transition-colors cursor-pointer ${
                    sheetMode === mode.key
                      ? "bg-[#1B4FD8] text-white shadow-2xs"
                      : "bg-white text-[#475569] hover:bg-slate-100 border border-[#E2E8F0]"
                  }`}
                >
                  <span className="mr-1.5">{mode.icon}</span>
                  <span>{mode.label}</span>
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-500 font-medium px-2">
              {isListening && (
                <span className="text-red-700 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                  Recording ({speakerMode === "doctor" ? "Doctor Speaking" : speakerMode === "patient" ? "Patient Speaking" : "Auto Both Speakers"})
                </span>
              )}
              {!isListening && sheetMode === "type" && "⌨️ Type or Speak"}
              {!isListening && sheetMode === "write" && "✏️ Handwriting Pen"}
              {!isListening && sheetMode === "upload" && "📷 Image OCR Reader"}
            </div>
          </div>

          {/* Sheet Workspace Container */}
          <div className="bg-white border border-[#CBD5E1] p-4 rounded-none shadow-2xs space-y-3">
            {sheetMode === "type" && (
              <div className="space-y-3">
                {/* Editor Header Bar */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-[12px] font-bold text-slate-800 flex items-center gap-1.5">
                    <span>📝 Consultation Notes &amp; Voice Sheet</span>
                  </span>

                  <span className="text-[11px] text-slate-500 font-mono">
                    Language: <span className="font-bold text-[#1B4FD8]">{langDetect.primaryLanguage}</span>
                  </span>
                </div>

                <textarea
                  value={sheetText}
                  onChange={event => onSheetText(event.target.value)}
                  rows={12}
                  spellCheck={false}
                  placeholder={
                    "Doctor Notes / Diagnosis: Acute fever with throat infection\n\nPatient Advice: Drink warm water, rest\n\nRx:\nAzithromycin 500mg OD 3 days after food\nParacetamol 650mg TDS 5 days\n\nLab Tests:\nComplete Blood Count (CBC)"
                  }
                  className="w-full border border-[#CBD5E1] rounded-none p-4 text-[13px] font-mono leading-relaxed focus:outline-none focus:border-[#1B4FD8] text-gray-900 bg-[#FAFAFA]"
                />
              </div>
            )}

            {sheetMode === "write" && (
              <PrescriptionWhiteboard
                header={{
                  patientName: notification.patientName,
                  umr: notification.umr,
                  opNumber: notification.opNumber,
                  age: notification.age,
                  sex: notification.sex,
                  doctorName: doctor.name,
                  date: new Date().toLocaleDateString(),
                }}
                onCommit={onWhiteboardCommit}
              />
            )}

            {sheetMode === "upload" && (
              <>
                <input ref={rxInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={onRxUpload} />
                {uploadedRx ? (
                  <div className="space-y-3">
                    <img src={uploadedRx.dataUrl} alt="Uploaded prescription" className="w-full max-h-[480px] object-contain bg-[#F8FAFC] border border-[#E2E8F0] rounded-none shadow-2xs" />
                    <div className="flex items-center justify-between text-[11.5px] bg-slate-50 p-3 rounded-none border border-slate-200">
                      <span className="text-[#475569] font-medium truncate">
                        📄 {uploadedRx.name} · {formatBytes(uploadedRx.size)}
                      </span>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => rxInputRef.current?.click()} className="text-[#1B4FD8] font-semibold hover:underline">
                          Replace File
                        </button>
                        <button type="button" onClick={onRemoveUploadedRx} className="text-[#B91C1C] font-semibold hover:underline">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => rxInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-[#CBD5E1] rounded-none p-10 text-center hover:border-[#1B4FD8] hover:bg-blue-50/50 transition-colors group cursor-pointer"
                  >
                    <div className="text-3xl mb-2">📄</div>
                    <div className="text-[13px] font-bold text-[#334155]">Upload Written Prescription Photo or Scan</div>
                    <div className="text-[11.5px] text-[#94A3B8] mt-1">
                      Supports JPG, PNG or PDF · Automatic text &amp; medicine extraction
                    </div>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Audio Recorded Session Player */}
          {recordedAudioUrl && (
            <div className="bg-white border border-[#CBD5E1] p-3 rounded-none flex items-center justify-between gap-3 shadow-2xs">
              <span className="text-[12px] font-bold text-gray-900 flex items-center gap-2">
                <span>🔊 Voice Recording Playback</span>
                <span className="text-[10px] font-mono bg-blue-50 text-[#1B4FD8] px-1.5 py-0.5 border border-blue-200">
                  {audioSummary?.detectedLanguage}
                </span>
              </span>
              <audio src={recordedAudioUrl} controls className="h-8 flex-1 max-w-sm" />
              <button type="button" onClick={() => setRecordedAudioUrl(null)} className="text-[11px] text-red-600 font-bold hover:underline cursor-pointer">
                Remove
              </button>
            </div>
          )}

          {/* Optional Video Disclosure */}
          <div className="bg-white border border-[#CBD5E1] rounded-none">
            <button
              type="button"
              onClick={() => setVideoOpen(open => !open)}
              className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-[#F8FAFC] transition-colors"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[13px] font-bold text-gray-900">🎥 Consultation Video</h3>
                <span className="text-[9.5px] font-bold uppercase tracking-wide bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] px-1.5 py-0.5 rounded-none">
                  Optional
                </span>
                {hasVideo && <span className="text-[10.5px] font-semibold text-[#15803D]">attached</span>}
              </div>
              <span className="text-[11px] text-[#64748B] font-semibold">
                {videoOpen ? "Hide" : hasVideo ? "Show" : "Attach recording"}
              </span>
            </button>

            {videoOpen && (
              <div className="px-4 pb-4 border-t border-[#F1F5F9] pt-3">
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={onVideoSelected} />
                {video ? (
                  <div className="space-y-2">
                    <video src={video.objectUrl} controls className="w-full max-h-72 bg-black rounded-none" />
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="text-[#475569] font-medium truncate">
                        {video.name} · {formatBytes(video.size)}
                      </span>
                      <button type="button" onClick={onRemoveVideo} className="text-[#B91C1C] font-semibold hover:underline">
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full border border-dashed border-[#CBD5E1] rounded-none p-4 text-center hover:border-[#1B4FD8] hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="text-[12px] font-semibold text-[#334155]">Upload consultation video recording</div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Extracted Medicines & Lab Tests Panel */}
        <div className="lg:col-span-5 flex flex-col gap-4 sticky top-4">
          <div className="bg-white border border-[#CBD5E1] rounded-none shadow-2xs p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <h3 className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide">
                  Medicines &amp; Lab Tests Found
                </h3>
              </div>
              {onSingleClickDispatch && (
                <button
                  type="button"
                  onClick={onSingleClickDispatch}
                  disabled={!ready}
                  className={`px-3 py-1 text-[11px] font-bold transition-colors rounded-none shadow-2xs cursor-pointer ${
                    ready
                      ? "bg-[#1B4FD8] hover:bg-blue-700 text-white"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  ⚡ Send to Pharmacy &amp; Lab
                </button>
              )}
            </div>

            {/* Structured Voice Summary Box */}
            {audioSummary && (
              <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 text-[11.5px] space-y-2 rounded-none">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="font-extrabold text-[#0F172A] flex items-center gap-1.5 text-[12px]">
                    <span>📋 Voice Summary</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-blue-100 text-[#1B4FD8] px-1.5 py-0.5">
                    {audioSummary.detectedLanguage}
                  </span>
                </div>

                <div className="space-y-1.5 text-[#334155] leading-normal font-sans">
                  <div>
                    <span className="font-bold text-indigo-900 uppercase text-[10px] tracking-wider block">Patient Symptoms &amp; Problem:</span>
                    <p className="text-[11px] bg-white p-1.5 border border-slate-200 text-slate-800">
                      {audioSummary.soapSubjective}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-blue-900 uppercase text-[10px] tracking-wider block">Doctor Diagnosis:</span>
                    <p className="text-[11px] bg-white p-1.5 border border-slate-200 text-slate-800 font-semibold">
                      {audioSummary.soapAssessment}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-emerald-900 uppercase text-[10px] tracking-wider block">Medicines &amp; Lab Tests Plan:</span>
                    <p className="text-[11px] bg-white p-1.5 border border-slate-200 text-slate-800">
                      {audioSummary.soapPlan}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Extracted Medicines Card */}
            <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-none">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-extrabold text-emerald-900 flex items-center gap-1.5">
                  <span>💊 Prescribed Medicines</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded-none font-mono">
                    {(liveSplit?.medications.length || medications.length)}
                  </span>
                </span>
                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                  Pharmacy
                </span>
              </div>

              {(liveSplit?.medications.length || medications.length) === 0 ? (
                <p className="text-[11px] text-emerald-700/70 italic">Dictate or type medicines to extract automatically.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(liveSplit?.medications.length ? liveSplit.medications : medications).map((m, i) => (
                    <div key={i} className="bg-white p-2 border border-emerald-200 text-[11.5px] flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-900">{m.name}</span>
                        {m.strength && <span className="text-gray-500 font-medium ml-1">({m.strength})</span>}
                        <div className="text-[10.5px] text-emerald-800 font-semibold mt-0.5">
                          {m.frequency || "OD"} · {m.duration || "3 days"} {m.instructions ? `· ${m.instructions}` : ""}
                        </div>
                      </div>
                      <span className="text-[10.5px] font-mono font-bold bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded-none">
                        Qty: {m.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Extracted Lab Tests Card */}
            <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-none">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-extrabold text-amber-900 flex items-center gap-1.5">
                  <span>🧪 Diagnostic Lab Tests</span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-none font-mono">
                    {(liveSplit?.labTests.length || labTests.length)}
                  </span>
                </span>
                <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                  Laboratory
                </span>
              </div>

              {(liveSplit?.labTests.length || labTests.length) === 0 ? (
                <p className="text-[11px] text-amber-700/70 italic">Dictate or type lab orders to extract automatically.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(liveSplit?.labTests.length ? liveSplit.labTests : labTests).map((t, i) => (
                    <div key={i} className="bg-white p-2 border border-amber-200 text-[11.5px] flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-900">{t.name}</span>
                        <div className="text-[10.5px] text-amber-800 font-semibold mt-0.5">
                          Category: {t.category} · Urgency: {t.urgency}
                        </div>
                      </div>
                      <span className="text-[10.5px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-none">
                        {t.category}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center gap-2">
              {onBackToPatient && (
                <button
                  type="button"
                  onClick={onBackToPatient}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-[#475569] border border-[#CBD5E1] rounded-none text-[12px] font-semibold transition-colors cursor-pointer"
                >
                  ← Step 1: Patient History
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (onProceedToReview) onProceedToReview();
                  else onRunSplit();
                }}
                disabled={!ready || splitting}
                className="flex-1 py-2 bg-[#1E293B] hover:bg-slate-800 text-white rounded-none text-[12px] font-bold transition-colors cursor-pointer shadow-2xs"
              >
                {splitting ? "Processing Sheet..." : "Step 3: Review Orders →"}
              </button>

              {onSingleClickDispatch && (
                <button
                  type="button"
                  onClick={onSingleClickDispatch}
                  disabled={!ready}
                  className={`py-2 px-4 rounded-none text-[12px] font-bold transition-colors cursor-pointer ${
                    ready
                      ? "bg-[#1B4FD8] hover:bg-blue-700 text-white shadow-2xs"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                  }`}
                >
                  🚀 Send to Pharmacy &amp; Lab
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: review and dispatch ───────────────────────────────────────────────

function ReviewAndDispatch({
  split,
  splitting,
  diagnosis,
  advice,
  onDiagnosis,
  onAdvice,
  medications,
  labTests,
  onMedications,
  onLabTests,
  consultation,
  canDispatch,
  dispatchResult,
  onDispatch,
  onBackToSheet,
  onNextPatient,
}: {
  split: PrescriptionSplit | null;
  splitting: boolean;
  diagnosis: string;
  advice: string;
  onDiagnosis: (value: string) => void;
  onAdvice: (value: string) => void;
  medications: ParsedMedication[];
  labTests: ParsedLabTest[];
  onMedications: (value: ParsedMedication[]) => void;
  onLabTests: (value: ParsedLabTest[]) => void;
  consultation?: ConsultationRecord;
  canDispatch: boolean;
  dispatchResult: DispatchResult | null;
  onDispatch: () => void;
  onBackToSheet: () => void;
  onNextPatient?: () => void;
}) {
  const labTotal = labTests.reduce((sum, test) => sum + priceForTest(test.name), 0);
  const alreadyDispatched = consultation?.dispatch === "Dispatched";

  if (!split && !medications.length && !labTests.length) {
    return (
      <div className="max-w-xl bg-white border border-[#DDE2EC] rounded p-8 text-center">
        <div className="text-3xl mb-2">🤖</div>
        <h3 className="text-[14px] font-bold text-gray-900">Nothing to review yet</h3>
        <p className="text-[12.5px] text-[#64748B] mt-1.5">
          {splitting
            ? "The sheet is being digitised…"
            : "Write the prescription sheet first, then run the AI split — the medicines and the lab tests will appear here for you to check."}
        </p>
        <div className="mt-4">
          <Btn variant="outline" size="sm" onClick={onBackToSheet}>
            ← Back to the sheet
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {split && (
        <div
          className={`border rounded px-4 py-3 ${
            split.engine === "llm" ? "bg-[#EFF6FF] border-[#BFDBFE]" : "bg-[#FFFBEB] border-[#FDE68A]"
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12.5px] font-bold text-gray-900">Extracted Items</span>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#475569]">
              {split.engine === "llm"
                ? "AI Model"
                : split.engine === "smart_ocr"
                  ? "Smart OCR Engine"
                  : split.engine === "heuristic"
                    ? "Keyword match"
                    : split.engine === "browser"
                      ? "Offline keyword match"
                      : split.engine}
            </span>
          </div>
          <p className="text-[12px] text-[#475569] mt-1">
            {split.summary || `${medications.length} medicine(s) and ${labTests.length} investigation(s) identified.`}
          </p>
          {split.engine !== "llm" && (
            <p className="text-[11.5px] text-[#92400E] mt-1">
              The language model was not reachable, so this split came from keyword matching. Check every row before dispatching.
            </p>
          )}
          {split.unclassified.length > 0 && (
            <div className="mt-2 bg-white border border-[#E2E8F0] rounded p-2.5">
              <div className="text-[10.5px] uppercase tracking-wide text-[#94A3B8] font-bold mb-1">
                Could not be placed — add these by hand
              </div>
              <ul className="space-y-0.5">
                {split.unclassified.map((line, index) => (
                  <li key={index} className="text-[11.5px] text-[#475569] font-mono">{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <section className="bg-white border border-[#DDE2EC] rounded p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] mb-1">Diagnosis</label>
          <input
            value={diagnosis}
            onChange={event => onDiagnosis(event.target.value)}
            disabled={alreadyDispatched}
            placeholder="Clinical diagnosis"
            className="w-full border border-[#DDE2EC] rounded px-3 py-2 text-[13px] focus:outline-none focus:border-[#1B4FD8] disabled:bg-[#F8FAFC]"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-[#94A3B8] mb-1">Advice</label>
          <input
            value={advice}
            onChange={event => onAdvice(event.target.value)}
            disabled={alreadyDispatched}
            placeholder="General advice / follow-up"
            className="w-full border border-[#DDE2EC] rounded px-3 py-2 text-[13px] focus:outline-none focus:border-[#1B4FD8] disabled:bg-[#F8FAFC]"
          />
        </div>
      </section>

      {/* Medicines -> pharmacy */}
      <section className="bg-white border border-[#DDE2EC] rounded">
        <div className="px-4 py-2.5 border-b border-[#DDE2EC] flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-[13px] font-bold text-gray-900">💊 Medicines → Pharmacy</h3>
            <p className="text-[11px] text-[#64748B]">Digitised and summarised with the patient's details for the pharmacist.</p>
          </div>
          {!alreadyDispatched && (
            <Btn variant="outline" size="xs" onClick={() => onMedications([...medications, { ...EMPTY_MEDICATION }])}>
              + Add medicine
            </Btn>
          )}
        </div>

        {medications.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12px] text-[#94A3B8]">No medicines on this sheet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-[#F8FAFC] text-[10.5px] uppercase tracking-wide text-[#94A3B8]">
                <tr>
                  {["Medicine", "Strength", "Dose", "Frequency", "Duration", "Qty", "Instructions", ""].map(header => (
                    <th key={header} className="text-left font-bold px-3 py-2 whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {medications.map((medication, index) => {
                  const update = (field: keyof ParsedMedication, value: string | number) =>
                    onMedications(medications.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
                  const cell = "w-full bg-transparent border border-transparent hover:border-[#DDE2EC] focus:border-[#1B4FD8] focus:bg-white rounded px-1.5 py-1 focus:outline-none disabled:hover:border-transparent";
                  return (
                    <tr key={index}>
                      <td className="px-3 py-1.5 min-w-[170px]">
                        <input value={medication.name} disabled={alreadyDispatched} onChange={e => update("name", e.target.value)} className={`${cell} font-semibold text-gray-900`} />
                      </td>
                      <td className="px-3 py-1.5 w-24">
                        <input value={medication.strength} disabled={alreadyDispatched} onChange={e => update("strength", e.target.value)} className={cell} />
                      </td>
                      <td className="px-3 py-1.5 w-24">
                        <input value={medication.dosage} disabled={alreadyDispatched} onChange={e => update("dosage", e.target.value)} className={cell} />
                      </td>
                      <td className="px-3 py-1.5 w-28">
                        <input value={medication.frequency} disabled={alreadyDispatched} onChange={e => update("frequency", e.target.value)} className={cell} />
                      </td>
                      <td className="px-3 py-1.5 w-24">
                        <input value={medication.duration} disabled={alreadyDispatched} onChange={e => update("duration", e.target.value)} className={cell} />
                      </td>
                      <td className="px-3 py-1.5 w-16">
                        <input
                          type="number"
                          min={1}
                          value={medication.quantity}
                          disabled={alreadyDispatched}
                          onChange={e => update("quantity", Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className={`${cell} font-mono`}
                        />
                      </td>
                      <td className="px-3 py-1.5 min-w-[150px]">
                        <input value={medication.instructions} disabled={alreadyDispatched} onChange={e => update("instructions", e.target.value)} className={cell} />
                      </td>
                      <td className="px-3 py-1.5 w-8">
                        {!alreadyDispatched && (
                          <button
                            type="button"
                            onClick={() => onMedications(medications.filter((_, i) => i !== index))}
                            title="Remove"
                            className="text-[#B91C1C] font-bold px-1"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Lab tests -> reception billing -> lab */}
      <section className="bg-white border border-[#DDE2EC] rounded">
        <div className="px-4 py-2.5 border-b border-[#DDE2EC] flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-[13px] font-bold text-gray-900">🧪 Lab tests → Reception billing → Laboratory</h3>
            <p className="text-[11px] text-[#64748B]">
              The lab sees these only once reception has collected payment.
            </p>
          </div>
          {!alreadyDispatched && (
            <Btn
              variant="outline"
              size="xs"
              onClick={() => onLabTests([...labTests, { name: "", category: "Pathology", urgency: "Routine" }])}
            >
              + Add test
            </Btn>
          )}
        </div>

        {labTests.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12px] text-[#94A3B8]">No investigations on this sheet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-[#F8FAFC] text-[10.5px] uppercase tracking-wide text-[#94A3B8]">
                  <tr>
                    {["Investigation", "Category", "Urgency", "Charge", ""].map(header => (
                      <th key={header} className="text-left font-bold px-3 py-2 whitespace-nowrap">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {labTests.map((test, index) => {
                    const update = (field: keyof ParsedLabTest, value: string) =>
                      onLabTests(labTests.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
                    const cell = "w-full bg-transparent border border-transparent hover:border-[#DDE2EC] focus:border-[#1B4FD8] focus:bg-white rounded px-1.5 py-1 focus:outline-none";
                    return (
                      <tr key={index}>
                        <td className="px-3 py-1.5 min-w-[240px]">
                          <input value={test.name} disabled={alreadyDispatched} onChange={e => update("name", e.target.value)} className={`${cell} font-semibold text-gray-900`} />
                        </td>
                        <td className="px-3 py-1.5 w-36">
                          <select
                            value={test.category}
                            disabled={alreadyDispatched}
                            onChange={e => update("category", e.target.value)}
                            className={`${cell} cursor-pointer`}
                          >
                            {["Pathology", "Radiology", "Cardiology", "Other"].map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-1.5 w-28">
                          <select
                            value={test.urgency}
                            disabled={alreadyDispatched}
                            onChange={e => update("urgency", e.target.value)}
                            className={`${cell} cursor-pointer ${test.urgency === "STAT" ? "text-[#DC2626] font-bold" : ""}`}
                          >
                            <option value="Routine">Routine</option>
                            <option value="STAT">STAT</option>
                          </select>
                        </td>
                        <td className="px-3 py-1.5 w-24 font-mono text-[#475569]">
                          ₹{priceForTest(test.name).toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 py-1.5 w-8">
                          {!alreadyDispatched && (
                            <button
                              type="button"
                              onClick={() => onLabTests(labTests.filter((_, i) => i !== index))}
                              title="Remove"
                              className="text-[#B91C1C] font-bold px-1"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-[#DDE2EC] bg-[#F8FAFC] flex items-center justify-between">
              <span className="text-[11.5px] text-[#64748B]">Estimated charge raised at reception</span>
              <span className="text-[14px] font-bold text-gray-900 font-mono">₹{labTotal.toLocaleString("en-IN")}</span>
            </div>
          </>
        )}
      </section>

      {/* Dispatch */}
      {dispatchResult && !dispatchResult.errors.length ? (
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-[#15803D]">✓ Consultation Sent Successfully</h3>
            {onNextPatient && (
              <Btn variant="primary" size="sm" onClick={onNextPatient}>
                Call Next Waiting Patient →
              </Btn>
            )}
          </div>
          <ul className="space-y-1 text-[12.5px] text-[#166534]">
            {dispatchResult.prescriptionId && (
              <li>
                <span className="font-mono font-bold">{dispatchResult.prescriptionId}</span> — {dispatchResult.medicineCount}{" "}
                medicine(s) are in the pharmacy prescription queue with the patient's details and a summary.
              </li>
            )}
            {dispatchResult.labOrderId && (
              <li>
                <span className="font-mono font-bold">{dispatchResult.labOrderId}</span> — {dispatchResult.labTestCount}{" "}
                investigation(s), ₹{dispatchResult.labTotal.toLocaleString("en-IN")}, are with reception for billing. They
                reach the laboratory as soon as payment is collected.
              </li>
            )}
          </ul>
        </div>
      ) : (
        <div className="bg-white border border-[#DDE2EC] rounded p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[12px] text-[#64748B]">
            {alreadyDispatched
              ? "This consultation has already been dispatched."
              : `${medications.filter(m => m.name.trim()).length} medicine(s) to pharmacy · ${labTests.filter(t => t.name.trim()).length} investigation(s) to billing`}
          </div>
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" onClick={onBackToSheet}>
              ← Step 2: Consultation Sheet
            </Btn>
            <Btn variant="primary" size="sm" onClick={onDispatch} disabled={!canDispatch}>
              🚀 Confirm &amp; Send Orders to Pharmacy &amp; Laboratory
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
