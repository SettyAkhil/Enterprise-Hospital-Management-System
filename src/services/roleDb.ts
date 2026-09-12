export interface AppRole {
  id: string;
  name: string;
  allowedModules: string[];
}

export interface AppUser {
  id: string;
  username: string;
  password?: string; // Stored just for mock login validation
  roleId: string;
  name: string;
  staffId: string;
  status?: "Active" | "Inactive";
}

// Bumped to v3 when the doctor portal and lab-billing modules were added: the
// role list is cached in localStorage, so an existing browser would otherwise
// keep a role definition that grants neither.
const ROLES_STORAGE_KEY = "hospai_rbac_roles_v3";
const USERS_STORAGE_KEY = "hospai_rbac_users_v1";

export const ALL_SYSTEM_MODULES = [
  "dashboard", "patients", "appointments", "emergency",
  "clinical", "inpatient", "nursing", "laboratory",
  "radiology", "pharmacy", "pharmacy_dispensing", "pharmacy_rx", "pharmacy_ocr", "pharmacy_returns",
  "pharmacy_medicine", "pharmacy_category", "pharmacy_suppliers", "pharmacy_po",
  "pharmacy_grn", "pharmacy_ledger", "pharmacy_transfers", "pharmacy_expiry", "pharmacy_analytics",
  "surgery", "billing",
  "icu", "discharge", "triage", "insurance", "analytics",
  "reports", "admin", "chart", "register",
  "outpatient", "queue", "op_management", "op_registration", "op_workflow",
  "doctor_workflow", "doctor_portal", "scheduling", "admissions", "readmission",
  "lab_billing",
  "payments", "revenue_reports", "hrms", "employees", "patient_exp",
  "intelligence", "ocr", "dpi_ocr", "symptom_ai", "clinical_rag", "clinical_summaries", "bulk_ai", "nl_filtering",
  "beds"
];

// Super admin role gets everything
const INITIAL_ROLES: AppRole[] = [
  { id: "ROLE_SUPERADMIN", name: "Super Administrator", allowedModules: ALL_SYSTEM_MODULES },
  { id: "ROLE_ADMIN", name: "Hospital Administrator", allowedModules: ALL_SYSTEM_MODULES },
  {
    id: "ROLE_DOCTOR",
    name: "Attending Physician / Doctor",
    allowedModules: [
      "dashboard", "doctor_portal", "patients", "appointments", "clinical", "chart", "emergency", "triage",
      "icu", "inpatient", "pharmacy", "pharmacy_dispensing", "pharmacy_rx", "pharmacy_ocr",
      "pharmacy_medicine", "pharmacy_ledger", "pharmacy_expiry",
      "laboratory", "radiology", "intelligence", "dpi_ocr", "discharge"
    ]
  },
  {
    id: "ROLE_RECEPTION",
    name: "Receptionist / Front Desk",
    allowedModules: [
      "dashboard", "patients", "register", "appointments", "outpatient", "queue", "op_management",
      "op_registration", "billing", "payments", "lab_billing", "laboratory"
    ]
  },
  {
    id: "ROLE_PHARMACY",
    name: "Pharmacist / Pharmacy Staff",
    allowedModules: [
      "dashboard", "pharmacy", "pharmacy_dispensing", "pharmacy_rx", "pharmacy_ocr", "pharmacy_returns",
      "pharmacy_medicine", "pharmacy_category", "pharmacy_suppliers", "pharmacy_po",
      "pharmacy_grn", "pharmacy_ledger", "pharmacy_transfers", "pharmacy_expiry", "pharmacy_analytics",
      "dpi_ocr", "patients", "chart", "billing"
    ]
  },
  {
    id: "ROLE_LAB",
    name: "Laboratory & Radiology Tech",
    allowedModules: ["dashboard", "laboratory", "radiology", "patients", "chart", "reports", "lab_billing"]
  },
  {
    id: "ROLE_NURSE",
    name: "Registered Nurse",
    allowedModules: ["dashboard", "inpatient", "nursing", "icu", "beds", "chart", "emergency", "triage"]
  },
  {
    id: "ROLE_PHARMACY_MANAGER",
    name: "Pharmacy Manager",
    allowedModules: [
      "dashboard", "reports", "inventory",
      "pharmacy", "pharmacy_dispensing", "pharmacy_rx", "pharmacy_ocr", "pharmacy_returns",
      "pharmacy_medicine", "pharmacy_category", "pharmacy_suppliers", "pharmacy_po",
      "pharmacy_grn", "pharmacy_ledger", "pharmacy_transfers", "pharmacy_expiry", "pharmacy_analytics"
    ]
  },
  {
    id: "ROLE_PHARMACIST",
    name: "Pharmacist",
    allowedModules: [
      "dashboard",
      "pharmacy", "pharmacy_dispensing", "pharmacy_rx", "pharmacy_ocr", "pharmacy_returns",
      "pharmacy_medicine", "pharmacy_category", "pharmacy_suppliers", "pharmacy_po",
      "pharmacy_grn", "pharmacy_ledger", "pharmacy_transfers", "pharmacy_expiry", "pharmacy_analytics"
    ]
  },
  {
    id: "ROLE_PHARMACY_ASSISTANT",
    name: "Pharmacy Assistant",
    allowedModules: [
      "dashboard", "pharmacy", "pharmacy_dispensing", "pharmacy_rx", "pharmacy_ocr", "pharmacy_returns",
      "pharmacy_medicine", "pharmacy_ledger", "pharmacy_expiry"
    ]
  }
];

