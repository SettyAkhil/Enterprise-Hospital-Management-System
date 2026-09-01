import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import MarkdownReport from "./MarkdownReport";
import DocumentUploadDropzone from "./DocumentUploadDropzone";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Tabs,
  TabsContent,
  TabsTrigger,
  Textarea,
} from "./ui";
import { API_BASE, SYMPTOM_API_BASE } from "../lib/constants";
import { apiFetch, reportError, withAuthHeaders } from "../lib/api";
import type { Notice } from "../types";

type Props = {
  setNotice: Dispatch<SetStateAction<Notice | null>>;
  onNavigate?: (page: string, extraData?: any) => void;
};

type Doctor = {
  id: number;
  doctor_name: string;
  department: string;
  consultation_fee: number;
  status: string;
};

type Region = {
  name: string;
  keywords: string[];
  color: string;
  icon: string;
  svg_id: string;
};

type HistoryEntry = {
  createdAt: string;
  description: string;
  region: string;
  intensity: number;
  duration: string;
  contextTags: string[];
  response: string;
};

type PatientInfo = {
  age: string;
  gender: string;
  temperature: string;
  temp_unit: "°F" | "°C";
  heart_rate: string;
  systolic: string;
  diastolic: string;
};

type SymptomMetaResponse = {
  context_tags?: string[];
  duration_options?: string[];
  regions?: Region[];
};

type SymptomAnalyzeResponse = {
  response?: string;
  detected_region?: string | null;
  used_fallback?: boolean;
  model_error?: string | null;
};

type SymptomDocument = {
  id: number;
  filename: string;
  doc_category: string | null;
  created_at: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  session_id?: string;
  created_at?: string;
};

const FALLBACK_DURATIONS = [
  "Just started (today)",
  "A few days",
  "About a week",
  "1-2 weeks",
  "2-4 weeks",
  "More than a month",
  "Comes and goes",
  "Recurring over time",
];

const FALLBACK_CONTEXT_TAGS = [
  "Recent stress",
  "Changed sleep pattern",
  "New exercise routine",
  "Dietary changes",
  "Weather changes",
  "Travel recently",
  "Screen time increase",
  "Sitting for long periods",
  "Physical activity",
  "Emotional changes",
  "Hydration concerns",
  "New environment",
];

const FALLBACK_REGIONS: Region[] = [
  {
    name: "General / Full Body",
    keywords: [],
    color: "#8BC8B8",
    icon: "🧍",
    svg_id: "full_body",
  },
];

const START_PATIENT: PatientInfo = {
  age: "",
  gender: "Not specified",
  temperature: "",
  temp_unit: "°F",
  heart_rate: "",
  systolic: "",
  diastolic: "",
};

function parseStoredHistory(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem("symptom-ai-history");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 50) : [];
  } catch {
    return [];
  }
}

function buildBodySvg(selectedRegion: Region) {
  const id = selectedRegion?.svg_id || "";
  const highlight = selectedRegion?.color || "#6B8E9F";
  const muted = "#E8F4F8";

  const head = ["head", "eyes", "ears", "nose", "mouth", "full_body"].includes(
    id,
  )
    ? highlight
    : muted;
  const neck = ["neck", "full_body"].includes(id) ? highlight : muted;
  const chest = ["chest", "shoulders", "upper_back", "full_body"].includes(id)
    ? highlight
    : muted;
  const abdomen = ["abdomen", "full_body"].includes(id) ? highlight : muted;
  const arms = ["arms", "shoulders", "hands", "full_body"].includes(id)
    ? highlight
    : muted;
  const hips = ["hips", "lower_back", "full_body"].includes(id)
    ? highlight
    : muted;
  const legs = ["thighs", "knees", "lower_legs", "feet", "full_body"].includes(
    id,
  )
    ? highlight
    : muted;

  return (
    <svg
      viewBox="0 0 200 400"
      className="symptom-body-svg"
      aria-label="Body map"
    >
      <ellipse
        cx="100"
        cy="40"
        rx="30"
        ry="35"
        fill={head}
        stroke="#6B8E9F"
        strokeWidth="2"
      />
      <rect
        x="88"
        y="70"
        width="24"
        height="20"
        fill={neck}
        stroke="#6B8E9F"
        strokeWidth="2"
      />
      <path
        d="M60 90 Q50 95 45 130 L50 180 Q55 200 60 200 L140 200 Q145 200 150 180 L155 130 Q150 95 140 90 Z"
        fill={chest}
        stroke="#6B8E9F"
        strokeWidth="2"
      />
      <path
        d="M60 200 L60 250 Q65 260 75 260 L125 260 Q135 260 140 250 L140 200 Z"
        fill={abdomen}
        stroke="#6B8E9F"
        strokeWidth="2"
      />
      <path
        d="M45 95 Q25 100 20 150 L15 220 Q15 230 25 230 L35 230 Q45 230 45 220 L50 150 Z"
        fill={arms}
        stroke="#6B8E9F"
        strokeWidth="2"
      />
      <path
        d="M155 95 Q175 100 180 150 L185 220 Q185 230 175 230 L165 230 Q155 230 155 220 L150 150 Z"
        fill={arms}
        stroke="#6B8E9F"
        strokeWidth="2"
      />
      <path
        d="M75 260 L70 280 Q65 290 75 290 L125 290 Q135 290 130 280 L125 260 Z"
        fill={hips}
        stroke="#6B8E9F"
        strokeWidth="2"
      />
      <path
        d="M75 290 L70 370 Q68 385 80 385 L95 385 Q100 385 100 370 L100 290 Z"
        fill={legs}
        stroke="#6B8E9F"
        strokeWidth="2"
      />
      <path
        d="M100 290 L100 370 Q100 385 105 385 L120 385 Q132 385 130 370 L125 290 Z"
        fill={legs}
        stroke="#6B8E9F"
        strokeWidth="2"
      />
    </svg>
  );
}

