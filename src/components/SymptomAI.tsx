import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import MarkdownReport from "../components/MarkdownReport";
import DocumentUploadDropzone from "../components/DocumentUploadDropzone";
import {
  Badge,
  Input,
  Label,
  Select,
  Textarea,
  Modal,
  ConfirmDialog,
} from "../components/ui";
import { Btn, Card, Table, TR, TD, StatusBadge } from "../components/shared";
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

const TAG_DETAILS: Record<string, { icon: string; bg: string; text: string; iconColor: string }> = {
  "Recent stress": { icon: "🧠", bg: "bg-purple-50", text: "text-purple-700", iconColor: "text-purple-500" },
  "Changed sleep pattern": { icon: "🌙", bg: "bg-blue-50", text: "text-blue-700", iconColor: "text-blue-500" },
  "New exercise routine": { icon: "🏃", bg: "bg-indigo-50", text: "text-indigo-700", iconColor: "text-indigo-500" },
  "Dietary changes": { icon: "🥗", bg: "bg-emerald-50", text: "text-emerald-700", iconColor: "text-emerald-500" },
  "Weather changes": { icon: "🌧️", bg: "bg-sky-50", text: "text-sky-700", iconColor: "text-sky-500" },
  "Travel recently": { icon: "✈️", bg: "bg-teal-50", text: "text-teal-700", iconColor: "text-teal-500" },
  "Screen time increase": { icon: "💻", bg: "bg-slate-50", text: "text-slate-700", iconColor: "text-slate-500" },
  "Sitting for long periods": { icon: "🪑", bg: "bg-amber-50", text: "text-amber-700", iconColor: "text-amber-500" },
  "Physical activity": { icon: "🏋️", bg: "bg-cyan-50", text: "text-cyan-700", iconColor: "text-cyan-500" },
  "Emotional changes": { icon: "❤️", bg: "bg-rose-50", text: "text-rose-700", iconColor: "text-rose-500" },
  "Hydration concerns": { icon: "💧", bg: "bg-blue-50", text: "text-blue-700", iconColor: "text-blue-500" },
  "New environment": { icon: "🌲", bg: "bg-green-50", text: "text-green-700", iconColor: "text-green-500" },
};