const INITIAL_USERS: AppUser[] = [
  { id: "U_SUPERADMIN", username: "superadmin", password: "password123", roleId: "ROLE_SUPERADMIN", name: "Dr. Alexander Vance", staffId: "SUP-001" },
  { id: "U_ADMIN", username: "admin", password: "password123", roleId: "ROLE_ADMIN", name: "System Administrator", staffId: "ADM-001" },
  { id: "U_DOCTOR", username: "doctor", password: "password123", roleId: "ROLE_DOCTOR", name: "Dr. Sarah Jenkins", staffId: "DOC-402" },
  { id: "U_RECEPTION", username: "reception", password: "password123", roleId: "ROLE_RECEPTION", name: "Elena Torres", staffId: "REC-102" },
  { id: "U_PHARMACY", username: "pharmacy", password: "password123", roleId: "ROLE_PHARMACY", name: "Robert Williams, RPh", staffId: "PHM-844" },
  { id: "U_LAB", username: "lab", password: "password123", roleId: "ROLE_LAB", name: "Michael Chang, CLS", staffId: "LAB-512" },
  { id: "U_NURSE", username: "nurse", password: "password123", roleId: "ROLE_NURSE", name: "Jessica Carter, RN", staffId: "RN-8821" },
];

export class RoleDatabase {
  static getRoles(): AppRole[] {
    if (typeof window === "undefined") return INITIAL_ROLES;
    try {
      const stored = window.localStorage.getItem(ROLES_STORAGE_KEY);
      if (!stored) {
        window.localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(INITIAL_ROLES));
        return INITIAL_ROLES;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_ROLES;
    }
  }

  static saveRoles(roles: AppRole[]): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
    } catch (e) {
      console.error("Failed to save roles", e);
    }
  }

  static getUsers(): AppUser[] {
    if (typeof window === "undefined") return INITIAL_USERS;
    try {
      const stored = window.localStorage.getItem(USERS_STORAGE_KEY);
      if (!stored) {
        window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
        return INITIAL_USERS;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_USERS;
    }
  }

  static saveUsers(users: AppUser[]): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error("Failed to save users", e);
    }
  }

  static authenticate(username: string, password?: string): { user: AppUser, role: AppRole } | null {
    const users = this.getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return null;

    const roles = this.getRoles();
    const role = roles.find(r => r.id === user.roleId) || roles[0]; // fallback to first role if missing

    return { user, role };
  }
}

export type PermissionAction = "read" | "write" | "delete" | "export";

export function hasGranularPermission(
  allowedModules: string[],
  moduleName: string,
  action?: PermissionAction
): boolean {
  if (!allowedModules) return false;
  if (allowedModules.includes(moduleName) || allowedModules.includes("*")) return true;
  if (!action) {
    return allowedModules.some(m => m === moduleName || m.startsWith(`${moduleName}:`));
  }
  return allowedModules.includes(`${moduleName}:${action}`);
}

export function getGrantedActionsForModule(
  allowedModules: string[],
  moduleName: string
): PermissionAction[] {
  if (!allowedModules) return [];
  if (allowedModules.includes(moduleName) || allowedModules.includes("*")) {
    return ["read", "write", "delete", "export"];
  }
  const actions: PermissionAction[] = [];
  if (allowedModules.includes(`${moduleName}:read`)) actions.push("read");
  if (allowedModules.includes(`${moduleName}:write`)) actions.push("write");
  if (allowedModules.includes(`${moduleName}:delete`)) actions.push("delete");
  if (allowedModules.includes(`${moduleName}:export`)) actions.push("export");
  return actions;
}
