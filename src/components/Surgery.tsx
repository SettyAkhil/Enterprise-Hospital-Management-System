import React, { useState, useEffect, useMemo } from "react";
import { BillingDatabase } from "../services/billingDb";
import {
  SurgeryDatabase,
  SurgicalCase,
  SurgeryStatus,
  OtGateError,
  PreAnaestheticAssessment,
  WhoSafetyChecklist,
  RecoveryAldreteDetail,
  SurgicalImplant,
  SurgeonPreferenceCard
} from "../services/surgeryDb";

type MainTab = "gantt" | "pac" | "intraop" | "pacu" | "spc";
type ViewMode = "card" | "timeline";

export default function Surgery() {
  const [activeTab, setActiveTab] = useState<MainTab>("gantt");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [cases, setCases] = useState<SurgicalCase[]>([]);
  const [billingVersion, setBillingVersion] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Modals
  const [bookletModalCase, setBookletModalCase] = useState<SurgicalCase | null>(null);
  const [selectedCaseForBill, setSelectedCaseForBill] = useState<SurgicalCase | null>(null);
  const [pacModalCase, setPacModalCase] = useState<SurgicalCase | null>(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showStatBookModal, setShowStatBookModal] = useState(false);

  // Filter state
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsubSurgery = SurgeryDatabase.subscribe(() => setCases(SurgeryDatabase.getCases()));
    const unsubBilling = BillingDatabase.onUpdate(() => setBillingVersion((v) => v + 1));
    SurgeryDatabase.refresh();

    return () => {
      unsubSurgery();
      unsubBilling();
    };
  }, []);

  const preferenceCards = useMemo(() => SurgeryDatabase.getPreferenceCards(), []);
  const deptCharges = useMemo(() => BillingDatabase.getDepartmentCharges(), [billingVersion]);

  // Filtered cases
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchSearch =
        c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.procedureName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.surgeon.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSpecialty = specialtyFilter === "ALL" || c.specialty === specialtyFilter;
      return matchSearch && matchSpecialty;
    });
  }, [cases, searchQuery, specialtyFilter]);

  // Metrics for top cards
  const metrics = useMemo(() => {
    const total = cases.length;
    const pacPending = cases.filter((c) => c.status === "PAC Pending").length;
    const preOp = cases.filter((c) => c.status === "PAC Cleared" || c.status === "Pre-Op Holding").length;
    const intraOp = cases.filter((c) => c.status === "In Surgery").length;
    const pacu = cases.filter((c) => c.status === "PACU Recovery").length;
    const completed = cases.filter((c) => c.status === "Completed").length;
    return { total, pacPending, preOp, intraOp, pacu, completed };
  }, [cases]);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 5000);
  };

  const showError = (msg: string) => {
    setErrorNotice(msg);
    setTimeout(() => setErrorNotice(null), 6000);
  };

  const runGatedAction = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (err) {
      if (err instanceof OtGateError) {
        showError(err.reason);
      } else {
        showError("That action could not be saved. Please try again.");
      }
    }
  };

  const OR_ROOMS = [
    { name: "OR 1", title: "Major General Surgery", code: "OR 1", type: "Major Suite", bgTint: "bg-blue-50/70", borderTint: "border-blue-200" },
    { name: "OR 2", title: "Laparoscopy & Cardiac", code: "OR 2", type: "Minimally Invasive", bgTint: "bg-teal-50/70", borderTint: "border-teal-200" },
    { name: "OR 3", title: "Orthopedic & Trauma", code: "OR 3", type: "Joint Arthroplasty", bgTint: "bg-purple-50/70", borderTint: "border-purple-200" },
    { name: "OR 4", title: "Emergency Trauma OT", code: "OR 4", type: "STAT Emergency Bay", bgTint: "bg-rose-50/70", borderTint: "border-rose-200" }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4 bg-slate-50/50 min-h-screen font-sans text-slate-800 rounded-none">

      {/* Main Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-base font-bold shadow-xs rounded-none">
            📋
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight rounded-none">
              Surgical Services &amp; Operation Theatre (OT) Board
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Digitized 14-Page Imperial Hospitals OT Booklet • WHO Safe Surgery Checklist • PAC Clearance • Aldrete PACU Gate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-none">
          {/* Live Clock Badge */}
          <div className="px-3 py-1 bg-white border border-slate-200 shadow-xs text-right rounded-none">
            <div className="text-[10px] font-medium text-slate-500">Tue, 23 Sep 2026</div>
            <div className="text-xs font-bold text-slate-900 font-mono leading-none mt-0.5">11:45 AM</div>
            <div className="text-[10px] font-semibold text-emerald-600 flex items-center justify-end gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 animate-ping rounded-none" />
              <span>OT Suite Active</span>
            </div>
          </div>

          {/* Action Buttons */}
          <button
            onClick={() => setShowBookModal(true)}
            className="h-8 px-3 bg-white hover:bg-slate-50 text-blue-600 font-semibold text-xs border border-blue-200 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer rounded-none"
          >
            <span className="font-bold text-sm">+</span>
            <span>Book Surgery Case</span>
          </button>

          <button
            onClick={() => setShowStatBookModal(true)}
            className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer rounded-none"
          >
            <span>⚡</span>
            <span>Reserve Emergency STAT</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center justify-between shadow-xs rounded-none">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer">✕</button>
        </div>
      )}

      {errorNotice && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-center justify-between shadow-xs rounded-none">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="text-rose-700 hover:text-rose-950 font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* 6 Metric Stage Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 rounded-none">
        {[
          { label: "Scheduled", count: metrics.total, bg: "bg-blue-50/50 border-blue-100 text-blue-700", icon: "📅" },
          { label: "PAC Clearance", count: metrics.pacPending, bg: "bg-amber-50/50 border-amber-100 text-amber-700", icon: "🛡️" },
          { label: "Pre-Op Prep", count: metrics.preOp, bg: "bg-teal-50/50 border-teal-100 text-teal-700", icon: "💉" },
          { label: "In Surgery (OT)", count: metrics.intraOp, bg: "bg-purple-50/50 border-purple-100 text-purple-700", icon: "🖊️" },
          { label: "PACU Recovery", count: metrics.pacu, bg: "bg-pink-50/50 border-pink-100 text-pink-700", icon: "🛏️" },
          { label: "Completed", count: metrics.completed, bg: "bg-emerald-50/50 border-emerald-100 text-emerald-700", icon: "📄" }
        ].map((card, i) => (
          <div
            key={i}
            className={`p-2.5 border ${card.bg} bg-white flex items-center justify-between transition-all hover:border-slate-300 shadow-xs cursor-pointer rounded-none`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-slate-100 flex items-center justify-center text-xs rounded-none">
                {card.icon}
              </div>
              <div>
                <div className="text-base font-bold text-slate-900 font-mono leading-none">{card.count}</div>
                <div className="text-[11px] font-medium text-slate-500 mt-0.5">{card.label}</div>
              </div>
            </div>
            <span className="text-slate-300 text-xs font-mono">›</span>
          </div>
        ))}
      </div>

      {/* Navigation Tab Strip & Search Filter Bar */}
      <div className="bg-white border border-slate-200 p-1.5 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs rounded-none">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {[
            { key: "gantt", label: "OR Room Board", icon: "🍱" },
            { key: "pac", label: "PAC Pre-Op Gate", icon: "🩺" },
            { key: "intraop", label: "Intra-Op Suite", icon: "✏️" },
            { key: "pacu", label: "PACU Recovery", icon: "🛋️" },
            { key: "spc", label: "Surgeon Cards", icon: "📦", badge: preferenceCards.length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as MainTab)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap rounded-none ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-none ${activeTab === tab.key ? "bg-white text-blue-600" : "bg-slate-200 text-slate-700"}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search patient, procedure, surgeon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-7 pr-3 bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 font-medium rounded-none"
            />
          </div>
          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none rounded-none"
          >
            <option value="ALL">All Specialities</option>
            <option value="General Surgery">General Surgery</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Cardiothoracic Surgery">Cardiothoracic</option>
            <option value="Trauma Surgery">Trauma Surgery</option>
          </select>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold rounded-none">
            ⏰
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {activeTab === "gantt" && "Operation Theatres Board"}
              {activeTab === "pac" && "Pre-Anesthesia Clearance (PAC) Gate"}
              {activeTab === "intraop" && "Intra-Operative Monitoring Suite"}
              {activeTab === "pacu" && "PACU Recovery & Aldrete Score Board"}
              {activeTab === "spc" && "Surgeon Preference Cards"}
            </h2>
            <p className="text-[11px] text-slate-500">Live status of all Operation Theatre suites with real-time updates</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-8 bg-slate-100 p-0.5 flex items-center gap-0.5 rounded-none">
            <button
              onClick={() => setViewMode("card")}
              className={`px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer rounded-none ${
                viewMode === "card" ? "bg-white text-blue-600 font-semibold shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Card View
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer rounded-none ${
                viewMode === "timeline" ? "bg-white text-blue-600 font-semibold shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Timeline View
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OR ROOM BOARD (OR 1, OR 2, OR 3, OR 4)                            */}
      {/* ========================================================================= */}
      {activeTab === "gantt" && (
        <div className="space-y-3">
          {OR_ROOMS.map((room, ri) => {
            const roomCases = filteredCases.filter((c) => c.orRoom.includes(room.code));
            const activeCase = roomCases.find(
              (c) => c.status === "In Surgery" || c.status === "Pre-Op Holding" || c.status === "PACU Recovery"
            ) || roomCases[0];

            return (
              <div key={ri} className="bg-white border border-slate-200 p-3.5 shadow-xs hover:border-slate-300 transition-all rounded-none">
                {activeCase ? (
                  <div className="flex flex-col lg:flex-row items-stretch justify-between gap-4">
                    {/* Left Room Info Box */}
                    <div className={`w-full lg:w-48 shrink-0 ${room.bgTint} border ${room.borderTint} p-3 flex flex-col justify-between rounded-none`}>
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-slate-900 font-mono">{room.name}</h3>
                          <span
                            className={`px-1.5 py-0.5 font-bold text-[10px] uppercase rounded-none ${
                              activeCase.status === "In Surgery"
                                ? "bg-emerald-100 text-emerald-800"
                                : activeCase.status === "Pre-Op Holding"
                                ? "bg-teal-100 text-teal-800"
                                : activeCase.status === "PACU Recovery"
                                ? "bg-pink-100 text-pink-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {activeCase.status === "In Surgery"
                              ? "IN USE"
                              : activeCase.status === "Pre-Op Holding"
                              ? "PRE-OP"
                              : activeCase.status === "PACU Recovery"
                              ? "PACU"
                              : "SCHEDULED"}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-700 mt-1">{room.title}</div>
                      </div>

                      <div className="mt-2 space-y-1">
                        <span className="px-2 py-0.5 bg-white/90 border border-slate-200 text-[10px] font-medium text-slate-600 inline-block rounded-none">
                          {room.type}
                        </span>
                        <div className="text-[10px] font-mono text-slate-500">
                          Case: <strong>{activeCase.id}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Middle Details */}
                    <div className="flex-1 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-bold text-slate-900 text-sm">{activeCase.patientName}</span>
                          <span className="text-slate-500 font-mono">({activeCase.patientId})</span>
                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 font-semibold text-[10px] rounded-none">
                            {activeCase.gender[0]} / {activeCase.age} yrs
                          </span>
                          <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[10px] rounded-none">
                            {activeCase.insuranceProvider}
                          </span>
                          <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 font-semibold text-[10px] rounded-none">
                            {activeCase.specialty}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10.5px] text-slate-500 font-medium">PAC:</span>
                          <span
                            className={`px-2 py-0.5 text-[10.5px] font-bold border rounded-none ${
                              activeCase.pac?.clearanceStatus === "Cleared"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : activeCase.pac?.clearanceStatus === "High Risk Cleared"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {activeCase.pac?.clearanceStatus || "PAC Pending"} ({activeCase.pac?.opinionAsa?.asaGrade || "ASA II"})
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {activeCase.procedureName}{" "}
                            <span className="text-slate-400 font-mono text-[11px] font-normal">(CPT: {activeCase.cptCode})</span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 space-x-2">
                            <span>Surgeon: <strong className="text-slate-900">{activeCase.surgeon}</strong></span>
                            {activeCase.assistantSurgeon && (
                              <span>Asst: <strong className="text-slate-700">{activeCase.assistantSurgeon}</strong></span>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-600 md:text-right space-y-0.5">
                          <div>Anaesthesia: <strong className="text-slate-900">{activeCase.anesthesiologist}</strong> ({activeCase.pac?.opinionAsa?.anesthesiaPlanned || "General"})</div>
                          <div>Scrub: <strong>{activeCase.scrubNurse}</strong> • Circulating: <strong>{activeCase.circulatingNurse}</strong></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-2.5 py-1 text-[11px] rounded-none">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-slate-500">Live Vitals:</span>
                          <span>BP: <strong className="text-slate-800 font-mono">{activeCase.pac?.vitalsExam?.bp || "120/80"}</strong></span>
                          <span>HR: <strong className="text-slate-800 font-mono">{activeCase.pac?.vitalsExam?.pulse || 74} bpm</strong></span>
                          <span>SpO2: <strong className="text-slate-800 font-mono">{activeCase.recoveryAldrete?.vitals?.spo2 || 99}%</strong></span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-slate-700 font-medium">
                          <span>Scheduled: <strong>{activeCase.scheduledTime}</strong></span>
                          <span>Duration: <strong>{activeCase.durationEst}</strong></span>
                        </div>
                      </div>

                      {/* Stepper */}
                      <div className="pt-1">
                        <div className="relative flex items-center justify-between w-full">
                          <div className="absolute top-1.5 left-0 right-0 h-0.5 bg-slate-200 -z-0" />
                          <div
                            className={`absolute top-1.5 left-0 h-0.5 bg-blue-600 -z-0 ${
                              activeCase.status === "In Surgery"
                                ? "w-1/2"
                                : activeCase.status === "PACU Recovery"
                                ? "w-4/5"
                                : activeCase.status === "Completed"
                                ? "w-full"
                                : "w-1/4"
                            }`}
                          />

                          {[
                            { label: "Scheduled", time: "07:30 AM", state: "done" },
                            { label: "Pre-Op", time: "08:00 AM", state: activeCase.status === "Pre-Op Holding" ? "active" : "done" },
                            { label: "In Surgery", time: "08:30 AM", state: activeCase.status === "In Surgery" ? "active" : activeCase.status === "PACU Recovery" || activeCase.status === "Completed" ? "done" : "pending" },
                            { label: "Closing", time: "", state: "pending" },
                            { label: "PACU", time: "", state: activeCase.status === "PACU Recovery" ? "active" : activeCase.status === "Completed" ? "done" : "pending" },
                            { label: "Complete", time: "", state: activeCase.status === "Completed" ? "done" : "pending" }
                          ].map((step, si) => (
                            <div key={si} className="relative z-10 flex flex-col items-center text-center">
                              <div
                                className={`transition-all rounded-none ${
                                  step.state === "active"
                                    ? "w-3.5 h-3.5 bg-blue-600 border-2 border-white ring-2 ring-blue-500/20"
                                    : step.state === "done"
                                    ? "w-2.5 h-2.5 bg-blue-600"
                                    : "w-2.5 h-2.5 bg-slate-300"
                                }`}
                              />
                              <div className={`text-[10px] mt-0.5 font-medium ${step.state === "active" ? "text-blue-700 font-semibold" : "text-slate-500"}`}>
                                {step.label}
                              </div>
                              {step.time && (
                                <div className="text-[9px] text-slate-400 font-mono">{step.time}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Column */}
                    <div className="w-full lg:w-36 shrink-0 flex flex-col justify-between gap-1.5 border-t lg:border-t-0 lg:border-l border-slate-100 pt-2 lg:pt-0 lg:pl-3">
                      <div className="space-y-1.5">
                        {activeCase.billedAt ? (
                          <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold text-center flex items-center justify-center gap-1 rounded-none">
                            <span>✅</span> Bill Invoiced
                          </div>
                        ) : (
                          <div className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 text-[11px] font-semibold text-center flex items-center justify-center gap-1 rounded-none">
                            <span>○</span> Not Yet Billed
                          </div>
                        )}
                        <button
                          onClick={() => setBookletModalCase(activeCase)}
                          className="w-full h-7 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-semibold text-xs cursor-pointer transition-colors flex items-center justify-center gap-1 rounded-none"
                        >
                          <span>📖</span> OT Booklet
                        </button>
                        <button
                          onClick={() => setSelectedCaseForBill(activeCase)}
                          className="w-full h-7 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer transition-colors flex items-center justify-center gap-1 rounded-none"
                        >
                          <span>₹</span> Charges
                        </button>
                      </div>

                      <button
                        onClick={() => setPacModalCase(activeCase)}
                        className="w-full h-6 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10.5px] font-medium cursor-pointer rounded-none"
                      >
                        Evaluate PAC
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-0.5">
                    <div className={`w-full sm:w-48 shrink-0 ${room.bgTint} border ${room.borderTint} p-3 flex items-center justify-between rounded-none`}>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-bold text-slate-900 font-mono">{room.name}</h3>
                          <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 font-bold text-[10px] uppercase rounded-none">
                            AVAILABLE
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-700 mt-0.5">{room.title}</div>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center gap-3 text-left">
                      <div className="w-8 h-8 bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs shrink-0 rounded-none">
                        🛏️
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800">No case currently in surgery</h4>
                        <p className="text-[11px] text-slate-500">Operating Theatre suite sterile &amp; ready for emergency STAT admissions</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => setShowBookModal(true)}
                        className="h-8 px-3 bg-white border border-blue-200 hover:bg-blue-50 text-blue-600 font-semibold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer rounded-none"
                      >
                        <span className="font-bold text-sm">+</span> Schedule Case
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: PAC PRE-OP GATE */}
      {activeTab === "pac" && (
        <div className="bg-white border border-slate-200 p-4 space-y-4 shadow-xs rounded-none">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>🩺</span> Pre-Anesthesia Clearance (PAC) Evaluation &amp; Gatekeeping Queue
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review clinical history, Mallampati grade, blood investigations, ECG/Echo reports, and issue ASA Grade Clearance
              </p>
            </div>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs rounded-none">
              {filteredCases.filter((c) => c.status === "PAC Pending").length} Pending Clearances
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCases.map((c) => (
              <div key={c.id} className="p-3.5 bg-slate-50 border border-slate-200 space-y-3 rounded-none">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-blue-600 uppercase">{c.orRoom}</span>
                    <h4 className="font-bold text-slate-900 text-xs">{c.procedureName}</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Patient: <strong>{c.patientName}</strong> ({c.patientId}) • {c.gender[0]}/{c.age} yrs • {c.insuranceProvider}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold border rounded-none ${
                      c.pac?.clearanceStatus === "Cleared"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : c.pac?.clearanceStatus === "High Risk Cleared"
                        ? "bg-rose-100 text-rose-800 border-rose-300"
                        : "bg-amber-100 text-amber-800 border-amber-300"
                    }`}
                  >
                    {c.pac?.clearanceStatus || "PAC Pending"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2 bg-white border border-slate-200 text-[11px] font-mono">
                  <div>ASA Grade: <strong>{c.pac?.opinionAsa?.asaGrade || "ASA II"}</strong></div>
                  <div>Anesthesia: <strong>{c.pac?.opinionAsa?.anesthesiaPlanned || "General"}</strong></div>
                  <div>Hb%: <strong>{c.pac?.investigations?.hbPercent || "13.2 g/dL"}</strong></div>
                  <div>Blood Group: <strong>{c.pac?.investigations?.bloodGroup || "O Positive"}</strong></div>
                  <div>BP/HR: <strong>{c.pac?.vitalsExam?.bp || "120/80"} ({c.pac?.vitalsExam?.pulse || 74} bpm)</strong></div>
                  <div>Mallampati: <strong>{c.pac?.clinicalExam?.mallampatiGrade || "Class II"}</strong></div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setBookletModalCase(c)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>📖 Open Full PAC Page (Page 2)</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        runGatedAction(async () => {
                          await SurgeryDatabase.updateCaseStatus(c.id, "PAC Cleared");
                          showToast(`✅ PAC Clearance APPROVED for ${c.patientName}. Patient cleared for Pre-Op Holding.`);
                        })
                      }
                      className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer rounded-none transition-colors"
                    >
                      ✓ Approve Clearance
                    </button>
                    <button
                      onClick={() => setPacModalCase(c)}
                      className="h-7 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer rounded-none"
                    >
                      Edit Evaluation
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: INTRA-OP SUITE */}
      {activeTab === "intraop" && (
        <div className="bg-white border border-slate-200 p-4 space-y-4 shadow-xs rounded-none">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>✏️</span> Intra-Operative Suite &amp; WHO Surgical Safety Control
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time intra-operative tracking, WHO 3-phase checklist verifications, instrument counts, and surgical team logs
              </p>
            </div>
            <span className="px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 font-bold text-xs rounded-none">
              {filteredCases.filter((c) => c.status === "In Surgery").length} Active Surgeries
            </span>
          </div>

          <div className="space-y-3">
            {filteredCases
              .filter((c) => c.status === "In Surgery" || c.status === "Pre-Op Holding")
              .map((c) => (
                <div key={c.id} className="p-3.5 bg-slate-50 border border-slate-200 space-y-3 rounded-none">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div>
                      <span className="px-2 py-0.5 bg-blue-600 text-white font-mono font-bold text-[10px] rounded-none uppercase">
                        {c.orRoom}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{c.procedureName}</h4>
                      <p className="text-xs text-slate-600">
                        Patient: <strong>{c.patientName}</strong> ({c.patientId}) • Surgeon: <strong>{c.surgeon}</strong> • Anesthesiologist: <strong>{c.anesthesiologist}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBookletModalCase(c)}
                        className="h-8 px-3 bg-blue-50 border border-blue-200 text-blue-700 font-semibold text-xs hover:bg-blue-100 cursor-pointer rounded-none"
                      >
                        📖 WHO Checklist (Page 10)
                      </button>
                      <button
                        onClick={() =>
                          runGatedAction(async () => {
                            await SurgeryDatabase.updateCaseStatus(c.id, "PACU Recovery");
                            showToast(`🛋️ Surgery for ${c.patientName} completed! Transferred to PACU Recovery Bed.`);
                          })
                        }
                        className="h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs cursor-pointer rounded-none"
                      >
                        Transfer to PACU ›
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 bg-white border border-slate-200 space-y-1">
                      <div className="font-bold text-blue-800 flex items-center justify-between">
                        <span>1. SIGN-IN (Pre-Anaesthesia)</span>
                        <span className={c.whoChecklist?.signIn?.signedByNurse ? "text-emerald-600 font-bold" : "text-slate-400 font-bold"}>
                          {c.whoChecklist?.signIn?.signedByNurse ? "✓ Signed" : "○ Pending"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {c.whoChecklist?.signIn?.signedByNurse ? `Signed by ${c.whoChecklist.signIn.signedByNurse}` : "Patient identity, site marked, consent verified, pulse oximeter attached."}
                      </p>
                    </div>

                    <div className="p-2.5 bg-white border border-slate-200 space-y-1">
                      <div className="font-bold text-purple-800 flex items-center justify-between">
                        <span>2. TIME-OUT (Pre-Incision)</span>
                        <span className={c.whoChecklist?.timeOut?.signedBySurgeon ? "text-emerald-600 font-bold" : "text-slate-400 font-bold"}>
                          {c.whoChecklist?.timeOut?.signedBySurgeon ? "✓ Signed" : "○ Pending"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {c.whoChecklist?.timeOut?.signedBySurgeon ? `Signed by ${c.whoChecklist.timeOut.signedBySurgeon}` : "Team introduced, critical steps reviewed, antibiotic prophylaxis given within 60 mins."}
                      </p>
                    </div>

                    <div className="p-2.5 bg-white border border-slate-200 space-y-1">
                      <div className="font-bold text-teal-800 flex items-center justify-between">
                        <span>3. SIGN-OUT (Post-Op)</span>
                        <span className={c.whoChecklist?.signOut?.signedByScrubNurse ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                          {c.whoChecklist?.signOut?.signedByScrubNurse ? "✓ Signed" : "● In Progress"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {c.whoChecklist?.signOut?.signedByScrubNurse ? `Signed by ${c.whoChecklist.signOut.signedByScrubNurse}` : "Instrument, sponge & needle count verification prior to wound closure."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 4: PACU RECOVERY */}
      {activeTab === "pacu" && (
        <div className="bg-white border border-slate-200 p-4 space-y-4 shadow-xs rounded-none">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>🛋️</span> Post-Anaesthesia Care Unit (PACU) &amp; Aldrete Recovery Board
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor recovery vitals, evaluate Modified Aldrete Scores (0–10), and issue Ward / ICU discharge clearance
              </p>
            </div>
            <span className="px-2.5 py-1 bg-pink-50 text-pink-800 border border-pink-200 font-bold text-xs rounded-none">
              {filteredCases.filter((c) => c.status === "PACU Recovery").length} Patients in PACU
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCases
              .filter((c) => c.status === "PACU Recovery" || c.status === "Completed")
              .map((c) => (
                <div key={c.id} className="p-3.5 bg-slate-50 border border-slate-200 space-y-3 rounded-none">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-pink-700 uppercase">
                        {c.recoveryAldrete?.bedNumber || "PACU Bed 02"}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs">{c.procedureName}</h4>
                      <p className="text-[11px] text-slate-600">Patient: <strong>{c.patientName}</strong> ({c.patientId})</p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-extrabold font-mono text-purple-900">
                        Aldrete Score: {c.recoveryAldrete?.aldreteScore?.totalScore || 9}/10
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-none">
                        {c.recoveryAldrete?.dischargeStatus || "Cleared for Ward"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2 bg-white border border-slate-200 text-center font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">BP</span>
                      <strong>{c.recoveryAldrete?.vitals?.bp || "124/80"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">HR</span>
                      <strong>{c.recoveryAldrete?.vitals?.hr || 76} bpm</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">SpO2</span>
                      <strong className="text-emerald-700">{c.recoveryAldrete?.vitals?.spo2 || 98}%</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setBookletModalCase(c)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>📖 Aldrete Chart (Page 14)</span>
                    </button>

                    <button
                      onClick={() =>
                        runGatedAction(async () => {
                          await SurgeryDatabase.updateCaseStatus(c.id, "Completed");
                          showToast(`📄 Case ${c.id} for ${c.patientName} completed & settled in Central Billing!`);
                        })
                      }
                      className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer rounded-none"
                    >
                      ✓ Discharge to Ward &amp; Invoice
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 5: SURGEON CARDS */}
      {activeTab === "spc" && (
        <div className="bg-white border border-slate-200 p-4 space-y-4 shadow-xs rounded-none">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>📦</span> Surgeon Preference Cards &amp; Instrument Tray Setup
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Surgeon-specific glove sizes, instrument tray configurations, suture preferences, and operating instructions
              </p>
            </div>
            <button className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer rounded-none">
              + New Preference Card
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preferenceCards.map((spc) => (
              <div key={spc.id} className="p-4 bg-slate-50 border border-slate-200 space-y-3 rounded-none">
                <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{spc.surgeonName}</h4>
                    <p className="text-xs text-blue-600 font-semibold">{spc.specialty} • {spc.procedure}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-800 rounded-none">
                    Glove Size: {spc.gloveSize}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-700 block">Preferred Instrument Trays:</span>
                    <ul className="list-disc pl-4 text-slate-600 space-y-0.5 mt-0.5">
                      {spc.preferredTrays.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700 block">Suture Preferences:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {spc.suturePreferences.map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 text-[11px] text-slate-700 font-mono rounded-none">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-2 bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                    <strong>Special Operating Note:</strong> {spc.specialInstructions}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DIGITAL OT BOOKLET MODAL (Full Interactive 14-Page Implementation) */}
      {bookletModalCase && (
        <DigitalOtBookletModal
          surgicalCase={bookletModalCase}
          onClose={() => setBookletModalCase(null)}
          onSave={async (updated) => {
            try {
              await SurgeryDatabase.saveFullBooklet(bookletModalCase.id, updated);
              showToast(`📖 Digital OT Booklet for ${bookletModalCase.patientName} saved & synced across departments.`);
              setBookletModalCase(null);
            } catch {
              showError("Could not save the OT booklet. Please try again.");
            }
          }}
          onError={showError}
          onNotice={showToast}
        />
      )}

      {selectedCaseForBill && (
        <ViewChargesModal surgicalCase={selectedCaseForBill} onClose={() => setSelectedCaseForBill(null)} />
      )}

      {showBookModal && (
        <BookCaseModal
          onClose={() => setShowBookModal(false)}
          onBook={async (newCase) => {
            try {
              const created = await SurgeryDatabase.createCase(newCase);
              showToast(`✅ New Surgical Case ${created.id} (${created.procedureName}) booked in ${created.orRoom}.`);
              setShowBookModal(false);
            } catch {
              showError("Could not book this case -- check that the patient ID is registered in the system.");
            }
          }}
        />
      )}

      {showStatBookModal && (
        <BookCaseModal
          defaultUrgency="Emergency STAT"
          onClose={() => setShowStatBookModal(false)}
          onBook={async (newCase) => {
            try {
              const created = await SurgeryDatabase.createCase(newCase);
              showToast(`⚡ EMERGENCY STAT OR Reserved! Case ${created.id} routed to ${created.orRoom}.`);
              setShowStatBookModal(false);
            } catch {
              showError("Could not reserve this OR -- check that the patient ID is registered in the system.");
            }
          }}
        />
      )}

      {pacModalCase && (
        <PacEvaluationModal
          surgicalCase={pacModalCase}
          onClose={() => setPacModalCase(null)}
          onSaved={showToast}
          onError={showError}
        />
      )}
    </div>
  );
}

/* ========================================================================= */
/* DIGITAL OT BOOKLET MODAL (FULL INTERACTIVE 14-PAGE IMPERIAL HOSPITALS)    */
/* ========================================================================= */
function DigitalOtBookletModal({
  surgicalCase,
  onClose,
  onSave,
  onError,
  onNotice,
}: {
  surgicalCase: SurgicalCase;
  onClose: () => void;
  onSave: (updated: Partial<SurgicalCase>) => void;
  onError: (msg: string) => void;
  onNotice: (msg: string) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<SurgicalCase>(surgicalCase);

  useEffect(() => {
    setFormData(surgicalCase);
  }, [surgicalCase]);

  const runGatedAction = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (err) {
      if (err instanceof OtGateError) {
        onError(err.reason);
      } else {
        onError("That action could not be saved. Please try again.");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-200 text-slate-900 overflow-hidden rounded-none">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-2.5 flex items-center justify-between shrink-0 rounded-none">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">📖</span>
            <div>
              <h3 className="font-bold text-xs tracking-wider uppercase">IMPERIAL HOSPITALS — OFFICIAL DIGITAL OT BOOKLET</h3>
              <p className="text-[11px] text-slate-300">
                Patient: <strong>{formData.patientName}</strong> • MRN: {formData.mrn} • IP No: {formData.ipNo || "IP-2026-8812"} • Suite: {formData.orRoom}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-base cursor-pointer">✕</button>
        </div>

        {/* 14-Page Navigation Tab Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center gap-1 overflow-x-auto shrink-0 rounded-none">
          {[
            { page: 1, label: "P1: Cover" },
            { page: 2, label: "P2: PAC Assessment" },
            { page: 3, label: "P3: Anaesthesia Plan" },
            { page: 4, label: "P4: Surgery Consent (EN)" },
            { page: 5, label: "P5: Surgery Consent (TE)" },
            { page: 6, label: "P6: Anaes Consent (EN)" },
            { page: 7, label: "P7: Anaes Consent (TE)" },
            { page: 8, label: "P8: Master Checklist" },
            { page: 9, label: "P9: Pre-Prep Form" },
            { page: 10, label: "P10: WHO Checklist" },
            { page: 11, label: "P11: Anaes Record" },
            { page: 12, label: "P12: Operation Record" },
            { page: 13, label: "P13: Surgeon Notes" },
            { page: 14, label: "P14: Aldrete Score" }
          ].map((item) => (
            <button
              key={item.page}
              onClick={() => setCurrentPage(item.page)}
              className={`px-2.5 py-1 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors rounded-none ${
                currentPage === item.page ? "bg-blue-600 text-white font-semibold" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Page Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50 text-xs">
          {/* PAGE 1: COVER PAGE */}
          {currentPage === 1 && (
            <div className="bg-white border border-slate-200 p-6 max-w-lg mx-auto space-y-4 shadow-xs rounded-none">
              <div className="text-center space-y-1 border-b border-slate-200 pb-3">
                <div className="text-2xl font-black text-slate-900 tracking-tight">IMPERIAL HOSPITALS</div>
                <div className="text-xs font-semibold text-slate-500">BHIMAVARAM - 534 202 • TELANGANA / ANDHRA PRADESH</div>
                <div className="py-2 text-base font-extrabold text-blue-900 font-mono tracking-wider">OPERATION THEATRE BOOKLET</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Patient Name</label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    className="w-full h-8 px-2.5 border border-slate-300 rounded-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">UMR ID</label>
                  <input
                    type="text"
                    value={formData.patientId}
                    onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                    className="w-full h-8 px-2.5 border border-slate-300 rounded-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">MRN / IP No.</label>
                  <input
                    type="text"
                    value={`${formData.mrn} / ${formData.ipNo || "IP-2026-8812"}`}
                    onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
                    className="w-full h-8 px-2.5 border border-slate-300 rounded-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Age / Gender</label>
                  <input
                    type="text"
                    value={`${formData.age} yrs / ${formData.gender}`}
                    readOnly
                    className="w-full h-8 px-2.5 border border-slate-200 bg-slate-100 rounded-none font-medium text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Primary Surgeon</label>
                  <input
                    type="text"
                    value={formData.surgeon}
                    onChange={(e) => setFormData({ ...formData, surgeon: e.target.value })}
                    className="w-full h-8 px-2.5 border border-slate-300 rounded-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Anesthesiologist</label>
                  <input
                    type="text"
                    value={formData.anesthesiologist}
                    onChange={(e) => setFormData({ ...formData, anesthesiologist: e.target.value })}
                    className="w-full h-8 px-2.5 border border-slate-300 rounded-none font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PAGE 2: PRE-ANAESTHETIC ASSESSMENT (PAC) */}
          {currentPage === 2 && (
            <div className="bg-white border border-slate-200 p-5 space-y-4 shadow-xs rounded-none">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase">Page 2 — Pre-Anaesthetic Assessment (PAC) Clinical Record</h4>
                  <p className="text-[11px] text-slate-500">Physical history, airway classification, vitals examination &amp; lab clearance</p>
                </div>
                <select
                  value={formData.pac?.clearanceStatus || "Cleared"}
                  onChange={(e) => setFormData({
                    ...formData,
                    pac: { ...formData.pac!, clearanceStatus: e.target.value }
                  })}
                  className="h-8 px-3 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-none cursor-pointer"
                >
                  <option value="Cleared">✓ Cleared for Surgery</option>
                  <option value="High Risk Cleared">⚠️ High Risk Cleared</option>
                  <option value="Pending">● PAC Pending</option>
                  <option value="Rejected">✕ Rejected / Unfit</option>
                </select>
              </div>

              {/* Checkboxes Grid */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 text-xs block">1. Medical &amp; Anesthetic History Checklist:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 border border-slate-200 text-[11px]">
                  {["Diabetes", "Hypertension", "IHD", "Asthma / COPD", "TB", "Scoline Sensitivity", "Bleeding Tendency", "Drug Allergies"].map((item, idx) => (
                    <label key={idx} className="flex items-center gap-1.5 cursor-pointer font-medium">
                      <input type="checkbox" defaultChecked={idx < 3} className="rounded-none" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Mallampati & Airway Exam */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mallampati Airway Grade</label>
                  <select
                    value={formData.pac?.clinicalExam?.mallampatiGrade || "Class II"}
                    onChange={(e) => setFormData({
                      ...formData,
                      pac: {
                        ...formData.pac!,
                        clinicalExam: { ...formData.pac!.clinicalExam, mallampatiGrade: e.target.value as any }
                      }
                    })}
                    className="w-full h-8 px-2 border border-slate-300 rounded-none text-xs font-semibold"
                  >
                    <option value="Class I">Class I (Full view of soft palate)</option>
                    <option value="Class II">Class II (Uvula partially visible)</option>
                    <option value="Class III">Class III (Soft palate only)</option>
                    <option value="Class IV">Class IV (Hard palate only - Difficult Airway)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">ASA Physical Status Grade</label>
                  <select
                    value={formData.pac?.opinionAsa?.asaGrade || "ASA II"}
                    onChange={(e) => setFormData({
                      ...formData,
                      pac: {
                        ...formData.pac!,
                        opinionAsa: { ...formData.pac!.opinionAsa, asaGrade: e.target.value as any }
                      }
                    })}
                    className="w-full h-8 px-2 border border-slate-300 rounded-none text-xs font-semibold"
                  >
                    <option value="ASA I">ASA I (Normal healthy patient)</option>
                    <option value="ASA II">ASA II (Mild systemic disease)</option>
                    <option value="ASA III">ASA III (Severe systemic disease)</option>
                    <option value="ASA IV">ASA IV (Threat to life)</option>
                    <option value="ASA V-E">ASA V-E (Emergency STAT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Planned Anesthesia Technique</label>
                  <select
                    value={formData.pac?.opinionAsa?.anesthesiaPlanned || "Spinal/Epidural"}
                    onChange={(e) => setFormData({
                      ...formData,
                      pac: {
                        ...formData.pac!,
                        opinionAsa: { ...formData.pac!.opinionAsa, anesthesiaPlanned: e.target.value as any }
                      }
                    })}
                    className="w-full h-8 px-2 border border-slate-300 rounded-none text-xs font-semibold"
                  >
                    <option value="General Anesthesia">General Anesthesia</option>
                    <option value="Spinal/Epidural">Spinal / Epidural Block</option>
                    <option value="Regional Block">Peripheral Nerve Block</option>
                    <option value="Local">Local Anesthesia + Monitored Care</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 3: ANAESTHESIA PLAN */}
          {currentPage === 3 && (
            <div className="bg-white border border-slate-200 p-5 space-y-4 shadow-xs rounded-none">
              <h4 className="font-bold text-slate-900 text-xs uppercase">Page 3 — Anaesthesia Plan &amp; Pre-Op Instructions</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">NPO Orders &amp; Preop Instructions</label>
                  <textarea
                    rows={2}
                    defaultValue="NPO Solids 6 hours prior to surgery, clear fluids NPO 2 hours prior. Continue morning anti-hypertensives with sips of water."
                    className="w-full p-2 border border-slate-300 rounded-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Premedication Orders</label>
                  <input
                    type="text"
                    defaultValue="Tab Alprazolam 0.25mg at bedtime, Tab Pantoprazole 40mg at 06:00 AM"
                    className="w-full h-8 px-2.5 border border-slate-300 rounded-none text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PAGES 4 & 5: SURGERY CONSENT (EN & TE) */}
          {(currentPage === 4 || currentPage === 5) && (
            <div className="bg-white border border-slate-200 p-5 space-y-4 shadow-xs rounded-none">
              <h4 className="font-bold text-slate-900 text-xs uppercase">
                Page {currentPage} — {currentPage === 4 ? "Consent for Surgery & Invasive Procedures (English)" : "శస్త్రచికిత్స సమ్మతి పత్రం (Telugu Consent)"}
              </h4>
              <div className="p-4 border border-slate-200 bg-slate-50 font-serif leading-relaxed text-xs space-y-2">
                <p>
                  I hereby authorize Dr. <strong>{formData.surgeon}</strong> to perform the procedure: <strong>{formData.procedureName}</strong>.
                </p>
                <p>I confirm that the risks of bleeding, infection, and blood transfusion have been explained to me.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Patient / Attendant Digital Signature</label>
                  <input type="text" defaultValue="Signed by Patient (Attendant Verified)" className="w-full h-8 px-2.5 border border-slate-300 rounded-none text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Witness Signature</label>
                  <input type="text" defaultValue="Nurse Ward Lead" className="w-full h-8 px-2.5 border border-slate-300 rounded-none text-xs font-mono" />
                </div>
              </div>
            </div>
          )}

          {/* PAGES 6 & 7: ANAESTHESIA CONSENT (EN & TE) */}
          {(currentPage === 6 || currentPage === 7) && (
            <div className="bg-white border border-slate-200 p-5 space-y-4 shadow-xs rounded-none">
              <h4 className="font-bold text-slate-900 text-xs uppercase">
                Page {currentPage} — {currentPage === 6 ? "Consent for Anaesthesia & Invasive Monitoring (English)" : "అనెస్థీషియా సమ్మతి పత్రం (Telugu Consent)"}
              </h4>
              <div className="p-4 border border-slate-200 bg-slate-50 font-serif text-xs">
                Authorization for <strong>{formData.pac?.opinionAsa?.anesthesiaPlanned || "General / Regional Anesthesia"}</strong> administered by Dr. <strong>{formData.anesthesiologist}</strong>.
              </div>
            </div>
          )}

          {/* PAGE 8: SURGERY MASTER CHECKLIST */}
          {currentPage === 8 && (
            <div className="bg-white border border-slate-200 p-5 space-y-4 shadow-xs rounded-none">
              <h4 className="font-bold text-slate-900 text-xs uppercase">Page 8 — Master Surgery Audit Checklist (Items 1–21)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="font-bold text-blue-900 block">Pre-Op Items (1–10)</span>
                  {["1. ID Band Tagged", "2. Consent Signed", "3. NPO Confirmed", "4. Shave Prep Done", "5. Jewelry Removed"].map((item, idx) => (
                    <label key={idx} className="flex items-center gap-1.5 font-medium cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded-none" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="font-bold text-purple-900 block">Intra-Op Items (11–15)</span>
                  {["11. Sterility Verified", "12. C-Arm Pad Placed", "13. Swab Count #1", "14. Swab Count #2"].map((item, idx) => (
                    <label key={idx} className="flex items-center gap-1.5 font-medium cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded-none" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="font-bold text-teal-900 block">Post-Op Items (16–21)</span>
                  {["16. PACU Handover", "17. Vitals Recorded", "18. Post-Op Orders", "19. Specimen Labeled"].map((item, idx) => (
                    <label key={idx} className="flex items-center gap-1.5 font-medium cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded-none" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PAGE 9: PRE-PREPARATION FORM */}
          {currentPage === 9 && (
            <div className="bg-white border border-slate-200 p-5 space-y-4 shadow-xs rounded-none">
              <h4 className="font-bold text-slate-900 text-xs uppercase">Page 9 — Pre-Preparation Form for Operation Handover</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Handover Ward Nurse</label>
                  <input type="text" defaultValue="Nurse Ward Lead" className="w-full h-8 px-2.5 border border-slate-300 rounded-none text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Transfer Time</label>
                  <input type="text" defaultValue="07:15 AM" className="w-full h-8 px-2.5 border border-slate-300 rounded-none font-mono text-xs" />
                </div>
              </div>
            </div>
          )}

          {/* PAGE 10: WHO CHECKLIST */}
          {currentPage === 10 && (
            <div className="bg-white border border-slate-200 p-5 space-y-4 shadow-xs rounded-none">
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase">Page 10 — WHO 3-Phase Surgical Safety Checklist</h4>
                <p className="text-[11px] text-amber-700 font-medium mt-1">
                  Each phase's signature is required before "Transfer to PACU" is allowed -- an unsigned phase blocks the transfer.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-blue-50 border border-blue-200 space-y-2">
                  <span className="font-bold text-blue-900 block">1. SIGN-IN (Before Induction)</span>
                  {([
                    ["patientConfirmedIdConsent", "Identity & site confirmed"],
                    ["siteMarked", "Site marked"],
                    ["anaesthesiaMachineCheckComplete", "Anaesthesia machine check complete"],
                    ["pulseOximeterFunctioning", "Pulse oximeter on & functioning"],
                    ["allergiesChecked", "Allergies checked"],
                    ["difficultAirwayRisk", "Difficult airway risk"],
                    ["bloodLossRiskOver500ml", "Blood loss risk > 500mL"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!formData.whoChecklist?.signIn?.[key]}
                        onChange={(e) => setFormData({
                          ...formData,
                          whoChecklist: {
                            ...formData.whoChecklist!,
                            signIn: { ...formData.whoChecklist?.signIn!, [key]: e.target.checked },
                          },
                        })}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                  <div className="pt-1">
                    <label className="block text-[10.5px] font-semibold text-blue-900 mb-0.5">Signed by (Nurse) *</label>
                    <input
                      type="text"
                      value={formData.whoChecklist?.signIn?.signedByNurse || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        whoChecklist: {
                          ...formData.whoChecklist!,
                          signIn: { ...formData.whoChecklist?.signIn!, signedByNurse: e.target.value, completedAt: new Date().toISOString() },
                        },
                      })}
                      placeholder="Nurse name"
                      className="w-full h-7 px-2 border border-blue-300 rounded-none text-xs"
                    />
                  </div>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 space-y-2">
                  <span className="font-bold text-purple-900 block">2. TIME-OUT (Before Incision)</span>
                  {([
                    ["teamMembersIntroduced", "Team members introduced"],
                    ["patientNameProcedureSiteConfirmed", "Name/procedure/site confirmed"],
                    ["antibioticProphylaxisWithin60min", "Antibiotic prophylaxis within 60min"],
                    ["surgeonCriticalStepsDiscussed", "Critical steps discussed"],
                    ["anaesthetistPatientConcernsDiscussed", "Anaesthetist concerns discussed"],
                    ["nurseSterilityEquipmentVerified", "Sterility/equipment verified"],
                    ["imagingDisplayed", "Imaging displayed"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!formData.whoChecklist?.timeOut?.[key]}
                        onChange={(e) => setFormData({
                          ...formData,
                          whoChecklist: {
                            ...formData.whoChecklist!,
                            timeOut: { ...formData.whoChecklist?.timeOut!, [key]: e.target.checked },
                          },
                        })}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                  <div className="pt-1">
                    <label className="block text-[10.5px] font-semibold text-purple-900 mb-0.5">Signed by (Surgeon) *</label>
                    <input
                      type="text"
                      value={formData.whoChecklist?.timeOut?.signedBySurgeon || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        whoChecklist: {
                          ...formData.whoChecklist!,
                          timeOut: { ...formData.whoChecklist?.timeOut!, signedBySurgeon: e.target.value, completedAt: new Date().toISOString() },
                        },
                      })}
                      placeholder="Surgeon name"
                      className="w-full h-7 px-2 border border-purple-300 rounded-none text-xs"
                    />
                  </div>
                </div>
                <div className="p-3 bg-teal-50 border border-teal-200 space-y-2">
                  <span className="font-bold text-teal-900 block">3. SIGN-OUT (Before Exit)</span>
                  {([
                    ["procedureNameRecorded", "Procedure name recorded"],
                    ["swabInstrumentNeedleCountCorrect", "Swab/instrument/needle count correct"],
                    ["specimenLabeledAloud", "Specimen labeled aloud"],
                    ["equipmentProblemsNoted", "Equipment problems noted"],
                    ["postOpRecoveryConcernsDiscussed", "Post-op recovery concerns discussed"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!formData.whoChecklist?.signOut?.[key]}
                        onChange={(e) => setFormData({
                          ...formData,
                          whoChecklist: {
                            ...formData.whoChecklist!,
                            signOut: { ...formData.whoChecklist?.signOut!, [key]: e.target.checked },
                          },
                        })}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                  <div className="pt-1">
                    <label className="block text-[10.5px] font-semibold text-teal-900 mb-0.5">Signed by (Scrub Nurse) *</label>
                    <input
                      type="text"
                      value={formData.whoChecklist?.signOut?.signedByScrubNurse || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        whoChecklist: {
                          ...formData.whoChecklist!,
                          signOut: { ...formData.whoChecklist?.signOut!, signedByScrubNurse: e.target.value, completedAt: new Date().toISOString() },
                        },
                      })}
                      placeholder="Scrub nurse name"
                      className="w-full h-7 px-2 border border-teal-300 rounded-none text-xs"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={() =>
                  runGatedAction(async () => {
                    const who: WhoSafetyChecklist = formData.whoChecklist || ({
                      signIn: {}, timeOut: {}, signOut: {},
                    } as unknown as WhoSafetyChecklist);
                    await SurgeryDatabase.saveWhoChecklist(surgicalCase.id, who);
                    onNotice("WHO Safety Checklist saved.");
                  })
                }
                className="h-8 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs cursor-pointer transition-colors rounded-none"
              >
                Save WHO Checklist
              </button>
            </div>
          )}

          {/* PAGE 11: ANAESTHESIA RECORD */}
          {currentPage === 11 && (
            <div className="bg-white border border-slate-200 p-5 space-y-4 shadow-xs rounded-none">
              <h4 className="font-bold text-slate-900 text-xs uppercase">Page 11 — Anaesthesia Record &amp; Airway Management</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Airway &amp; ETT Size</label>
                  <input type="text" defaultValue="ETT Size 7.5 Cuffed (Sellick's applied)" className="w-full h-8 px-2.5 border border-slate-300 rounded-none text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Regional Block &amp; Onset Level</label>
                  <input type="text" defaultValue="Spinal L3-L4 space, 0.5% Bupivacaine 3.0mL" className="w-full h-8 px-2.5 border border-slate-300 rounded-none text-xs" />
                </div>
              </div>
            </div>
          )}

          {/* PAGES 12 & 13: OPERATION RECORD & NOTES */}
          {(currentPage === 12 || currentPage === 13) && (
            <div className="bg-white border border-slate-200 p-5 space-y-4 shadow-xs rounded-none">
              <h4 className="font-bold text-slate-900 text-xs uppercase">
                Page {currentPage} — {currentPage === 12 ? "Operation Record & Swab Counts" : "Surgeon Operative Summary & Post-Op Orders"}
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Operative Procedure Notes</label>
                  <textarea
                    rows={4}
                    defaultValue="Paramedian incision made, joint capsule opened. Femoral & tibial surfaces resected. Titanium trial components placed with excellent tracking. Implant seated with PMMA bone cement. Wound closed layer by layer."
                    className="w-full p-2.5 border border-slate-300 rounded-none text-xs font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Blood Loss (mL)</label>
                    <input type="text" defaultValue="120 mL" className="w-full h-8 px-2.5 border border-slate-300 rounded-none font-mono text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Histopathology Jar</label>
                    <input type="text" defaultValue="Specimen Jar #1 (Synovial Tissue)" className="w-full h-8 px-2.5 border border-slate-300 rounded-none text-xs" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 14: ALDRETE RECOVERY SCORE */}
          {currentPage === 14 && (() => {
            const aldrete = formData.recoveryAldrete?.aldreteScore || {
              activity: 0, respiration: 0, circulation: 0, consciousness: 0, o2Saturation: 0, totalScore: 0,
            };
            const setScore = (field: keyof typeof aldrete, value: number) => {
              const clamped = Math.max(0, Math.min(2, value));
              const next = { ...aldrete, [field]: clamped };
              next.totalScore = next.activity + next.respiration + next.circulation + next.consciousness + next.o2Saturation;
              setFormData({
                ...formData,
                recoveryAldrete: { ...formData.recoveryAldrete!, aldreteScore: next },
              });
            };
            const scoreFields: Array<[keyof typeof aldrete, string]> = [
              ["activity", "Activity (Moves extremities)"],
              ["respiration", "Respiration (Deep breath & cough)"],
              ["circulation", "Circulation (BP ± 20%)"],
              ["consciousness", "Consciousness (Fully awake)"],
              ["o2Saturation", "O2 Saturation (> 92% room air)"],
            ];
            return (
              <div className="bg-white border border-slate-200 p-5 space-y-4 shadow-xs rounded-none">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase">Page 14 — PACU Modified Aldrete Score Matrix (0–10)</h4>
                  <div className="text-sm font-extrabold text-purple-900 font-mono">
                    Aldrete Score: {aldrete.totalScore}/10
                  </div>
                </div>
                <p className="text-[11px] text-amber-700 font-medium -mt-2">
                  A recorded score and a discharge status other than "In PACU" are required before "Discharge to Ward &amp; Invoice" is allowed.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 space-y-2">
                    {scoreFields.map(([field, label]) => (
                      <div key={field} className="flex items-center justify-between gap-2">
                        <span>{label}:</span>
                        <select
                          value={aldrete[field]}
                          onChange={(e) => setScore(field, Number(e.target.value))}
                          className="w-16 h-7 px-1 border border-slate-300 rounded-none font-mono font-bold text-center"
                        >
                          <option value={0}>0</option>
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="p-3 bg-blue-50 border border-blue-200 space-y-2">
                      <label className="block font-semibold text-blue-900 text-xs">Discharge Gate Status</label>
                      <select
                        value={formData.recoveryAldrete?.dischargeStatus || "In PACU"}
                        onChange={(e) => setFormData({
                          ...formData,
                          recoveryAldrete: { ...formData.recoveryAldrete!, aldreteScore: aldrete, dischargeStatus: e.target.value as any },
                        })}
                        className="w-full h-8 px-2.5 border border-blue-300 font-bold text-xs bg-white rounded-none cursor-pointer"
                      >
                        <option value="Cleared for Ward">✓ Cleared for Ward Transfer</option>
                        <option value="In PACU">● In PACU Monitoring</option>
                        <option value="Transferred to ICU">⚠️ Transferred to ICU</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 p-2.5 bg-white border border-slate-200">
                      <input
                        type="text" placeholder="BP" value={formData.recoveryAldrete?.vitals?.bp || ""}
                        onChange={(e) => setFormData({ ...formData, recoveryAldrete: { ...formData.recoveryAldrete!, aldreteScore: aldrete, vitals: { ...formData.recoveryAldrete?.vitals!, bp: e.target.value } } })}
                        className="h-7 px-1.5 border border-slate-300 rounded-none text-[11px] font-mono"
                      />
                      <input
                        type="number" placeholder="HR" value={formData.recoveryAldrete?.vitals?.hr || ""}
                        onChange={(e) => setFormData({ ...formData, recoveryAldrete: { ...formData.recoveryAldrete!, aldreteScore: aldrete, vitals: { ...formData.recoveryAldrete?.vitals!, hr: Number(e.target.value) || 0 } } })}
                        className="h-7 px-1.5 border border-slate-300 rounded-none text-[11px] font-mono"
                      />
                      <input
                        type="number" placeholder="SpO2" value={formData.recoveryAldrete?.vitals?.spo2 || ""}
                        onChange={(e) => setFormData({ ...formData, recoveryAldrete: { ...formData.recoveryAldrete!, aldreteScore: aldrete, vitals: { ...formData.recoveryAldrete?.vitals!, spo2: Number(e.target.value) || 0 } } })}
                        className="h-7 px-1.5 border border-slate-300 rounded-none text-[11px] font-mono"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    runGatedAction(async () => {
                      const pacu: RecoveryAldreteDetail = {
                        bedNumber: formData.recoveryAldrete?.bedNumber || "",
                        admissionTime: formData.recoveryAldrete?.admissionTime || new Date().toISOString(),
                        dischargeTime: formData.recoveryAldrete?.dischargeStatus !== "In PACU" ? new Date().toISOString() : undefined,
                        aldreteScore: aldrete,
                        vitals: formData.recoveryAldrete?.vitals || { bp: "", hr: 0, spo2: 0 },
                        dischargeStatus: formData.recoveryAldrete?.dischargeStatus || "In PACU",
                        wardHandoverNurse: formData.recoveryAldrete?.wardHandoverNurse || "",
                        dischargedBy: formData.recoveryAldrete?.dischargedBy || "",
                      };
                      await SurgeryDatabase.savePacuRecord(surgicalCase.id, pacu);
                      onNotice("PACU / Aldrete record saved.");
                    })
                  }
                  className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer transition-colors rounded-none"
                >
                  Save PACU / Aldrete Record
                </button>
              </div>
            );
          })()}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-2.5 flex items-center justify-between shrink-0 rounded-none">
          <span className="text-xs text-slate-500">Page {currentPage} of 14</span>
          <div className="flex gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="h-8 px-3 bg-white border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer disabled:opacity-50 rounded-none">Previous</button>
            <button disabled={currentPage === 14} onClick={() => setCurrentPage((p) => Math.min(14, p + 1))} className="h-8 px-3 bg-white border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer disabled:opacity-50 rounded-none">Next</button>
            <button
              onClick={() => onSave(formData)}
              className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer transition-colors rounded-none"
            >
              ✓ Save &amp; Sync Digital OT Booklet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewChargesModal({ surgicalCase, onClose }: { surgicalCase: SurgicalCase; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white max-w-md w-full p-5 space-y-3 shadow-2xl border border-slate-200 rounded-none">
        <h3 className="font-bold text-slate-900 text-sm">📑 Surgical Charge Sheet</h3>
        <p className="text-xs text-slate-600">Patient: <strong>{surgicalCase.patientName}</strong> • Total: ₹{surgicalCase.totalAmount.toLocaleString("en-IN")}</p>
        <div className="flex justify-end">
          <button onClick={onClose} className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs cursor-pointer rounded-none">Close</button>
        </div>
      </div>
    </div>
  );
}

type BookCaseInput = Omit<SurgicalCase, "id" | "caseNo" | "billedAt" | "invoiceId" | "createdAt" | "updatedAt" | "status"> & { status?: SurgeryStatus };

function BookCaseModal({
  onClose,
  onBook,
  defaultUrgency = "Elective",
}: {
  onClose: () => void;
  onBook: (c: BookCaseInput) => Promise<void> | void;
  defaultUrgency?: SurgicalCase["urgency"];
}) {
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState(45);
  const [gender, setGender] = useState<SurgicalCase["gender"]>("Male");
  const [procedureName, setProcedureName] = useState("");
  const [specialty, setSpecialty] = useState("General Surgery");
  const [surgeon, setSurgeon] = useState("");
  const [orRoom, setOrRoom] = useState("OR 1 — Major General Surgery");
  const [totalAmount, setTotalAmount] = useState(125000);
  const [saving, setSaving] = useState(false);

  const canSubmit = patientId.trim() && patientName.trim() && procedureName.trim() && surgeon.trim();

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white max-w-md w-full p-5 space-y-3 shadow-2xl border border-slate-200 rounded-none">
        <h3 className="font-bold text-slate-900 text-sm">📅 Schedule Surgical Case</h3>
        <div className="space-y-2.5 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Patient ID (must already be registered)</label>
            <input type="text" placeholder="e.g. PAT-1042 or ER-PAT-1008" value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full h-8 px-2.5 border border-slate-200 font-mono text-xs text-slate-800 rounded-none" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Patient Name</label>
            <input type="text" placeholder="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)} className="w-full h-8 px-2.5 border border-slate-200 font-medium text-xs text-slate-800 rounded-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Age</label>
              <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value) || 0)} className="w-full h-8 px-2.5 border border-slate-200 font-medium text-xs text-slate-800 rounded-none" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value as SurgicalCase["gender"])} className="w-full h-8 px-2.5 border border-slate-200 font-medium text-xs text-slate-800 rounded-none">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Procedure</label>
            <input type="text" placeholder="Procedure" value={procedureName} onChange={(e) => setProcedureName(e.target.value)} className="w-full h-8 px-2.5 border border-slate-200 font-medium text-xs text-slate-800 rounded-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Specialty</label>
              <input type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full h-8 px-2.5 border border-slate-200 font-medium text-xs text-slate-800 rounded-none" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Surgeon</label>
              <input type="text" placeholder="Surgeon" value={surgeon} onChange={(e) => setSurgeon(e.target.value)} className="w-full h-8 px-2.5 border border-slate-200 font-medium text-xs text-slate-800 rounded-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">OR Room</label>
              <select value={orRoom} onChange={(e) => setOrRoom(e.target.value)} className="w-full h-8 px-2.5 border border-slate-200 font-medium text-xs text-slate-800 rounded-none">
                <option value="OR 1 — Major General Surgery">OR 1 — Major General Surgery</option>
                <option value="OR 2 — Laparoscopy & Cardiac">OR 2 — Laparoscopy & Cardiac</option>
                <option value="OR 3 — Orthopedic & Trauma">OR 3 — Orthopedic & Trauma</option>
                <option value="OR 4 — Emergency Trauma OT">OR 4 — Emergency Trauma OT</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Estimated Amount (₹)</label>
              <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(Number(e.target.value) || 0)} className="w-full h-8 px-2.5 border border-slate-200 font-mono text-xs text-slate-800 rounded-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs cursor-pointer rounded-none">Cancel</button>
          <button
            disabled={!canSubmit || saving}
            onClick={async () => {
              setSaving(true);
              await onBook({
                orRoom, patientId: patientId.trim(), patientName: patientName.trim(), age, gender,
                mrn: patientId.replace(/\D/g, "") || patientId, ipNo: "",
                procedureName, cptCode: "", icd10Code: "", specialty, surgeon,
                anesthesiologist: "", scrubNurse: "", circulatingNurse: "",
                scheduledTime: "", durationEst: "",
                urgency: defaultUrgency, insuranceProvider: "", totalAmount,
              });
              setSaving(false);
            }}
            className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs cursor-pointer transition-colors rounded-none disabled:opacity-50"
          >
            {saving ? "Scheduling..." : "Schedule Case"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PacEvaluationModal({
  surgicalCase,
  onClose,
  onSaved,
  onError,
}: {
  surgicalCase: SurgicalCase;
  onClose: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const pac = surgicalCase.pac;
  const [clearanceStatus, setClearanceStatus] = useState<string>(pac?.clearanceStatus || "Pending");
  const [asaGrade, setAsaGrade] = useState<string>(pac?.opinionAsa?.asaGrade || "ASA II");
  const [anesthesiaPlanned, setAnesthesiaPlanned] = useState<string>(pac?.opinionAsa?.anesthesiaPlanned || "Spinal/Epidural");
  const [mallampatiGrade, setMallampatiGrade] = useState<string>(pac?.clinicalExam?.mallampatiGrade || "Class II");
  const [bp, setBp] = useState(pac?.vitalsExam?.bp || "");
  const [pulse, setPulse] = useState(pac?.vitalsExam?.pulse || 0);
  const [hbPercent, setHbPercent] = useState(pac?.investigations?.hbPercent || "");
  const [bloodGroup, setBloodGroup] = useState(pac?.investigations?.bloodGroup || "");
  const [evaluatorSignature, setEvaluatorSignature] = useState(pac?.opinionAsa?.evaluatorSignature || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const merged: PreAnaestheticAssessment = {
        ...(pac as PreAnaestheticAssessment),
        clinicalExam: { ...(pac?.clinicalExam as any), mallampatiGrade: mallampatiGrade as any },
        vitalsExam: { ...(pac?.vitalsExam as any), bp, pulse },
        investigations: { ...(pac?.investigations as any), hbPercent, bloodGroup },
        opinionAsa: {
          ...(pac?.opinionAsa as any),
          asaGrade: asaGrade as any,
          anesthesiaPlanned: anesthesiaPlanned as any,
          evaluatorSignature,
          date: new Date().toISOString().slice(0, 10),
          time: new Date().toTimeString().slice(0, 5),
        },
        clearanceStatus,
      };
      await SurgeryDatabase.savePacAssessment(surgicalCase.id, merged);
      onSaved(`🩺 PAC evaluation for ${surgicalCase.patientName} saved.`);
      onClose();
    } catch {
      onError("Could not save the PAC evaluation. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white max-w-lg w-full p-5 space-y-3 shadow-2xl border border-slate-200 rounded-none text-xs">
        <h3 className="font-bold text-slate-900 text-sm">🩺 Pre-Anesthesia Clearance (PAC) Evaluation</h3>
        <p className="text-slate-600">Patient: <strong>{surgicalCase.patientName}</strong> ({surgicalCase.patientId})</p>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Clearance Status</label>
            <select value={clearanceStatus} onChange={(e) => setClearanceStatus(e.target.value)} className="w-full h-8 px-2 border border-slate-300 rounded-none font-semibold">
              <option value="Cleared">✓ Cleared for Surgery</option>
              <option value="High Risk Cleared">⚠️ High Risk Cleared</option>
              <option value="Pending">● PAC Pending</option>
              <option value="Rejected">✕ Rejected / Unfit</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">ASA Grade</label>
            <select value={asaGrade} onChange={(e) => setAsaGrade(e.target.value)} className="w-full h-8 px-2 border border-slate-300 rounded-none font-semibold">
              <option value="ASA I">ASA I</option>
              <option value="ASA II">ASA II</option>
              <option value="ASA III">ASA III</option>
              <option value="ASA IV">ASA IV</option>
              <option value="ASA V-E">ASA V-E</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mallampati Grade</label>
            <select value={mallampatiGrade} onChange={(e) => setMallampatiGrade(e.target.value)} className="w-full h-8 px-2 border border-slate-300 rounded-none font-semibold">
              <option value="Class I">Class I</option>
              <option value="Class II">Class II</option>
              <option value="Class III">Class III</option>
              <option value="Class IV">Class IV</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Planned Anesthesia</label>
            <select value={anesthesiaPlanned} onChange={(e) => setAnesthesiaPlanned(e.target.value)} className="w-full h-8 px-2 border border-slate-300 rounded-none font-semibold">
              <option value="General Anesthesia">General Anesthesia</option>
              <option value="Spinal/Epidural">Spinal/Epidural</option>
              <option value="Regional Block">Regional Block</option>
              <option value="Local">Local</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">BP</label>
            <input type="text" value={bp} onChange={(e) => setBp(e.target.value)} placeholder="120/80" className="w-full h-8 px-2 border border-slate-300 rounded-none font-mono" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pulse (bpm)</label>
            <input type="number" value={pulse} onChange={(e) => setPulse(Number(e.target.value) || 0)} className="w-full h-8 px-2 border border-slate-300 rounded-none font-mono" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hb%</label>
            <input type="text" value={hbPercent} onChange={(e) => setHbPercent(e.target.value)} placeholder="13.2 g/dL" className="w-full h-8 px-2 border border-slate-300 rounded-none font-mono" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Blood Group</label>
            <input type="text" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} placeholder="O Positive" className="w-full h-8 px-2 border border-slate-300 rounded-none font-mono" />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Evaluator Signature</label>
            <input type="text" value={evaluatorSignature} onChange={(e) => setEvaluatorSignature(e.target.value)} placeholder="Dr. ..." className="w-full h-8 px-2 border border-slate-300 rounded-none font-medium" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-none cursor-pointer">Cancel</button>
          <button disabled={saving} onClick={save} className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-none cursor-pointer disabled:opacity-50">
            {saving ? "Saving..." : "Save PAC Evaluation"}
          </button>
        </div>
      </div>
    </div>
  );
}