function intensityColor(value: number) {
  if (value <= 3) return "#4CAF50";
  if (value <= 6) return "#FF9800";
  return "#f44336";
}

function entryKey(entry: HistoryEntry) {
  return `${entry.createdAt}-${entry.description.slice(0, 24)}`;
}

export default function SymptomAiPage({ setNotice, onNavigate }: Props) {
  const [activeSection, setActiveSection] = useState<
    "home" | "documents" | "about" | "safety"
  >("home");
  const [historySidebarOpen, setHistorySidebarOpen] = useState(false);
  const [symptomDocuments, setSymptomDocuments] = useState<SymptomDocument[]>(
    [],
  );
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null);
  const [docUploadLoading, setDocUploadLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(
    undefined,
  );
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [description, setDescription] = useState("");
  const [bodyRegion, setBodyRegion] = useState("General / Full Body");
  const [intensity, setIntensity] = useState(5);
  const [duration, setDuration] = useState(FALLBACK_DURATIONS[0]);
  const [contextTags, setContextTags] = useState<string[]>([]);
  const [patientInfo, setPatientInfo] = useState<PatientInfo>(START_PATIENT);
  const [loading, setLoading] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [activeHistoryKey, setActiveHistoryKey] = useState<string | null>(null);
  const [suggestedDoctors, setSuggestedDoctors] = useState<Doctor[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [contextOptions, setContextOptions] = useState<string[]>(
    FALLBACK_CONTEXT_TAGS,
  );
  const [durationOptions, setDurationOptions] =
    useState<string[]>(FALLBACK_DURATIONS);
  const [regions, setRegions] = useState<Region[]>(FALLBACK_REGIONS);

  const fetchSuggestedDoctors = async (region: string) => {
    try {
      const data = await apiFetch<{ doctors?: Doctor[] }>(
        `/api/op/doctors/suggest?region=${encodeURIComponent(region)}`,
      );
      setSuggestedDoctors(data.doctors || []);
    } catch {
      setSuggestedDoctors([]);
    }
  };

  useEffect(() => {
    setHistory(parseStoredHistory());
    let active = true;
    fetch(`${SYMPTOM_API_BASE}/api/symptom-ai/meta`)
      .then((res) => {
        if (!res.ok) throw new Error("Unable to load SymptoMap AI metadata.");
        return res.json() as Promise<SymptomMetaResponse>;
      })
      .then((data) => {
        if (!active) return;
        if (data.context_tags?.length) setContextOptions(data.context_tags);
        if (data.duration_options?.length) {
          setDurationOptions(data.duration_options);
          setDuration((prev) =>
            data.duration_options?.includes(prev)
              ? prev
              : data.duration_options?.[0] || prev,
          );
        }
        if (data.regions?.length) {
          setRegions(data.regions);
          setBodyRegion((prev) =>
            data.regions?.some((r) => r.name === prev)
              ? prev
              : data.regions?.[0]?.name || prev,
          );
        }
      })
      .catch(() => {
        setNotice({
          type: "warning",
          message:
            "SymptoMap AI metadata unavailable. Running with fallback options.",
        });
      });
    return () => {
      active = false;
    };
  }, [setNotice]);

  const selectedRegion = useMemo(
    () =>
      regions.find((entry) => entry.name === bodyRegion) ||
      regions[0] ||
      FALLBACK_REGIONS[0],
    [regions, bodyRegion],
  );

  const trendItems = useMemo(() => history.slice(0, 10).reverse(), [history]);

  const onToggleTag = (tag: string) => {
    setContextTags((prev) =>
      prev.includes(tag)
        ? prev.filter((value) => value !== tag)
        : [...prev, tag],
    );
  };

  const detectRegion = async () => {
    if (!description.trim()) return;
    try {
      const res = await fetch(
        `${SYMPTOM_API_BASE}/api/symptom-ai/detect-region`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { region?: string | null };
      if (data.region && regions.some((entry) => entry.name === data.region)) {
        setBodyRegion(data.region);
      }
    } catch {
      // best effort only
    }
  };

  const analyze = async () => {
    if (description.trim().length < 10) {
      setNotice({
        type: "warning",
        message: "Please describe the sensation with at least 10 characters.",
      });
      return;
    }

    const payload = {
      description: description.trim(),
      body_region: bodyRegion,
      intensity,
      duration,
      context_tags: contextTags,
      patient_info: {
        age: patientInfo.age ? Number(patientInfo.age) : null,
        gender:
          patientInfo.gender === "Not specified" ? null : patientInfo.gender,
        temperature: patientInfo.temperature
          ? Number(patientInfo.temperature)
          : null,
        temp_unit: patientInfo.temp_unit,
        heart_rate: patientInfo.heart_rate
          ? Number(patientInfo.heart_rate)
          : null,
        blood_pressure:
          patientInfo.systolic && patientInfo.diastolic
            ? {
                systolic: Number(patientInfo.systolic),
                diastolic: Number(patientInfo.diastolic),
              }
            : null,
      },
    };

    setLoading(true);
    try {
      const res = await fetch(`${SYMPTOM_API_BASE}/api/symptom-ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as SymptomAnalyzeResponse & {
        error?: string;
      };
      if (!res.ok) {
        throw Object.assign(
          new Error(data.error || "Unable to generate wellness insights."),
          { status: res.status },
        );
      }

      const nextResponse = data.response || "No insights returned.";
      const resolvedRegion = data.detected_region || bodyRegion;
      setResponseText(nextResponse);
      void fetchSuggestedDoctors(resolvedRegion);
      if (
        data.detected_region &&
        regions.some((entry) => entry.name === data.detected_region)
      ) {
        setBodyRegion(data.detected_region);
      }

      if (data.used_fallback) {
        setNotice({
          type: "warning",
          message: "SymptoMap AI returned a safety fallback response.",
        });
      } else if (data.model_error) {
        setNotice({
          type: "warning",
          message: "SymptoMap AI response was generated with model warnings.",
        });
      }

      const entry: HistoryEntry = {
        createdAt: new Date().toISOString(),
        description: description.trim(),
        region: resolvedRegion,
        intensity,
        duration,
        contextTags: [...contextTags],
        response: nextResponse,
      };

      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 50);
        window.localStorage.setItem("symptom-ai-history", JSON.stringify(next));
        return next;
      });
      setActiveHistoryKey(entryKey(entry));
    } catch (error) {
      reportError(
        setNotice,
        error as { status?: number; message?: string },
        "Unable to generate wellness insights.",
      );
    } finally {
      setLoading(false);
    }
  };

  const exportCurrent = async () => {
    if (!responseText) return;
    try {
      const res = await fetch(`${SYMPTOM_API_BASE}/api/symptom-ai/export/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generated_at: new Date().toISOString(),
          region: bodyRegion,
          intensity,
          duration,
          description,
          response: responseText,
        }),
      });
      if (!res.ok) {
        throw new Error("Unable to generate PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `symptomap_ai_insight_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      reportError(
        setNotice,
        error as { status?: number; message?: string },
        "Unable to export insight as PDF.",
      );
    }
  };

  const exportAll = () => {
    if (!history.length) return;
    const lines = [
      "# SymptoMap AI - Session History",
      "",
      `Exported: ${new Date().toLocaleString()}`,
      "",
    ];
    history.forEach((entry, index) => {
      lines.push(`## Entry ${index + 1}`);
      lines.push(`Date: ${new Date(entry.createdAt).toLocaleString()}`);
      lines.push(`Region: ${entry.region}`);
      lines.push(`Intensity: ${entry.intensity}/10`);
      lines.push(`Duration: ${entry.duration}`);
      lines.push(`Description: ${entry.description}`);
      if (entry.contextTags.length)
        lines.push(`Context: ${entry.contextTags.join(", ")}`);
      lines.push("");
      lines.push(entry.response);
      lines.push("", "---", "");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `symptom_ai_history_${new Date().toISOString().slice(0, 10)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const clearHistory = () => {
    setHistory([]);
    setActiveHistoryKey(null);
    window.localStorage.removeItem("symptom-ai-history");
  };

  const restoreSession = (entry: HistoryEntry) => {
    setActiveSection("home");
    setDescription(entry.description);
    setBodyRegion(entry.region);
    setIntensity(entry.intensity);
    setDuration(entry.duration);
    setContextTags(entry.contextTags);
    setResponseText(entry.response);
    setActiveHistoryKey(entryKey(entry));
    setHistorySidebarOpen(false);
  };

  const loadSymptomDocuments = async () => {
    try {
      const data = await apiFetch<{ documents?: SymptomDocument[] }>(
        "/api/symptom-ai/documents",
      );
      setSymptomDocuments(data.documents || []);
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Unable to load your documents.",
      );
    }
  };

  const loadSymptomChatHistory = async () => {
    try {
      const data = await apiFetch<{ messages?: ChatMessage[] }>(
        "/api/symptom-ai/chat/history",
      );
      setChatMessages(data.messages || []);
      const lastSession = (data.messages || []).slice(-1)[0]?.session_id;
      if (lastSession) setChatSessionId(lastSession);
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Unable to load chat history.",
      );
    }
  };

  const openDocumentsTab = () => {
    setActiveSection("documents");
    if (!documentsLoaded) {
      setDocumentsLoaded(true);
      void loadSymptomDocuments();
      void loadSymptomChatHistory();
    }
  };

  const handleDocUpload = async () => {
    if (!docUploadFile) {
      setNotice({ type: "warning", message: "Choose a file to upload first." });
      return;
    }
    setDocUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", docUploadFile);
      const response = await fetch(`${API_BASE}/api/symptom-ai/documents`, {
        method: "POST",
        headers: withAuthHeaders({}, "POST"),
        body: formData,
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw Object.assign(
          new Error(data.error || "Unable to upload document."),
          { status: response.status },
        );
      }
      setDocUploadFile(null);
      await loadSymptomDocuments();
      if (data.graph_updated) {
        setNotice({
          type: "success",
          message: `${data.filename} processed and added to your knowledge base.`,
        });
      } else {
        setNotice({
          type: "warning",
          message: `${data.filename} was saved, but couldn't be added to your knowledge base yet: ${data.graph_error || "unknown error"}`,
        });
      }
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Unable to upload document.",
      );
    } finally {
      setDocUploadLoading(false);
    }
  };

  const handleDocDelete = async (documentId: number) => {
    try {
      await apiFetch(`/api/symptom-ai/documents/${documentId}`, {
        method: "DELETE",
      });
      await loadSymptomDocuments();
      setNotice({ type: "success", message: "Document removed." });
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Unable to remove document.",
      );
    }
  };

  const handleChatSend = async () => {
    const message = chatInput.trim();
    if (!message) return;
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const data = await apiFetch<{ session_id: string; answer: string }>(
        "/api/symptom-ai/chat",
        {
          method: "POST",
          body: JSON.stringify({ message, session_id: chatSessionId }),
        },
      );
      setChatSessionId(data.session_id);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Unable to reach your knowledge base.",
      );
      setChatMessages((prev) => prev.slice(0, -1));
      setChatInput(message);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await apiFetch("/api/symptom-ai/chat/history", { method: "DELETE" });
      setChatMessages([]);
      setChatSessionId(undefined);
      setNotice({ type: "success", message: "Chat history cleared." });
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Unable to clear chat history.",
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 relative">
      {/* Disclaimer */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <span className="font-bold text-lg">!</span>
        </div>
        <div>
          <h4 className="text-sm font-bold text-blue-900">Educational Tool Only</h4>
          <p className="text-sm text-blue-700/80">
            SymptoMap AI provides wellness education and is not a substitute for medical advice, diagnosis, or treatment.
          </p>
        </div>
      </div>

      {/* Premium Segmented Control for Tabs */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex bg-[#F0F2F5] p-1.5 rounded-2xl shadow-inner border border-[#E2E8F0] gap-1 relative overflow-x-auto">
          {[
            { id: "home", label: "Home" },
            { id: "documents", label: "Ask About Documents" },
            { id: "about", label: "About" },
            { id: "safety", label: "Safety" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveSection(t.id as any);
                if (t.id === "documents" && !documentsLoaded) {
                  setDocumentsLoaded(true);
                  void loadSymptomDocuments();
                  void loadSymptomChatHistory();
                }
              }}
              className={`whitespace-nowrap px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ease-out ${
                activeSection === t.id
                  ? "bg-white text-[#1B4FD8] shadow-[0_2px_8px_-2px_rgba(27,79,216,0.15)] scale-100"
                  : "text-[#64748B] hover:text-[#1E2D42] hover:bg-white/50 scale-95"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setHistorySidebarOpen((prev) => !prev)}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#1E2D42] hover:text-[#1B4FD8] hover:border-blue-200 shadow-sm transition-all"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="8"/>
            <path d="M12 7v5l3.5 2"/>
          </svg>
          Session History
        </button>
      </div>

      {activeSection === "home" && (
        <div className="flex flex-col gap-8 animate-in slide-in-from-bottom-4 fade-in">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Left Column: Form */}
            <div className="xl:col-span-7 flex flex-col gap-6">
              <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-[#E2E8F0]">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mt-1 shrink-0">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="text-blue-500 opacity-80"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      <div className="absolute w-3 h-3 bg-pink-400 rounded-full bottom-2 right-2 border-2 border-white"></div>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#1E2D42] mb-1">Describe Your Sensation</h2>
                      <p className="text-sm text-[#64748B]">Share more details so AI can generate personalized wellness insights.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-full text-xs font-bold border border-purple-100">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z"/></svg>
                    AI-Powered
                  </div>
                </div>

                {/* Patient Info Accordion */}
                <details className="mb-6 group/details bg-gray-50/50 rounded-xl border border-gray-100 transition-all">
                  <summary className="text-sm font-semibold text-[#1E2D42] cursor-pointer p-4 list-none flex justify-between items-center select-none">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Patient Information <span className="text-gray-400 font-normal">(Optional)</span>
                    </div>
                    <span className="w-5 h-5 flex items-center justify-center text-gray-400 group-open/details:rotate-180 transition-transform">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                    </span>
                  </summary>
                  <div className="p-4 pt-0 grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-gray-100 mt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500">Age</label>
                      <Input type="number" value={patientInfo.age} onChange={e => setPatientInfo(p => ({ ...p, age: e.target.value }))} className="rounded-xl bg-white text-sm border-gray-200" placeholder="e.g. 30" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500">Gender</label>
                      <Select value={patientInfo.gender} onChange={e => setPatientInfo(p => ({ ...p, gender: e.target.value }))} className="rounded-xl bg-white text-sm border-gray-200">
                        <option>Not specified</option><option>Male</option><option>Female</option><option>Other</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500">Temp</label>
                      <div className="flex gap-1">
                        <Input type="number" step="0.1" value={patientInfo.temperature} onChange={e => setPatientInfo(p => ({ ...p, temperature: e.target.value }))} className="rounded-xl bg-white text-sm border-gray-200" placeholder="98.6" />
                        <Select value={patientInfo.temp_unit} onChange={e => setPatientInfo(p => ({ ...p, temp_unit: e.target.value as any }))} className="rounded-xl bg-white text-sm border-gray-200 px-1 w-16">
                          <option>°F</option><option>°C</option>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500">Heart Rate</label>
                      <Input type="number" value={patientInfo.heart_rate} onChange={e => setPatientInfo(p => ({ ...p, heart_rate: e.target.value }))} className="rounded-xl bg-white text-sm border-gray-200" placeholder="bpm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500">Systolic</label>
                      <Input type="number" value={patientInfo.systolic} onChange={e => setPatientInfo(p => ({ ...p, systolic: e.target.value }))} className="rounded-xl bg-white text-sm border-gray-200" placeholder="120" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500">Diastolic</label>
                      <Input type="number" value={patientInfo.diastolic} onChange={e => setPatientInfo(p => ({ ...p, diastolic: e.target.value }))} className="rounded-xl bg-white text-sm border-gray-200" placeholder="80" />
                    </div>
                  </div>
                </details>

                {/* What are you experiencing? */}
                <div className="space-y-2 mb-6">
                  <label className="text-sm font-bold text-[#1E2D42]">What are you experiencing?</label>
                  <div className="relative">
                    <Textarea
                      value={description}
                      placeholder="Describe what you're feeling in your own words..."
                      onChange={(e) => setDescription(e.target.value)}
                      onBlur={detectRegion}
                      className="min-h-[140px] bg-white border-[#E2E8F0] rounded-xl p-4 text-sm shadow-sm focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8]/40 resize-none w-full"
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 font-medium">
                      {description.length}/1000
                    </div>
                  </div>
                </div>

                {/* Region & Duration side-by-side */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#1E2D42]">Body Region</label>
                    <Select
                      value={bodyRegion}
                      onChange={(e) => setBodyRegion(e.target.value)}
                      className="w-full bg-white border-[#E2E8F0] rounded-xl text-sm font-medium shadow-sm h-[42px]"
                    >
                      {regions.map((r) => (
                        <option key={r.name} value={r.name}>{r.icon} {r.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#1E2D42]">Duration</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      </span>
                      <Select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full bg-white border-[#E2E8F0] rounded-xl text-sm font-medium shadow-sm pl-9 h-[42px]"
                      >
                        {durationOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Intensity Slider */}
                <div className="space-y-4 mb-8">
                  <label className="text-sm font-bold text-[#1E2D42]">Intensity: {intensity}/10</label>
                  <div className="relative pt-4 pb-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={intensity}
                      onChange={(e) => setIntensity(Number(e.target.value))}
                      className="w-full absolute top-1/2 -translate-y-1/2 h-full opacity-0 cursor-pointer z-20"
                    />
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-visible relative">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-pink-400 rounded-l-full relative" style={{ width: `${(intensity / 10) * 100}%` }}>
                         <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 bg-[#1B4FD8] rounded-full border-2 border-white shadow flex items-center justify-center text-white text-[10px] font-bold z-10">
                           {intensity}
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* What might be contributing? */}
                <div className="space-y-3 mb-8">
                  <label className="text-sm font-bold text-[#1E2D42]">What might be contributing?</label>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { label: "Recent stress", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, color: "text-purple-500" },
                      { label: "Changed sleep pattern", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>, color: "text-blue-500" },
                      { label: "New exercise routine", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>, color: "text-blue-400" },
                      { label: "Dietary changes", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z"/></svg>, color: "text-green-500" },
                      { label: "Weather changes", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.5 19C19.9853 19 22 16.9853 22 14.5C22 12.1332 20.1788 10.2036 17.8596 10.0211C17.3822 6.6111 14.4443 4 11 4C7.13401 4 4 7.13401 4 11C4 11.2952 4.01826 11.5861 4.05374 11.8719C2.28588 12.5028 1 14.2088 1 16.25C1 18.8734 3.12665 21 5.75 21H17.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 15L10 17L8 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 15L14 17L16 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, color: "text-blue-300" },
                      { label: "Travel recently", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>, color: "text-gray-500" },
                      { label: "Screen time increase", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>, color: "text-blue-600" },
                      { label: "Sitting for long periods", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 10v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7M5 10h14M12 2v8M9 5l3-3 3 3"/></svg>, color: "text-gray-400" },
                      { label: "Physical activity", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>, color: "text-indigo-500" },
                      { label: "Emotional changes", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, color: "text-red-500" },
                      { label: "Hydration concerns", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>, color: "text-blue-400" },
                      { label: "New environment", icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, color: "text-green-600" }
                    ].map((item) => {
                      const active = contextTags.includes(item.label);
                      return (
                        <button
                          key={item.label}
                          onClick={() => onToggleTag(item.label)}
                          className={`px-3 py-2.5 rounded-[10px] text-[11px] font-semibold transition-all border flex items-center gap-2 text-left shadow-sm ${
                            active 
                              ? 'bg-[#1B4FD8] text-white border-[#1B4FD8] ring-1 ring-[#1B4FD8]' 
                              : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#1B4FD8]/40 hover:bg-blue-50/30'
                          }`}
                        >
                          <span className={active ? 'text-white' : item.color}>{item.icon}</span>
                          <span className="leading-tight">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Get Insights Button */}
                <button
                  onClick={analyze}
                  disabled={loading || description.trim().length < 10}
                  className={`w-full py-4 rounded-xl font-bold shadow-[0_4px_15px_-3px_rgba(139,92,246,0.3)] transition-all text-white bg-gradient-to-r from-blue-600 to-purple-500 hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${loading ? 'animate-pulse' : ''}`}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z"/></svg>
                  {loading ? "Analyzing Symptoms..." : "Get Wellness Insights"}
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>

                <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1.5 font-medium">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Your information is private and secure
                </p>
              </div>
            </div>

            {/* Right Column: Selected Region Map */}
            <div className="xl:col-span-5 flex flex-col">
              <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-[#E2E8F0] flex-1 flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-center mb-8 relative z-10">
                  <h2 className="text-xl font-bold text-[#1E2D42] flex items-center gap-2">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Selected Region
                  </h2>
                  <button 
                    onClick={() => { setBodyRegion("General / Full Body"); setIntensity(5); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-full text-xs font-semibold border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    Reset
                  </button>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100 self-start mb-6 relative z-10">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  {bodyRegion}
                </div>

                {/* Map Area */}
                <div className="flex-1 relative flex items-center justify-center min-h-[400px]">
                  {/* Subtle Background glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-400/10 blur-[60px] rounded-full pointer-events-none"></div>
                  
                  {/* The SVG Man */}
                  <div className="relative z-10 w-full max-w-[200px] h-[400px] drop-shadow-xl text-blue-100 fill-blue-50 opacity-90 transition-all duration-300 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                    {buildBodySvg(selectedRegion)}
                  </div>

                  {/* Floating Tags (Absolutely positioned around the SVG) */}
                  {[
                    { id: "Head", label: "Head", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="5"/><path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2"/></svg>, top: "15%", left: "15%", line: "right" },
                    { id: "Chest", label: "Chest", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, top: "35%", right: "10%", line: "left" },
                    { id: "Arms", label: "Arms", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, top: "50%", left: "10%", line: "right" },
                    { id: "Abdomen", label: "Abdomen", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, top: "55%", right: "10%", line: "left" },
                    { id: "Legs", label: "Legs", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, top: "75%", left: "15%", line: "right" },
                    { id: "General / Full Body", label: "Full Body", icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21v-8a6.5 6.5 0 0 1 13 0v8"/><path d="M9 21v-4a3 3 0 0 1 6 0v4"/></svg>, top: "75%", right: "10%", line: "left", isFullBody: true },
                  ].map((part) => {
                    const isActive = bodyRegion === part.id || (part.isFullBody && bodyRegion.includes("Full Body"));
                    return (
                      <div key={part.id} className="absolute flex flex-col items-center gap-2 group z-20" style={{ top: part.top, left: part.left, right: part.right }}>
                        {/* Connecting Line (simulated with absolute div) */}
                        <div className={`absolute top-1/2 w-16 h-px border-b border-dashed border-gray-300 -z-10 ${part.line === 'right' ? 'left-8' : 'right-8'}`}></div>
                        
                        <button
                          onClick={() => setBodyRegion(part.id)}
                          className={`w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all ${
                            isActive 
                              ? 'bg-gradient-to-br from-white to-purple-50 text-purple-600 shadow-[0_0_20px_rgba(168,85,247,0.3)] border-2 border-purple-200 scale-110' 
                              : 'bg-white text-blue-500 border border-gray-200 shadow-sm hover:scale-105 hover:border-blue-300'
                          }`}
                        >
                          {part.icon}
                        </button>
                        <span className={`text-xs font-semibold ${isActive ? 'text-purple-700' : 'text-gray-500'}`}>{part.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex items-start gap-3 relative z-10">
                  <div className="text-blue-500 mt-0.5">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21h6M12 22V11M12 2a4 4 0 0 0-4 4c0 3 3 5 3 5s3-2 3-5a4 4 0 0 0-4-4z"/></svg>
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-blue-900 mb-1">Tip</h5>
                    <p className="text-xs text-blue-700/80 leading-relaxed">Select the area where you're experiencing discomfort or choose Full Body for general symptoms.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Area (Full Width Below) */}
          {(responseText || loading) && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-12 flex flex-col gap-6">
                <div className="bg-white rounded-[24px] shadow-sm border border-[#E2E8F0] flex-1 flex flex-col overflow-hidden">
                  <div className="p-6 md:p-8 border-b border-[#E2E8F0] bg-gradient-to-r from-white to-gray-50/50 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-[#1E2D42] flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1B4FD8] flex items-center justify-center shadow-inner">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      </div>
                      Wellness Insights
                    </h3>
                    {responseText && (
                      <Button variant="secondary" size="sm" onClick={exportCurrent} className="rounded-lg shadow-sm">
                        Export PDF
                      </Button>
                    )}
                  </div>
                  <div className="p-6 md:p-8 flex-1 overflow-y-auto bg-gradient-to-b from-transparent to-[#F8FAFC]/50 min-h-[300px]">
                    {responseText ? (
                      <div className="prose prose-blue max-w-none prose-headings:font-bold prose-h2:text-2xl prose-a:text-[#1B4FD8]">
                        <MarkdownReport text={responseText} />
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center">
                         <div className="flex gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                         </div>
                         <p className="text-sm font-semibold text-gray-500 mt-4">Generating personalized insights...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Doctors */}
                {suggestedDoctors.length > 0 && (
                  <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E2E8F0] animate-in slide-in-from-bottom-4 fade-in">
                    <h4 className="text-sm font-bold text-[#64748B] uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Recommended Specialists
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {suggestedDoctors.map((doc) => (
                        <div key={doc.id} className="p-4 rounded-[16px] border border-[#E2E8F0] hover:border-[#1B4FD8]/40 hover:bg-blue-50/20 transition-all flex flex-col gap-3 group">
                          <div>
                            <h5 className="font-bold text-[#1E2D42]">{doc.doctor_name}</h5>
                            <p className="text-sm text-[#1B4FD8] font-medium">{doc.department}</p>
                          </div>
                          <div className="flex gap-2 text-xs font-semibold">
                            <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md">Available</span>
                            {doc.consultation_fee && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md">Fee: ${doc.consultation_fee}</span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="w-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setNotice({ type: "success", message: `Opening Appointment Desk for ${doc.doctor_name}` });
                              onNavigate?.("registration", { prefillDoctor: { doctorName: doc.doctor_name, department: doc.department } });
                            }}
                          >
                            Book Appointment
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Docs Chat Section */}
      {activeSection === "documents" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 fade-in h-[800px]">
          {/* Docs Sidebar */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-[#DDE2EC] flex flex-col h-full">
            <h2 className="text-lg font-bold text-[#1E2D42] mb-1">Your Documents</h2>
            <p className="text-xs text-[#64748B] mb-6">Upload PDFs or images to chat with them.</p>
            
            <div className="rounded-2xl overflow-hidden border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-2 mb-6">
              <DocumentUploadDropzone
                accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                file={docUploadFile || undefined}
                helperText="15MB limit."
                disabled={docUploadLoading}
                onFileSelect={setDocUploadFile}
              />
              <div className="mt-2 text-center">
                <Button onClick={handleDocUpload} disabled={docUploadLoading || !docUploadFile} size="sm" className="w-full shadow-sm">
                  {docUploadLoading ? "Processing..." : "Upload"}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {symptomDocuments.length === 0 && <p className="text-sm text-center text-gray-400 py-10">No documents uploaded.</p>}
              {symptomDocuments.map(doc => (
                <div key={doc.id} className="p-3 bg-gray-50 border border-[#E2E8F0] rounded-xl flex items-center justify-between group hover:border-red-200 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1E2D42] truncate" title={doc.filename}>{doc.filename}</p>
                    <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => void handleDocDelete(doc.id)} className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 p-2 transition-opacity">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-8 bg-white rounded-3xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.05)] border border-[#DDE2EC] flex flex-col h-full overflow-hidden relative">
            <div className="px-8 py-5 border-b border-[#E2E8F0] flex justify-between items-center bg-white/80 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1B4FD8] to-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div>
                  <h3 className="font-bold text-[#1E2D42]">Document Assistant</h3>
                  <p className="text-xs text-[#64748B]">Chat with your uploaded medical files</p>
                </div>
              </div>
              <button onClick={handleClearChat} disabled={!chatMessages.length} className="text-xs font-semibold text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                Clear Chat
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 pt-24 space-y-6 bg-gradient-to-b from-[#F8FAFC] to-white">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-6 shadow-sm">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <h2 className="text-xl font-bold text-[#1E2D42] mb-2">How can I help you?</h2>
                  <p className="text-[#64748B]">Upload your files and I can extract data, answer questions, and summarize your medical documents.</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                    <div className={`max-w-[85%] rounded-3xl px-6 py-4 shadow-sm ${msg.role === 'user' ? 'bg-[#1B4FD8] text-white rounded-tr-sm' : 'bg-white border border-[#E2E8F0] text-[#1E2D42] rounded-tl-sm shadow-[0_4px_15px_-5px_rgba(0,0,0,0.05)]'}`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          </div>
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assistant</span>
                        </div>
                      )}
                      <div className={`prose max-w-none ${msg.role === 'user' ? 'text-white prose-p:text-white prose-headings:text-white' : 'prose-blue prose-headings:font-bold'}`}>
                        <MarkdownReport text={msg.content} />
                      </div>
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-[#E2E8F0] rounded-3xl rounded-tl-sm px-6 py-5 flex items-center gap-2 shadow-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-[#E2E8F0]">
              <div className="relative flex items-center">
                <textarea
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl pl-6 pr-16 py-4 focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8]/40 resize-none h-14 overflow-hidden transition-all shadow-inner text-[#1E2D42]"
                  placeholder="Ask a question..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!chatLoading && chatInput.trim()) void handleChatSend();
                    }
                  }}
                  disabled={chatLoading}
                />
                <button
                  onClick={handleChatSend}
                  disabled={chatLoading || !chatInput.trim()}
                  className="absolute right-2 top-2 bottom-2 aspect-square bg-[#1B4FD8] hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl flex items-center justify-center transition-colors shadow-md"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* About & Safety text pages */}
      {(activeSection === "about" || activeSection === "safety") && (
        <div className="max-w-3xl mx-auto mt-8 animate-in slide-in-from-bottom-4 fade-in">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.05)] border border-[#DDE2EC]">
            {activeSection === "about" ? (
              <div className="prose prose-blue max-w-none">
                <h2 className="text-3xl font-bold text-[#1E2D42] mb-6">About SymptoMap AI</h2>
                <p className="text-lg text-[#64748B] mb-8">Wellness education focused and intentionally non-diagnostic.</p>
                <div className="p-6 bg-blue-50 rounded-2xl text-blue-900 border border-blue-100 mb-8">
                  SymptoMap AI helps users understand body sensations in calm, everyday language. It provides educational context only and never replaces professional healthcare guidance.
                </div>
                <h3>What this tool does</h3>
                <ul className="space-y-2">
                  <li><span className="font-semibold text-blue-600">Explains sensations</span> in non-clinical language.</li>
                  <li><span className="font-semibold text-blue-600">Suggests gentle</span> self-care actions.</li>
                  <li><span className="font-semibold text-blue-600">Highlights body regions</span> for easier awareness.</li>
                  <li><span className="font-semibold text-blue-600">Keeps session history</span> locally in your browser.</li>
                </ul>
                <h3>What this tool does not do</h3>
                <ul className="space-y-2 text-red-700">
                  <li>Diagnose diseases or conditions.</li>
                  <li>Provide treatment plans or prescriptions.</li>
                  <li>Replace professional consultation.</li>
                </ul>
              </div>
            ) : (
              <div className="prose prose-blue max-w-none">
                <h2 className="text-3xl font-bold text-[#1E2D42] mb-6 flex items-center gap-3">
                  <span className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  </span>
                  Safety & Disclaimer
                </h2>
                <div className="p-6 bg-gray-50 rounded-2xl text-gray-700 border border-gray-200 mb-8 font-medium">
                  SymptoMap AI is not a medical device and not a healthcare provider. Information is educational only and should not be used as medical advice.
                </div>
                <h3 className="text-red-700">Emergency Guidance</h3>
                <div className="pl-4 border-l-4 border-red-500 py-2">
                  <ul className="mb-0">
                    <li>Call emergency services for severe pain, breathing difficulty, or urgent symptoms.</li>
                    <li>Do not rely on this app during emergencies.</li>
                  </ul>
                </div>
                <h3>When to consult a professional</h3>
                <ul>
                  <li>Symptoms persist or intensify.</li>
                  <li>Daily function is significantly impacted.</li>
                  <li>You are uncertain or concerned about your wellbeing.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Sidebar */}
      {historySidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in" onClick={() => setHistorySidebarOpen(false)} />
      )}
      <div className={`fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-[#E2E8F0] flex flex-col ${historySidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-start bg-gray-50">
          <div>
            <h3 className="font-bold text-xl text-[#1E2D42]">Session History</h3>
            <p className="text-xs text-[#64748B] mt-1">Local browser history only.</p>
          </div>
          <button onClick={() => setHistorySidebarOpen(false)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div className="p-4 flex gap-2 border-b border-gray-100">
          <Button variant="secondary" size="sm" onClick={exportAll} disabled={!history.length} className="flex-1">Export All</Button>
          <Button variant="secondary" size="sm" onClick={clearHistory} disabled={!history.length} className="text-red-600 hover:bg-red-50 hover:text-red-700">Clear</Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#F8FAFC]">
          {!history.length ? (
            <div className="text-center py-10 text-gray-400">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-3 opacity-50"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              History will appear after generating insights.
            </div>
          ) : (
            <>
              {history.slice(0, 10).map((entry) => (
                <button
                  key={entryKey(entry)}
                  onClick={() => restoreSession(entry)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${activeHistoryKey === entryKey(entry) ? 'bg-white border-[#1B4FD8] shadow-md ring-1 ring-[#1B4FD8]' : 'bg-white border-[#E2E8F0] hover:border-blue-300 hover:shadow-sm'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <strong className="text-[#1E2D42] text-sm font-bold">{entry.region}</strong>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${entry.intensity >= 8 ? 'bg-red-100 text-red-700' : entry.intensity >= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {entry.intensity}/10
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mb-2 line-clamp-2">{entry.description}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{new Date(entry.createdAt).toLocaleString()}</p>
                </button>
              ))}

              {trendItems.length >= 2 && (
                <div className="mt-8 p-6 bg-white rounded-3xl border border-[#E2E8F0] shadow-sm">
                  <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-4">Intensity Trend</p>
                  <div className="flex items-end h-24 gap-1">
                    {trendItems.map((item, index) => (
                      <div key={`${item.createdAt}-${index}`} className="flex-1 bg-gray-100 rounded-t-lg relative group h-full flex items-end">
                        <div 
                          className="w-full rounded-t-lg transition-all"
                          style={{ height: `${Math.max(10, item.intensity * 10)}%`, backgroundColor: intensityColor(item.intensity) }}
                        />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                          {item.intensity}/10
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-2 font-medium">
                    <span>Oldest</span>
                    <span>Latest</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