const FALLBACK_REGIONS: Region[] = [
  { name: "General / Full Body", keywords: [], color: "#3977c9", icon: "🧍", svg_id: "full_body" },
  { name: "Head & Face", keywords: ["head", "face", "eyes", "nose", "mouth", "ear", "brain"], color: "#5db6ed", icon: "🧠", svg_id: "head_face" },
  { name: "Neck & Throat", keywords: ["neck", "throat", "cervical"], color: "#a58de8", icon: "👤", svg_id: "neck_throat" },
  { name: "Shoulders", keywords: ["shoulder", "collarbone"], color: "#f6b65e", icon: "肩", svg_id: "shoulders" },
  { name: "Chest", keywords: ["chest", "lungs", "heart", "breast"], color: "#5db6ed", icon: "🫁", svg_id: "chest" },
  { name: "Upper Arm", keywords: ["bicep", "tricep", "arm"], color: "#58c8c6", icon: "💪", svg_id: "upper_arm" },
  { name: "Elbow", keywords: ["elbow"], color: "#a58de8", icon: "💪", svg_id: "elbow" },
  { name: "Forearm", keywords: ["forearm", "wrist"], color: "#78d89b", icon: "💪", svg_id: "forearm" },
  { name: "Hand & Fingers", keywords: ["hand", "finger", "thumb", "palm"], color: "#ef8ca9", icon: "🖐️", svg_id: "hand_fingers" },
  { name: "Abdomen", keywords: ["stomach", "belly", "abdomen", "gut", "stomachache"], color: "#78d89b", icon: "🌀", svg_id: "abdomen" },
  { name: "Pelvis / Groin", keywords: ["hip", "pelvis", "groin", "genital"], color: "#f6b65e", icon: "🩲", svg_id: "pelvis_groin" },
  { name: "Thigh", keywords: ["thigh", "quad", "hamstring"], color: "#5db6ed", icon: "🦵", svg_id: "thigh" },
  { name: "Knee", keywords: ["knee", "patella"], color: "#ef8ca9", icon: "🦵", svg_id: "knee" },
  { name: "Lower Leg (Calf)", keywords: ["calf", "shin", "lower leg"], color: "#58c8c6", icon: "🦵", svg_id: "lower_leg" },
  { name: "Ankle", keywords: ["ankle"], color: "#a58de8", icon: "🦶", svg_id: "ankle" },
  { name: "Foot & Toes", keywords: ["foot", "toe", "heel"], color: "#f6b65e", icon: "🦶", svg_id: "foot_toes" }
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

export default function SymptomAI() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [activeSection, setActiveSection] = useState<
    "home" | "documents" | "about" | "safety"
  >("home");
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
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
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      {notice && (
        <div className={`p-4 mx-6 mt-4 mb-2 rounded-md ${notice.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-blue-100 text-blue-800 border border-blue-200'} flex items-center justify-between`}>
          <span className="text-[12px] font-medium">{notice.message}</span>
          <button className="underline text-[11px] font-medium hover:text-black" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}
      {/* Header */}
      <div className="bg-white/85 backdrop-blur-md border-b border-[#DDE2EC] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1B4FD8] to-[#3B82F6] flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-[17px] font-bold text-gray-900 leading-tight">SymptoMap AI</h1>
            <p className="text-[12px] text-[#64748B]">Context-aware wellness insights and analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHistorySidebarOpen((prev) => !prev)}
            className="text-[12px] font-semibold text-[#1B4FD8] hover:bg-blue-50 px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 border border-blue-100"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7.5v5l3.5 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Session History
          </button>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-4">
        {/* Educational Notice Banner */}
        <div className="bg-amber-50/70 border border-amber-100/80 rounded-xl px-4 py-3 text-[12px] text-amber-800 flex items-center gap-2.5 shadow-sm">
          <span className="text-[14px]">⚠️</span>
          <span><strong>Educational tool only:</strong> SymptoMap AI provides wellness education and is not a substitute for medical advice, diagnosis, or treatment.</span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 mb-4 bg-gray-100/80 p-1 rounded-2xl w-fit border border-gray-200/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
          {[
            { id: "home", label: "Home" },
            { id: "documents", label: "Ask About Your Documents" },
            { id: "about", label: "About" },
            { id: "safety", label: "Safety" }
          ].map((t) => (
            <button key={t.id}
              onClick={() => {
                if (t.id === "documents") openDocumentsTab();
                else setActiveSection(t.id as any);
              }}
              className={`px-4.5 py-2 text-[12.5px] font-semibold transition-all rounded-xl whitespace-nowrap
              ${activeSection === t.id
                ? "text-blue-700 bg-white shadow-sm ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-800"}`}>
              {t.label}
            </button>
          ))}
        </div>

      {activeSection === "home" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
            
            {/* Left Panel: Describe Your Sensation */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.03)] flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F0EBF8] flex items-center justify-center text-[#7C3AED]">
                    <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-[17px] font-bold text-gray-900 leading-tight">Describe Your Sensation</h2>
                    <p className="text-[12px] text-gray-500 mt-0.5">Share more details so AI can generate personalized wellness insights.</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FAF5FF] text-[#7C3AED] border border-[#F3E8FF] uppercase tracking-wide">
                  ✨ AI-Powered
                </span>
              </div>

              {/* Collapsible Patient Information */}
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <details className="group">
                  <summary className="w-full px-4 py-3.5 bg-gray-50/50 hover:bg-gray-50 flex items-center justify-between cursor-pointer list-none select-none text-[13px] font-semibold text-gray-700 transition-colors">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Patient Information <span className="text-[11.5px] text-gray-400 font-normal">(Optional)</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="p-4 border-t border-[#E2E8F0] bg-white flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Label className="text-[12px] font-bold text-gray-700">
                        Age
                        <Input
                          value={patientInfo.age}
                          type="number"
                          min={1}
                          max={120}
                          className="mt-1"
                          placeholder="e.g. 35"
                          onChange={(e) =>
                            setPatientInfo((prev) => ({
                              ...prev,
                              age: e.target.value,
                            }))
                          }
                        />
                      </Label>
                      <Label className="text-[12px] font-bold text-gray-700">
                        Gender
                        <Select
                          value={patientInfo.gender}
                          className="mt-1"
                          onChange={(e) =>
                            setPatientInfo((prev) => ({
                              ...prev,
                              gender: e.target.value,
                            }))
                          }
                        >
                          <option>Not specified</option>
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </Select>
                      </Label>
                      <Label className="text-[12px] font-bold text-gray-700">
                        Temperature
                        <div className="flex gap-1.5 mt-1">
                          <Input
                            value={patientInfo.temperature}
                            type="number"
                            step="0.1"
                            placeholder="98.6"
                            className="flex-1"
                            onChange={(e) =>
                              setPatientInfo((prev) => ({
                                ...prev,
                                temperature: e.target.value,
                              }))
                            }
                          />
                          <Select
                            value={patientInfo.temp_unit}
                            className="w-20"
                            onChange={(e) =>
                              setPatientInfo((prev) => ({
                                ...prev,
                                temp_unit: e.target.value as "°F" | "°C",
                              }))
                            }
                          >
                            <option>°F</option>
                            <option>°C</option>
                          </Select>
                        </div>
                      </Label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Label className="text-[12px] font-bold text-gray-700">
                        Heart Rate (BPM)
                        <Input
                          value={patientInfo.heart_rate}
                          type="number"
                          min={30}
                          max={250}
                          className="mt-1"
                          placeholder="e.g. 72"
                          onChange={(e) =>
                            setPatientInfo((prev) => ({
                              ...prev,
                              heart_rate: e.target.value,
                            }))
                          }
                        />
                      </Label>
                      <Label className="text-[12px] font-bold text-gray-700">
                        Systolic BP
                        <Input
                          value={patientInfo.systolic}
                          type="number"
                          min={60}
                          max={250}
                          className="mt-1"
                          placeholder="e.g. 120"
                          onChange={(e) =>
                            setPatientInfo((prev) => ({
                              ...prev,
                              systolic: e.target.value,
                            }))
                          }
                        />
                      </Label>
                      <Label className="text-[12px] font-bold text-gray-700">
                        Diastolic BP
                        <Input
                          value={patientInfo.diastolic}
                          type="number"
                          min={30}
                          max={150}
                          className="mt-1"
                          placeholder="e.g. 80"
                          onChange={(e) =>
                            setPatientInfo((prev) => ({
                              ...prev,
                              diastolic: e.target.value,
                            }))
                          }
                        />
                      </Label>
                    </div>
                  </div>
                </details>
              </div>

              {/* Textarea Description */}
              <div className="flex flex-col gap-1.5 relative">
                <span className="text-[12.5px] font-bold text-gray-800">What are you experiencing?</span>
                <textarea
                  rows={4}
                  value={description}
                  placeholder="Describe what you're feeling in your own words..."
                  className="w-full bg-[#F8FAFC]/50 border border-[#E2E8F0] rounded-xl px-4 py-3 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400 resize-none"
                  maxLength={1000}
                  onChange={(event) => setDescription(event.target.value)}
                  onBlur={() => {
                    void detectRegion();
                  }}
                />
                <span className="absolute bottom-2.5 right-3 text-[10.5px] font-semibold text-gray-400">
                  {description.length}/1000
                </span>
              </div>

              {/* Body Region & Duration selects with custom icons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-bold text-gray-800">Body Region</span>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      👤
                    </span>
                    <select
                      value={bodyRegion}
                      onChange={(event) => setBodyRegion(event.target.value)}
                      className="w-full bg-[#F8FAFC]/50 border border-[#E2E8F0] rounded-xl pl-9 pr-4 py-3 text-[13.5px] font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                    >
                      {regions.map((region) => (
                        <option key={region.name} value={region.name}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-bold text-gray-800">Duration</span>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      📅
                    </span>
                    <select
                      value={duration}
                      onChange={(event) => setDuration(event.target.value)}
                      className="w-full bg-[#F8FAFC]/50 border border-[#E2E8F0] rounded-xl pl-9 pr-4 py-3 text-[13.5px] font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                    >
                      {durationOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Gradient Slider for Intensity */}
              <div className="flex flex-col gap-1.5 mt-2">
                <span className="text-[12.5px] font-bold text-gray-800">Intensity: {intensity}/10</span>
                <div className="relative mt-2.5 pb-2">
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 via-[#7C3AED] to-pink-500 rounded-full transition-all duration-100" 
                      style={{ width: `${(intensity / 10) * 100}%` }}
                    />
                  </div>
                  <input 
                    type="range"
                    min={1}
                    max={10}
                    value={intensity}
                    onChange={(e) => setIntensity(Number(e.target.value))}
                    className="absolute top-0 left-0 w-full h-1.5 opacity-0 cursor-pointer"
                  />
                  <div 
                    className="absolute -top-3 w-7 h-7 rounded-full bg-[#1B4FD8] text-white font-bold text-[12px] flex items-center justify-center border-2 border-white shadow-md transition-all duration-75 select-none pointer-events-none"
                    style={{ left: `calc(${(intensity / 10) * 100}% - 14px)` }}
                  >
                    {intensity}
                  </div>
                </div>
              </div>

              {/* What might be contributing? */}
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-[12.5px] font-bold text-gray-800">What might be contributing?</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {contextOptions.map((tag) => {
                    const selected = contextTags.includes(tag);
                    const tagInfo = TAG_DETAILS[tag] || { icon: "🩺", bg: "bg-gray-50", text: "text-gray-700", iconColor: "text-gray-400" };
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11.5px] font-semibold transition-all ${
                          selected 
                            ? "bg-[#F0F9FF] border-[#BAE6FD] text-[#0369A1] shadow-sm hover:bg-[#E0F2FE]" 
                            : "bg-[#F8FAFC]/30 border-[#E2E8F0] text-gray-700 hover:border-gray-300 hover:bg-[#F8FAFC]"
                        }`}
                        onClick={() => onToggleTag(tag)}
                      >
                        <span className={`text-[14px] ${tagInfo.iconColor}`}>{tagInfo.icon}</span>
                        <span className="truncate">{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gradient Sparkle Action Button */}
              <div className="mt-4 flex flex-col items-center gap-2">
                <button 
                  onClick={() => void analyze()} 
                  disabled={loading} 
                  className="w-full bg-gradient-to-r from-[#1B4FD8] to-[#9333EA] text-white font-semibold py-3.5 px-6 rounded-xl hover:shadow-[0_4px_16px_rgba(124,58,237,0.3)] transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between text-[14px]"
                >
                  <div className="w-5"></div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    {loading ? "Generating insights..." : "Get Wellness Insights"}
                  </div>
                  <svg className="w-4.5 h-4.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Your information is private and secure
                </div>
              </div>
            </div>

            {/* Right Panel: Selected Region / Body Map */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.03)] flex flex-col relative min-h-[500px]">
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h2 className="text-[15.5px] font-bold text-gray-950">Selected Region</h2>
                </div>
                <button 
                  onClick={() => setBodyRegion("General / Full Body")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[11.5px] font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                  </svg>
                  Reset
                </button>
              </div>

              {/* Selection Badge with Hover Indicator */}
              <div className="mb-4 flex items-center justify-between h-9">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-blue-100 bg-[#EFF6FF] text-blue-700 text-[12.5px] font-bold shadow-sm">
                  {selectedRegion.icon} {selectedRegion.name}
                </span>
                {hoveredRegion && hoveredRegion !== bodyRegion && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-[#475569] text-[11px] font-bold animate-pulse shadow-sm">
                    🔍 Hovering: {hoveredRegion}
                  </span>
                )}
              </div>

              {/* Anatomy Selector Hero Area */}
              <div className="relative rounded-2xl bg-[radial-gradient(circle_at_50%_40%,rgba(53,141,255,0.08),transparent_48%)] bg-gradient-to-b from-[#fbfdff] to-[#f5f9fe] border border-[#e8eef7] py-6 flex justify-center items-center overflow-hidden min-h-[460px]">
                
                {/* Interactive Human Body built entirely with SVG */}
                <svg viewBox="0 0 430 650" aria-label="Interactive human body selector" role="img" className="w-[85%] max-h-[430px] overflow-visible select-none">
                  <defs>
                    <filter id="softShadow">
                      <feDropShadow dx="0" dy="8" stdDeviation="7" floodOpacity=".13"/>
                    </filter>
                  </defs>

                  {/* head */}
                  <ellipse 
                    className={`part blue2 ${bodyRegion === "Head & Face" || hoveredRegion === "Head & Face" ? "selected" : ""}`} 
                    cx="215" cy="67" rx="42" ry="50" 
                    filter="url(#softShadow)" 
                    onClick={() => setBodyRegion("Head & Face")}
                    onMouseEnter={() => setHoveredRegion("Head & Face")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Head &amp; Face</title>
                  </ellipse>
                  
                  {/* neck */}
                  <rect 
                    className={`part purple ${bodyRegion === "Neck & Throat" || hoveredRegion === "Neck & Throat" ? "selected" : ""}`} 
                    x="195" y="112" width="40" height="38" rx="10" 
                    onClick={() => setBodyRegion("Neck & Throat")}
                    onMouseEnter={() => setHoveredRegion("Neck & Throat")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Neck &amp; Throat</title>
                  </rect>
                  
                  {/* shoulders */}
                  <path 
                    className={`part orange ${bodyRegion === "Shoulders" || hoveredRegion === "Shoulders" ? "selected" : ""}`} 
                    d="M171 141 Q146 145 127 168 L150 199 L184 179 Z" 
                    onClick={() => setBodyRegion("Shoulders")}
                    onMouseEnter={() => setHoveredRegion("Shoulders")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Shoulders</title>
                  </path>
                  <path 
                    className={`part orange ${bodyRegion === "Shoulders" || hoveredRegion === "Shoulders" ? "selected" : ""}`} 
                    d="M259 141 Q284 145 303 168 L280 199 L246 179 Z" 
                    onClick={() => setBodyRegion("Shoulders")}
                    onMouseEnter={() => setHoveredRegion("Shoulders")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Shoulders</title>
                  </path>
                  
                  {/* chest */}
                  <path 
                    className={`part blue ${bodyRegion === "Chest" || hoveredRegion === "Chest" ? "selected" : ""}`} 
                    d="M180 143 Q215 132 250 143 L269 205 Q263 235 238 245 L192 245 Q167 235 161 205 Z" 
                    onClick={() => setBodyRegion("Chest")}
                    onMouseEnter={() => setHoveredRegion("Chest")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Chest</title>
                  </path>
                  
                  {/* upper arms */}
                  <path 
                    className={`part cyan ${bodyRegion === "Upper Arm" || hoveredRegion === "Upper Arm" ? "selected" : ""}`} 
                    d="M127 168 Q113 181 112 216 L119 283 Q122 297 137 294 L151 289 L151 207 L150 199 Z" 
                    onClick={() => setBodyRegion("Upper Arm")}
                    onMouseEnter={() => setHoveredRegion("Upper Arm")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Upper Arm</title>
                  </path>
                  <path 
                    className={`part cyan ${bodyRegion === "Upper Arm" || hoveredRegion === "Upper Arm" ? "selected" : ""}`} 
                    d="M303 168 Q317 181 318 216 L311 283 Q308 297 293 294 L279 289 L279 207 L280 199 Z" 
                    onClick={() => setBodyRegion("Upper Arm")}
                    onMouseEnter={() => setHoveredRegion("Upper Arm")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Upper Arm</title>
                  </path>
                  
                  {/* elbows */}
                  <rect 
                    className={`part purple ${bodyRegion === "Elbow" || hoveredRegion === "Elbow" ? "selected" : ""}`} 
                    x="118" y="283" width="33" height="29" rx="10" 
                    onClick={() => setBodyRegion("Elbow")}
                    onMouseEnter={() => setHoveredRegion("Elbow")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Elbow</title>
                  </rect>
                  <rect 
                    className={`part purple ${bodyRegion === "Elbow" || hoveredRegion === "Elbow" ? "selected" : ""}`} 
                    x="279" y="283" width="33" height="29" rx="10" 
                    onClick={() => setBodyRegion("Elbow")}
                    onMouseEnter={() => setHoveredRegion("Elbow")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Elbow</title>
                  </rect>
                  
                  {/* forearms */}
                  <path 
                    className={`part green ${bodyRegion === "Forearm" || hoveredRegion === "Forearm" ? "selected" : ""}`} 
                    d="M119 308 L151 307 L147 391 Q143 402 128 398 L112 388 Z" 
                    onClick={() => setBodyRegion("Forearm")}
                    onMouseEnter={() => setHoveredRegion("Forearm")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Forearm</title>
                  </path>
                  <path 
                    className={`part green ${bodyRegion === "Forearm" || hoveredRegion === "Forearm" ? "selected" : ""}`} 
                    d="M311 308 L279 307 L283 391 Q287 402 302 398 L318 388 Z" 
                    onClick={() => setBodyRegion("Forearm")}
                    onMouseEnter={() => setHoveredRegion("Forearm")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Forearm</title>
                  </path>
                  
                  {/* hands */}
                  <path 
                    className={`part pink ${bodyRegion === "Hand & Fingers" || hoveredRegion === "Hand & Fingers" ? "selected" : ""}`} 
                    d="M111 386 Q128 376 147 391 L145 422 Q139 439 126 443 L109 427 L104 402 Z" 
                    onClick={() => setBodyRegion("Hand & Fingers")}
                    onMouseEnter={() => setHoveredRegion("Hand & Fingers")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Hand &amp; Fingers</title>
                  </path>
                  <path 
                    className={`part pink ${bodyRegion === "Hand & Fingers" || hoveredRegion === "Hand & Fingers" ? "selected" : ""}`} 
                    d="M319 386 Q302 376 283 391 L285 422 Q291 439 304 443 L321 427 L326 402 Z" 
                    onClick={() => setBodyRegion("Hand & Fingers")}
                    onMouseEnter={() => setHoveredRegion("Hand & Fingers")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Hand &amp; Fingers</title>
                  </path>
                  
                  {/* abdomen */}
                  <path 
                    className={`part green ${bodyRegion === "Abdomen" || hoveredRegion === "Abdomen" ? "selected" : ""}`} 
                    d="M181 239 Q215 247 249 239 L257 322 Q252 340 237 345 L193 345 Q178 340 173 322 Z" 
                    onClick={() => setBodyRegion("Abdomen")}
                    onMouseEnter={() => setHoveredRegion("Abdomen")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Abdomen</title>
                  </path>
                  
                  {/* pelvis */}
                  <path 
                    className={`part orange ${bodyRegion === "Pelvis / Groin" || hoveredRegion === "Pelvis / Groin" ? "selected" : ""}`} 
                    d="M174 322 L256 322 L265 366 Q245 383 215 386 Q185 383 165 366 Z" 
                    onClick={() => setBodyRegion("Pelvis / Groin")}
                    onMouseEnter={() => setHoveredRegion("Pelvis / Groin")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Pelvis / Groin</title>
                  </path>
                  
                  {/* thighs */}
                  <path 
                    className={`part blue ${bodyRegion === "Thigh" || hoveredRegion === "Thigh" ? "selected" : ""}`} 
                    d="M166 363 Q190 377 207 384 L203 476 Q197 493 178 493 L156 474 L151 396 Z" 
                    onClick={() => setBodyRegion("Thigh")}
                    onMouseEnter={() => setHoveredRegion("Thigh")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Thigh</title>
                  </path>
                  <path 
                    className={`part blue ${bodyRegion === "Thigh" || hoveredRegion === "Thigh" ? "selected" : ""}`} 
                    d="M264 363 Q240 377 223 384 L227 476 Q233 493 252 493 L274 474 L279 396 Z" 
                    onClick={() => setBodyRegion("Thigh")}
                    onMouseEnter={() => setHoveredRegion("Thigh")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Thigh</title>
                  </path>
                  
                  {/* knees */}
                  <ellipse 
                    className={`part pink ${bodyRegion === "Knee" || hoveredRegion === "Knee" ? "selected" : ""}`} 
                    cx="181" cy="492" rx="27" ry="26" 
                    onClick={() => setBodyRegion("Knee")}
                    onMouseEnter={() => setHoveredRegion("Knee")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Knee</title>
                  </ellipse>
                  <ellipse 
                    className={`part pink ${bodyRegion === "Knee" || hoveredRegion === "Knee" ? "selected" : ""}`} 
                    cx="249" cy="492" rx="27" ry="26" 
                    onClick={() => setBodyRegion("Knee")}
                    onMouseEnter={() => setHoveredRegion("Knee")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Knee</title>
                  </ellipse>
                  
                  {/* calves */}
                  <path 
                    className={`part cyan ${bodyRegion === "Lower Leg (Calf)" || hoveredRegion === "Lower Leg (Calf)" ? "selected" : ""}`} 
                    d="M157 514 Q174 523 198 514 L202 600 Q197 614 178 612 L155 598 Z" 
                    onClick={() => setBodyRegion("Lower Leg (Calf)")}
                    onMouseEnter={() => setHoveredRegion("Lower Leg (Calf)")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Lower Leg (Calf)</title>
                  </path>
                  <path 
                    className={`part cyan ${bodyRegion === "Lower Leg (Calf)" || hoveredRegion === "Lower Leg (Calf)" ? "selected" : ""}`} 
                    d="M273 514 Q256 523 232 514 L228 600 Q233 614 252 612 L275 598 Z" 
                    onClick={() => setBodyRegion("Lower Leg (Calf)")}
                    onMouseEnter={() => setHoveredRegion("Lower Leg (Calf)")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Lower Leg (Calf)</title>
                  </path>
                  
                  {/* ankles */}
                  <rect 
                    className={`part purple ${bodyRegion === "Ankle" || hoveredRegion === "Ankle" ? "selected" : ""}`} 
                    x="157" y="598" width="45" height="22" rx="8" 
                    onClick={() => setBodyRegion("Ankle")}
                    onMouseEnter={() => setHoveredRegion("Ankle")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Ankle</title>
                  </rect>
                  <rect 
                    className={`part purple ${bodyRegion === "Ankle" || hoveredRegion === "Ankle" ? "selected" : ""}`} 
                    x="228" y="598" width="45" height="22" rx="8" 
                    onClick={() => setBodyRegion("Ankle")}
                    onMouseEnter={() => setHoveredRegion("Ankle")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Ankle</title>
                  </rect>
                  
                  {/* feet */}
                  <path 
                    className={`part orange ${bodyRegion === "Foot & Toes" || hoveredRegion === "Foot & Toes" ? "selected" : ""}`} 
                    d="M157 615 Q180 610 202 617 L210 634 Q192 646 163 640 Q150 633 157 615 Z" 
                    onClick={() => setBodyRegion("Foot & Toes")}
                    onMouseEnter={() => setHoveredRegion("Foot & Toes")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Foot &amp; Toes</title>
                  </path>
                  <path 
                    className={`part orange ${bodyRegion === "Foot & Toes" || hoveredRegion === "Foot & Toes" ? "selected" : ""}`} 
                    d="M273 615 Q250 610 228 617 L220 634 Q238 646 267 640 Q280 633 273 615 Z" 
                    onClick={() => setBodyRegion("Foot & Toes")}
                    onMouseEnter={() => setHoveredRegion("Foot & Toes")}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <title>Foot &amp; Toes</title>
                  </path>
                </svg>
              </div>

              {/* Regions Buttons Grid underneath */}
              <div className="grid grid-cols-2 gap-2 mt-4 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                {regions.map((r) => {
                  const active = bodyRegion === r.name;
                  return (
                    <button
                      key={r.name}
                      onClick={() => setBodyRegion(r.name)}
                      onMouseEnter={() => setHoveredRegion(r.name)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      className={`flex items-center gap-2.5 w-full p-2.5 rounded-xl border text-[12px] font-bold text-left transition-all ${
                        active
                          ? "bg-[#edf6ff] border-[#9ecbfa] text-[#075dc4] shadow-sm"
                          : "bg-white border-[#e3ebf5] text-[#263e60] hover:border-[#b9d8fa] hover:bg-[#f7fbff]"
                      }`}
                    >
                      <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-[13px] font-black ${
                        active ? "bg-[#d8ecff] text-[#075dc4]" : "bg-[#eef5fd] text-[#2278d5]"
                      }`}>
                        {r.icon}
                      </span>
                      <span className="truncate">{r.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tip Banner at the Bottom */}
              <div className="mt-4 bg-[#EFF6FF] border border-blue-100 rounded-xl p-3.5 flex items-start gap-2.5 shadow-sm">
                <span className="text-[16px] text-blue-500 mt-0.5">💡</span>
                <div>
                  <h4 className="text-[12.5px] font-bold text-blue-800">Tip</h4>
                  <p className="text-[11.5px] text-blue-700 mt-0.5 leading-relaxed">
                    Select the area where you're experiencing discomfort or choose Full Body for general symptoms.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {responseText && (
            <div className="flex flex-col gap-4">
              <Card title="Wellness Insights" actions={
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{bodyRegion}</Badge>
                  <span className="px-2 py-0.5 rounded text-white text-xs font-bold" style={{ backgroundColor: intensityColor(intensity) }}>
                    {intensity}/10
                  </span>
                </div>
              }>
                <div className="prose prose-sm max-w-none text-gray-800">
                  <MarkdownReport text={responseText} />
                </div>
                <div className="mt-4 flex justify-end">
                  <Btn variant="secondary" onClick={() => void exportCurrent()}>
                    Download Insight
                  </Btn>
                </div>
              </Card>

              <Card title="Suggested Doctors (Administrative Department)">
                <div className="text-[11.5px] text-[#64748B] mb-4">
                  <span>👨‍⚕️</span> Based on your AI assessment for <strong>{bodyRegion}</strong>, here are available specialist doctors added by the Administrative department:
                </div>
                
                {suggestedDoctors.length === 0 ? (
                  <div className="text-[#94A3B8] text-[12px] p-6 text-center border-2 border-dashed border-[#E2E8F0] rounded">
                    No specialist doctors currently listed for this department.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suggestedDoctors.map((doc) => (
                      <div key={doc.id} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
                        <div>
                          <h4 className="text-[14px] font-semibold text-gray-900 m-0">{doc.doctor_name}</h4>
                          <p className="text-[12px] text-gray-500 my-1">
                            Department: <strong>{doc.department}</strong>
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant={doc.status === "available" ? "secondary" : "outline"}>
                              {doc.status || "available"}
                            </Badge>
                            {doc.consultation_fee ? (
                              <Badge variant="outline">Fee: ${doc.consultation_fee}</Badge>
                            ) : null}
                          </div>
                        </div>
                        <Btn
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setNotice({
                              type: "success",
                              message: `Opening Appointment Desk for ${doc.doctor_name} (${doc.department})`,
                            });
                            console.log("Navigate to registration", {
                              prefillDoctor: {
                                doctorName: doc.doctor_name,
                                department: doc.department,
                              },
                            });
                          }}
                        >
                          Book Appointment with {doc.doctor_name}
                        </Btn>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {activeSection === "documents" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.1fr] gap-6">
          
          {/* Left Column: Upload Dropzone & Files List */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.025)] flex flex-col gap-5">
            <div>
              <h2 className="text-[16.5px] font-bold text-gray-950 mb-1">Knowledge Source</h2>
              <div className="text-[12.5px] text-[#64748B] leading-relaxed">
                Add medical records, lab reports, or health logs to build your custom private knowledge base.
              </div>
            </div>
            
            <div className="flex flex-col gap-4 mt-1">
              <div className="p-1.5 rounded-2xl bg-slate-50/50 border border-dashed border-slate-200 shadow-inner">
                <DocumentUploadDropzone
                  accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                  file={docUploadFile || undefined}
                  helperText="Supports PDF, DOCX, TXT, MD, or images (Max 15MB)."
                  disabled={docUploadLoading}
                  onFileSelect={setDocUploadFile}
                />
              </div>
              <button 
                onClick={() => void handleDocUpload()} 
                disabled={docUploadLoading || !docUploadFile}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-xl hover:shadow-[0_4px_12px_rgba(37,99,235,0.15)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-[13px] flex items-center justify-center gap-1.5"
              >
                {docUploadLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing source...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload &amp; Analyze
                  </>
                )}
              </button>

              <div className="flex flex-col gap-3.5 mt-4">
                <h4 className="text-[13px] font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                  <svg className="w-4.5 h-4.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Uploaded Materials
                  {symptomDocuments.length > 0 && (
                    <span className="ml-auto text-[10.5px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-extrabold">{symptomDocuments.length}</span>
                  )}
                </h4>
                {symptomDocuments.length === 0 ? (
                  <div className="p-5 rounded-xl border border-dashed border-gray-200 text-center text-[12.5px] text-gray-400 bg-gray-50/30">
                    No documents uploaded yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                    {symptomDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-white border border-[#E2E8F0] p-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:shadow-md hover:border-blue-200 transition-all group">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 text-[16px] flex-shrink-0">
                            📄
                          </span>
                          <div className="flex flex-col min-w-0">
                            <p className="text-[12.5px] font-bold text-gray-900 truncate" title={doc.filename}>
                              {doc.filename}
                            </p>
                            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{new Date(doc.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button 
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          onClick={() => void handleDocDelete(doc.id)}
                          aria-label="Delete document"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Chat With Your Documents */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.025)] flex flex-col min-h-[560px]">
            <div className="mb-4">
              <h2 className="text-[16.5px] font-bold text-gray-950 mb-1">Knowledge Assistant</h2>
              <div className="text-[12.5px] text-[#64748B] leading-relaxed">
                Interact dynamically and extract warnings, highlights, or summaries grounded strictly in your uploaded materials.
              </div>
            </div>
            
            <div className="flex-1 flex flex-col bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.03),transparent_60%)] bg-[#F8FAFC]/40 border border-[#E2E8F0] rounded-2xl overflow-hidden mt-2 relative">
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 custom-scrollbar relative z-10">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-blue-500 border border-gray-100">
                      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="currentColor">
                         <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
                      </svg>
                    </div>
                    <h4 className="text-[13.5px] font-bold text-gray-800">Start the conversation</h4>
                    <p className="text-[12px] text-gray-400 mt-1 max-w-[280px] leading-relaxed">Upload medical documents on the left panel, then ask any medical or general wellness question.</p>
                  </div>
                ) : (
                  chatMessages.map((message, index) => (
                    <div key={index} className={`flex flex-col max-w-[85%] ${message.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 px-1 ${message.role === 'user' ? 'text-blue-600' : 'text-slate-400'}`}>
                        {message.role === "user" ? "You" : "AI Assistant"}
                      </span>
                      <div className={`p-4 text-[13px] leading-relaxed shadow-sm ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-blue-500/10' 
                          : 'bg-white border border-gray-150 text-gray-800 rounded-2xl rounded-tl-sm markdown-body'
                      }`}>
                        <MarkdownReport text={message.content} />
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="self-start items-start flex flex-col max-w-[85%]">
                     <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 px-1">AI Assistant</span>
                     <div className="p-4 bg-white border border-gray-150 shadow-sm rounded-2xl rounded-tl-sm flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                       <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.15s' }} />
                       <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.3s' }} />
                     </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-white border-t border-[#E2E8F0] flex flex-col gap-3 relative z-10">
                <div className="flex gap-3">
                  <input
                    value={chatInput}
                    placeholder={symptomDocuments.length === 0 ? "Upload documents first to start chat..." : "Ask a question about your documents..."}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !chatLoading && chatInput.trim()) {
                        event.preventDefault();
                        void handleChatSend();
                      }
                    }}
                    disabled={chatLoading || symptomDocuments.length === 0}
                    className="flex-1 text-[13.5px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-450"
                  />
                  <button 
                    onClick={() => void handleChatSend()} 
                    disabled={chatLoading || !chatInput.trim() || symptomDocuments.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-5 rounded-xl font-bold transition-colors disabled:opacity-100 disabled:cursor-not-allowed shadow-sm flex items-center justify-center text-[13px] gap-1.5"
                  >
                    Send
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
                {chatMessages.length > 0 && (
                  <div className="flex justify-start">
                    <button 
                      className="text-[11px] font-bold text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50" 
                      onClick={() => void handleClearChat()} 
                      disabled={!chatMessages.length}
                    >
                      Clear Chat History
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeSection === "about" && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-[0_4px_24px_rgba(15,23,42,0.025)] max-w-4xl mx-auto">
          <div className="mb-6 flex items-center gap-3.5 border-b border-gray-100 pb-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
              <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[17.5px] font-bold text-gray-950">About SymptoMap AI</h2>
              <div className="text-[12.5px] text-[#64748B] mt-0.5">
                Wellness education focused and intentionally non-diagnostic.
              </div>
            </div>
          </div>
          
          <div className="prose prose-sm max-w-none text-gray-750 leading-relaxed">
            <p className="text-[13.5px]">
              SymptoMap AI helps users understand body sensations in calm,
              everyday language. It provides educational context only and
              never replaces professional healthcare guidance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:-translate-y-0.5 transition-all">
                <h4 className="text-[14.5px] font-bold text-gray-900 mb-3.5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 text-[12px] flex items-center justify-center font-bold">✓</span>
                  What this tool does
                </h4>
                <ul className="space-y-2.5 text-[13px] text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    Explains sensations in non-clinical language.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    Suggests gentle self-care actions.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    Highlights body regions for easier awareness.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    Keeps session history locally in your browser.
                  </li>
                </ul>
              </div>
              
              <div className="bg-white p-5 rounded-2xl border border-red-100/80 shadow-[0_2px_12px_rgba(239,68,68,0.02)] hover:-translate-y-0.5 transition-all">
                <h4 className="text-[14.5px] font-bold text-red-900 mb-3.5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-red-50 text-red-600 text-[12px] flex items-center justify-center font-bold">✗</span>
                  What this tool does not do
                </h4>
                <ul className="space-y-2.5 text-[13px] text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-red-300 mt-1">•</span>
                    Diagnose diseases or conditions.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-300 mt-1">•</span>
                    Provide treatment plans or prescriptions.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-300 mt-1">•</span>
                    Replace professional consultation.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === "safety" && (
        <div className="bg-white border border-red-100 rounded-2xl p-8 shadow-[0_4px_24px_rgba(239,68,68,0.025)] max-w-4xl mx-auto relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
          <div className="mb-6 flex items-center gap-3.5 border-b border-gray-100 pb-4">
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shadow-inner">
              <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[17.5px] font-bold text-red-900">Safety and Disclaimer</h2>
              <div className="text-[12.5px] text-red-700/80 mt-0.5">
                Please read this carefully before using SymptoMap AI.
              </div>
            </div>
          </div>
          
          <div className="prose prose-sm max-w-none">
            <div className="bg-red-50/50 text-red-950 border border-red-100 p-4.5 rounded-2xl text-[13.5px] font-semibold leading-relaxed shadow-sm">
              SymptoMap AI is not a medical device and not a healthcare
              provider. Information is educational only and should not be used
              as medical advice.
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div>
                <h4 className="text-[14.5px] font-bold mb-3 text-red-800 border-b border-red-50 pb-2 flex items-center gap-2">
                  <span className="text-[16px]">🚨</span> Emergency Guidance
                </h4>
                <ul className="space-y-2.5 text-[13px] text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    Call emergency services immediately for severe chest pain, breathing difficulty, or other urgent symptoms.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    Do not rely on this app or wait for AI analysis during medical emergencies.
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-[14.5px] font-bold mb-3 text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                  <span className="text-[16px]">👨‍⚕️</span> Clinical Consultation
                </h4>
                <ul className="space-y-2.5 text-[13px] text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    Consult a licensed professional if your symptoms persist or intensify over time.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    Consult if daily functioning is significantly impacted, or if you are uncertain about your wellbeing.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {historySidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setHistorySidebarOpen(false)}
          aria-label="Close history panel"
        />
      )}
      <aside
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-[#DDE2EC] flex flex-col ${
          historySidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Session history panel"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#DDE2EC] bg-[#F8FAFC]">
          <div>
            <h3 className="font-semibold text-gray-900 text-[14px]">Session History</h3>
            <p className="text-[11px] text-gray-500">Local browser history only.</p>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            onClick={() => setHistorySidebarOpen(false)}
            aria-label="Close history panel"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="p-4 border-b border-[#DDE2EC] flex gap-2 justify-center">
          <Btn
            variant="secondary"
            size="sm"
            onClick={() => void exportAll()}
            disabled={!history.length}
          >
            Export All
          </Btn>
          <Btn
            variant="ghost"
            size="sm"
            onClick={() => void clearHistory()}
            disabled={!history.length}
          >
            Clear
          </Btn>
        </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {!history.length && (
            <p className="text-center text-gray-400 text-[12px] mt-8 italic">
              History will appear after generating insights.
            </p>
          )}
          {!!history.length && (
            <div className="flex flex-col gap-2">
              {history.slice(0, 10).map((entry) => (
                <button
                  key={entryKey(entry)}
                  type="button"
                  className={`text-left p-3 rounded border transition-colors flex items-center justify-between group ${
                    activeHistoryKey === entryKey(entry)
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-[#E2E8F0] hover:border-blue-300 hover:bg-[#F8FAFC]"
                  }`}
                  onClick={() => restoreSession(entry)}
                  aria-label={`Open session from ${new Date(entry.createdAt).toLocaleString()}`}
                >
                  <div className="flex flex-col gap-1">
                    <strong className="text-[13px] text-gray-800">{entry.region}</strong>
                    <p className="text-[10px] text-gray-500 font-mono">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="group-hover:bg-blue-100">{entry.intensity}/10</Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {trendItems.length >= 2 && (
          <div className="p-4 bg-gray-50 border-t border-[#DDE2EC]">
            <p className="text-[11px] text-gray-500 font-medium mb-3 uppercase tracking-wider text-center">Intensity Trend (oldest to latest)</p>
            <div className="flex items-end justify-center gap-1.5 h-16">
              {trendItems.map((item, index) => (
                <div
                  key={`${item.createdAt}-${index}`}
                  className="w-4 bg-gray-200 rounded-t overflow-hidden relative group"
                  title={`${item.intensity}/10`}
                >
                  <div
                    className="absolute bottom-0 w-full rounded-t transition-all"
                    style={{
                      height: `${Math.max(10, item.intensity * 10)}%`,
                      backgroundColor: intensityColor(item.intensity),
                    }}
                  />
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none transition-opacity">
                    {item.intensity}/10
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
