import { API_BASE } from "./constants";
import type { Notice } from "../types";

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

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit & { cache?: RequestCache } = {},
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Hospital-Code": getHospitalCode(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    credentials: "include",
    cache: options.cache || (method === "GET" ? "no-store" : "default"),
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== "/api/auth/login" && path !== "/api/auth/session") {
      window.dispatchEvent(new Event("app:unauthorized"));
    }
    const message = payload.error || payload.message || "Request failed";
    const error = new Error(message) as Error & { payload?: any; status?: number };
    error.payload = payload;
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export function reportError(
  setNotice?: (notice: Notice | null) => void,
  error?: { status?: number; message?: string },
  fallbackMessage = "Request failed.",
): void {
  if (error?.status === 401) return;
  setNotice?.({ type: "error", message: error?.message || fallbackMessage });
}
