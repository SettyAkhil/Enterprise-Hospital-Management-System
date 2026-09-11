export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  module: string;
  description: string;
  timestamp: string;
  status: "Success" | "Failed";
}

const STORAGE_KEY = "hospai_audit_logs_v1";

export class AuditDatabase {
  static getLogs(): AuditLog[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static logEvent(
    action: string,
    module: string,
    description: string,
    status: "Success" | "Failed",
    userId: string = "system",
    username: string = "System"
  ) {
    const logs = this.getLogs();
    
    // Auto-detect user context if not explicitly provided
    let finalUserId = userId;
    let finalUsername = username;
    
    if (finalUserId === "system") {
      try {
        // Try to get current user from localStorage if possible (used by App.tsx)
        const currentUserData = localStorage.getItem("hospai_current_user");
        if (currentUserData) {
          const u = JSON.parse(currentUserData);
          if (u && u.staffId) {
            finalUserId = u.staffId;
            finalUsername = u.user;
          }
        }
      } catch (e) {
        // Ignore
      }
    }

    const entry: AuditLog = {
      id: "AUD_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      userId: finalUserId,
      username: finalUsername,
      action,
      module,
      description,
      timestamp: new Date().toISOString(),
      status
    };

    logs.unshift(entry); // Add to beginning (newest first)
    
    // Keep max 1000 logs to prevent localstorage bloat
    if (logs.length > 1000) {
      logs.pop();
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }
}
