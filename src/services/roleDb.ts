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

const ROLES_STORAGE_KEY = "hospai_rbac_roles_v1";
const USERS_STORAGE_KEY = "hospai_rbac_users_v1";

export const ALL_SYSTEM_MODULES = [
  "dashboard", "patients", "appointments", "emergency",
  "clinical", "inpatient", "nursing", "laboratory",
  "radiology", "pharmacy", "surgery", "billing",
  "icu", "discharge", "triage", "insurance", "analytics",
  "reports", "admin", "chart", "register",
  "outpatient", "queue", "op_management", "op_registration", "op_workflow",
  "doctor_workflow", "scheduling", "admissions", "readmission",
  "payments", "revenue_reports", "hrms", "employees", "patient_exp",
  "intelligence", "ocr", "dpi_ocr", "symptom_ai", "clinical_rag", "clinical_summaries", "bulk_ai", "nl_filtering",
  "beds"
];

// Super admin role gets everything
const INITIAL_ROLES: AppRole[] = [
  { id: "ROLE_ADMIN", name: "System Administrator", allowedModules: ALL_SYSTEM_MODULES },
  { 
    id: "ROLE_NURSE", 
    name: "Registered Nurse", 
    allowedModules: ["dashboard", "inpatient", "nursing", "chart", "beds"] 
  },
  { 
    id: "ROLE_RECEPTION", 
    name: "Receptionist", 
    allowedModules: ["dashboard", "patients", "register", "appointments", "outpatient", "queue", "op_management"] 
  },
  {
    id: "ROLE_PHARMACY_MANAGER",
    name: "Pharmacy Manager",
    allowedModules: ["dashboard", "pharmacy", "reports", "inventory"]
  },
  {
    id: "ROLE_PHARMACIST",
    name: "Pharmacist",
    allowedModules: ["dashboard", "pharmacy"]
  },
  {
    id: "ROLE_PHARMACY_ASSISTANT",
    name: "Pharmacy Assistant",
    allowedModules: ["dashboard", "pharmacy"]
  }
];

const INITIAL_USERS: AppUser[] = [
  { id: "U_ADMIN", username: "admin", password: "password123", roleId: "ROLE_ADMIN", name: "Hospital Administrator", staffId: "ADM-001" },
  { id: "U_NURSE", username: "nurse", password: "password123", roleId: "ROLE_NURSE", name: "Jessica Carter", staffId: "RN-8821" },
  { id: "U_RECEPTION", username: "reception", password: "password123", roleId: "ROLE_RECEPTION", name: "Elena Torres", staffId: "REC-102" },
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
