import { API_BASE } from "./constants";
import type { Notice } from "../types";
import { ErDatabase } from "../services/erDb";

const HOSPITAL_CODE_KEY = "hospai_hospital_code";
const DEFAULT_HOSPITAL_CODE = "hosp-default";

export function getHospitalCode(): string {
  if (typeof window === "undefined") return DEFAULT_HOSPITAL_CODE;
  const stored = (window.localStorage.getItem(HOSPITAL_CODE_KEY) || "").trim().toLowerCase();
  return stored || DEFAULT_HOSPITAL_CODE;
}

export function setHospitalCode(hospitalCode: string): void {
  if (typeof window === "undefined") return;
  const normalized = (hospitalCode || "").trim().toLowerCase() || DEFAULT_HOSPITAL_CODE;
  window.localStorage.setItem(HOSPITAL_CODE_KEY, normalized);
}

export function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Robust mock handler for ER & Hospital data when backend is in standalone mode
 */
async function handleLocalErMock<T = any>(path: string, options: RequestInit = {}): Promise<T | null> {
  const method = (options.method || "GET").toUpperCase();
  const url = new URL(path, "http://localhost");
  const pathname = url.pathname;
  const body = options.body ? (typeof options.body === "string" ? JSON.parse(options.body) : options.body) : {};

  // GET /api/er/triage-config
  if (pathname === "/api/er/triage-config" && method === "GET") {
    return { categories: ErDatabase.getCategories() } as T;
  }

  // POST /api/er/triage-config
  if (pathname === "/api/er/triage-config" && method === "POST") {
    const cat = ErDatabase.saveCategory(body);
    return { category: cat } as T;
  }

  // GET /api/er/visits
  if (pathname === "/api/er/visits" && method === "GET") {
    const activeOnly = url.searchParams.get("active_only") === "true";
    const status = url.searchParams.get("status");
    const filter = activeOnly ? "active" : status === "closed" ? "closed" : "all";
    return { visits: ErDatabase.getVisits(filter) } as T;
  }

  // GET /api/er/visits/:id
  const visitDetailMatch = pathname.match(/^\/api\/er\/visits\/(\d+)$/);
  if (visitDetailMatch && method === "GET") {
    const visitId = parseInt(visitDetailMatch[1]);
    const visit = ErDatabase.getVisit(visitId);
    if (!visit) throw new Error("ER visit not found");
    return visit as T;
  }

  // POST /api/er/register-patient (Direct ER Patient Registration)
  if (pathname === "/api/er/register-patient" && method === "POST") {
    const { patient: pData, visit: vData, complaint: cData, vitals: vtData } = body;
    const res = await ErDatabase.createVisit({
      patientDetails: pData,
      arrivalMode: vData?.arrival_mode,
      conditionAtArrival: vData?.condition_at_arrival,
      policeInvolved: vData?.police_involved,
      complaintText: cData?.[0]?.complaint,
      caseCategory: cData?.[0]?.case_category,
      vitals: vtData,
    });
    return {
      patient_id: res.patient?.patient_id || `P-${res.visit.id}`,
      patient: res.patient,
      visit: { id: res.visit.id, visit_no: res.visit.visit_no },
    } as T;
  }

  // POST /api/er/visits (Existing or Unknown Patient)
  if (pathname === "/api/er/visits" && method === "POST") {
    const res = await ErDatabase.createVisit({
      patientId: body.patient_id,
      isUnknown: body.is_unknown_patient,
      unknownLabel: body.unknown_patient_label,
      arrivalMode: body.arrival_mode,
      conditionAtArrival: body.condition_at_arrival,
      policeInvolved: body.police_involved,
    });
    return { id: res.visit.id, visit_no: res.visit.visit_no } as T;
  }

  // POST /api/er/visits/:id/complaints
  const complaintsMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/complaints$/);
  if (complaintsMatch && method === "POST") {
    const visitId = parseInt(complaintsMatch[1]);
    const c = ErDatabase.addComplaint(visitId, body);
    return { complaint_id: c.id } as T;
  }

  // POST /api/er/visits/:id/vitals
  const vitalsMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/vitals$/);
  if (vitalsMatch && method === "POST") {
    const visitId = parseInt(vitalsMatch[1]);
    const v = ErDatabase.addVitals(visitId, body);
    return { vitals_id: v.id } as T;
  }

  // POST /api/er/visits/:id/triage
  const triageMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/triage$/);
  if (triageMatch && method === "POST") {
    const visitId = parseInt(triageMatch[1]);
    ErDatabase.setTriage(visitId, {
      category: body.category,
      reason: body.reason,
      bedLabel: body.triage_bed_label,
    });
    return { success: true } as T;
  }

  // POST /api/er/visits/:id/assign-doctor
  const assignDocMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/assign-doctor$/);
  if (assignDocMatch && method === "POST") {
    const visitId = parseInt(assignDocMatch[1]);
    ErDatabase.assignDoctor(visitId, body);
    return { success: true } as T;
  }

  // POST /api/er/visits/:id/accept
  const acceptDocMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/accept$/);
  if (acceptDocMatch && method === "POST") {
    const visitId = parseInt(acceptDocMatch[1]);
    ErDatabase.acceptDoctor(visitId);
    return { success: true } as T;
  }

  // POST /api/er/visits/:id/treatments
  const treatMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/treatments$/);
  if (treatMatch && method === "POST") {
    const visitId = parseInt(treatMatch[1]);
    const t = ErDatabase.addTreatment(visitId, body);
    return { treatment_id: t.id } as T;
  }

  // POST /api/er/visits/:id/notes
  const notesMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/notes$/);
  if (notesMatch && method === "POST") {
    const visitId = parseInt(notesMatch[1]);
    const n = ErDatabase.addClinicalNote(visitId, body);
    return { note_id: n.id } as T;
  }

  // POST /api/er/visits/:id/bed-requests
  const bedReqMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/bed-requests$/);
  if (bedReqMatch && method === "POST") {
    const visitId = parseInt(bedReqMatch[1]);
    const b = ErDatabase.createBedRequest(visitId, body);
    return { bed_request_id: b.id } as T;
  }

  // GET /api/er/visits/:id/consents
  const consentsGetMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/consents$/);
  if (consentsGetMatch && method === "GET") {
    const visitId = parseInt(consentsGetMatch[1]);
    const visit = ErDatabase.getVisit(visitId);
    return { consents: visit?.consents || [] } as T;
  }

  // POST /api/er/visits/:id/consents
  if (consentsGetMatch && method === "POST") {
    const visitId = parseInt(consentsGetMatch[1]);
    const c = ErDatabase.addConsent(visitId, body);
    return { consent_id: c.id } as T;
  }

  // POST /api/er/visits/:id/lama
  const lamaMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/lama$/);
  if (lamaMatch && method === "POST") {
    const visitId = parseInt(lamaMatch[1]);
    ErDatabase.recordLama(visitId, body);
    return { success: true } as T;
  }

  // POST /api/er/visits/:id/disposition
  const dispMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/disposition$/);
  if (dispMatch && method === "POST") {
    const visitId = parseInt(dispMatch[1]);
    const d = ErDatabase.recordDisposition(visitId, body);
    return { disposition: d } as T;
  }

  // POST /api/er/visits/:id/close or preview
  const closeMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/close$/);
  if (closeMatch && method === "POST") {
    const visitId = parseInt(closeMatch[1]);
    const res = ErDatabase.closeVisit(visitId, body.total || body.consultation_fee);
    return res as T;
  }

  // GET /api/patients
  if (pathname === "/api/patients" && method === "GET") {
    const q = url.searchParams.get("q") || "";
    const patients = ErDatabase.searchPatients(q);
    return { patients } as T;
  }

  // GET /api/registration/departments
  if (pathname === "/api/registration/departments" && method === "GET") {
    return {
      departments: [
        { department_name: "Emergency Medicine" },
        { department_name: "Cardiology" },
        { department_name: "Pulmonology" },
        { department_name: "General Medicine" },
        { department_name: "General Surgery" },
        { department_name: "Orthopedics / Trauma" },
        { department_name: "Neurology" },
        { department_name: "Pediatrics" },
        { department_name: "Obstetrics & Gynecology" },
      ],
    } as T;
  }

  // GET /api/op/doctors
  if (pathname === "/api/op/doctors" && method === "GET") {
    return {
      doctors: [
        { doctor_name: "Dr. Vikram Seth", department: "Cardiology" },
        { doctor_name: "Dr. Anita Roy", department: "Emergency Medicine" },
        { doctor_name: "Dr. Rajesh Sharma", department: "General Medicine" },
        { doctor_name: "Dr. Sanjay Gupta", department: "Orthopedics / Trauma" },
        { doctor_name: "Dr. Meenakshi Rao", department: "Neurology" },
        { doctor_name: "Dr. Priya Deshmukh", department: "General Surgery" },
      ],
    } as T;
  }

  // POST /api/symptom-ai/triage
  if (pathname === "/api/symptom-ai/triage" && method === "POST") {
    const symptoms = body.symptoms || "";
    const evalRes = await ErDatabase.evaluateClinicalTriage(symptoms, {});
    return {
      department: evalRes.suggestedDepartment,
      urgency: evalRes.urgency,
      reasoning: evalRes.reasoning,
      doctor: evalRes.suggestedDoctor,
      suggested_treatment: evalRes.suggestedTreatments[0] || null,
      suggested_treatments: evalRes.suggestedTreatments,
    } as T;
  }

  return null;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit & { cache?: RequestCache } = {},
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const csrfToken = getCsrfToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Hospital-Code": getHospitalCode(),
    ...(csrfToken && method !== "GET" && method !== "HEAD" ? { "X-CSRF-Token": csrfToken } : {}),
    ...(options.headers || {}),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${API_BASE}${path}`, {
      headers,
      credentials: "include",
      cache: options.cache || (method === "GET" ? "no-store" : "default"),
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401 && path !== "/api/auth/login" && path !== "/api/auth/session") {
        window.dispatchEvent(new Event("app:unauthorized"));
      }
      // If endpoint not implemented or error on backend, fallback to local ER store
      const localResult = await handleLocalErMock<T>(path, options);
      if (localResult !== null) return localResult as T;

      const message = payload.error || payload.message || "Request failed";
      const error = new Error(message) as Error & { payload?: any; status?: number };
      error.payload = payload;
      error.status = response.status;
      throw error;
    }

    return response.json();
  } catch (err: any) {
    // Graceful offline fallback to Local ER Store
    const localResult = await handleLocalErMock<T>(path, options);
    if (localResult !== null) {
      return localResult as T;
    }
    throw err;
  }
}

export function withAuthHeaders(headers: Record<string, string> = {}, method = "GET"): HeadersInit {
  const csrfToken = getCsrfToken();
  return {
    "X-Hospital-Code": getHospitalCode(),
    ...(csrfToken && method !== "GET" && method !== "HEAD" ? { "X-CSRF-Token": csrfToken } : {}),
    ...headers,
  };
}

export function reportError(
  setNotice?: (notice: Notice | null) => void,
  error?: { status?: number; message?: string },
  fallbackMessage = "Request failed.",
): void {
  if (error?.status === 401) return;
  setNotice?.({ type: "error", message: error?.message || fallbackMessage });
}
