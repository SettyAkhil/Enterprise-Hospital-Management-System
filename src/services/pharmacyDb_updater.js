const fs = require('fs');
const path = 'f:/varma/Enterprise-Hospital-Management-System/src/services/pharmacyDb.ts';
let code = fs.readFileSync(path, 'utf8');

// Insert Interfaces
const interfaces = 
export interface AppUser {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive";
  lastLogin: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "alert" | "info" | "success" | "warning";
  timestamp: string;
  read: boolean;
}

export interface AppAuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  record: string;
  details: string;
}
;

if (!code.includes('AppAuditLog')) {
  code = code.replace('export interface AppCategory', interfaces + '\nexport interface AppCategory');
}

// Insert Constants
const constants = 
const USERS_KEY = "hospai_pharm_users_v2";
const NOTIFICATIONS_KEY = "hospai_pharm_notifications_v2";
const AUDIT_LOGS_KEY = "hospai_pharm_audit_logs_v2";
;

if (!code.includes('USERS_KEY')) {
  code = code.replace('const CATEGORIES_KEY', constants + '\nconst CATEGORIES_KEY');
}

// Insert Methods
const methods = 
  static getUsers(): AppUser[] {
    if (typeof window === "undefined") return [];
    try { const stored = window.localStorage.getItem(USERS_KEY); return stored ? JSON.parse(stored) : []; } catch { return []; }
  }
  static saveUsers(users: AppUser[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  static getNotifications(): AppNotification[] {
    if (typeof window === "undefined") return [];
    try { const stored = window.localStorage.getItem(NOTIFICATIONS_KEY); return stored ? JSON.parse(stored) : []; } catch { return []; }
  }
  static saveNotifications(notifications: AppNotification[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }

  static getAuditLogs(): AppAuditLog[] {
    if (typeof window === "undefined") return [];
    try { const stored = window.localStorage.getItem(AUDIT_LOGS_KEY); return stored ? JSON.parse(stored) : []; } catch { return []; }
  }
  static saveAuditLogs(logs: AppAuditLog[]) {
    if (typeof window !== "undefined") window.localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
  }
;

if (!code.includes('getAuditLogs')) {
  code = code.replace('static getCategories():', methods + '\n  static getCategories():');
}

// Update Prescription Status Method
const rxMethods = 
  static updatePrescription(id: string, updates: Partial<AppPrescription>) {
    const rxs = this.getPrescriptions();
    const idx = rxs.findIndex(r => r.id === id);
    if (idx > -1) {
      rxs[idx] = { ...rxs[idx], ...updates };
      this.savePrescriptions(rxs);
    }
  }

  static logAudit(user: string, action: string, module: string, record: string, details: string) {
    const logs = this.getAuditLogs();
    logs.unshift({
      id: "LOG" + Date.now(),
      timestamp: new Date().toISOString(),
      user, action, module, record, details
    });
    this.saveAuditLogs(logs);
  }
;

if (!code.includes('logAudit')) {
  code = code.replace('// FEFO Helper Engine', rxMethods + '\n  // FEFO Helper Engine');
}

fs.writeFileSync(path, code);
console.log('Successfully updated pharmacyDb.ts');
