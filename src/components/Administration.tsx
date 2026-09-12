import React, { useState, useEffect } from "react";
import { 
  RoleDatabase, 
  AppRole, 
  AppUser, 
  ALL_SYSTEM_MODULES, 
  PermissionAction, 
  getGrantedActionsForModule 
} from "../services/roleDb";
import { AuditDatabase, AuditLog } from "../services/auditDb";

// System Module Categories for clean RBAC governance
const MODULE_CATEGORIES = [
  {
    id: "clinical",
    title: "Clinical Care & EMR",
    description: "Inpatient, Doctor, Nursing, ICU, ER, Triage & Surgery Workflows",
    modules: [
      "clinical", "doctor_workflow", "patients", "chart", "inpatient", "nursing", 
      "icu", "emergency", "triage", "surgery", "discharge", "readmission", "admissions"
    ]
  },
  {
    id: "diagnostics",
    title: "Diagnostics & Pharmacy",
    description: "Pharmacy dispensing, Laboratory tests, Radiology imaging & Reports",
    modules: ["pharmacy", "laboratory", "radiology", "reports"]
  },
  {
    id: "frontoffice",
    title: "Front Desk & Revenue Cycle",
    description: "Patient Registration, Outpatient Queue, Scheduling, Billing, Payments & Insurance",
    modules: [
      "register", "appointments", "outpatient", "queue", "op_management", 
      "op_registration", "op_workflow", "scheduling", "billing", "payments", "insurance", "revenue_reports"
    ]
  },
  {
    id: "ai_intelligence",
    title: "AI & Document Intelligence",
    description: "Keppler OCR, Medical Document Summaries, Clinical RAG & Symptom AI",
    modules: [
      "intelligence", "ocr", "dpi_ocr", "symptom_ai", "clinical_rag", 
      "clinical_summaries", "bulk_ai", "nl_filtering"
    ]
  },
  {
    id: "workforce",
    title: "Staff & Workforce",
    description: "Human Resource Management, Employee Directory & Experience",
    modules: ["hrms", "employees", "patient_exp"]
  },
  {
    id: "platform",
    title: "Platform & Infrastructure",
    description: "Dashboard analytics, Bed management, System Administration",
    modules: ["dashboard", "admin", "beds", "analytics"]
  }
];

const ACTIONS_LIST: { key: PermissionAction; label: string; icon: string }[] = [
  { key: "read", label: "Read", icon: "👁️" },
  { key: "write", label: "Write", icon: "✍️" },
  { key: "delete", label: "Delete", icon: "🗑️" },
  { key: "export", label: "Export", icon: "📥" },
];

export default function Administration() {
  const [activeTab, setActiveTab] = useState<"roles" | "users" | "audit" | "settings">("roles");
  
  // Database States
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Roles Tab State
  const [selectedRoleId, setSelectedRoleId] = useState<string>("ROLE_DOCTOR");
  const [roleSearch, setRoleSearch] = useState("");
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showCloneRoleModal, setShowCloneRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [cloneSourceRoleId, setCloneSourceRoleId] = useState("ROLE_DOCTOR");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [roleNotice, setRoleNotice] = useState("");
  const [expandedGranularModule, setExpandedGranularModule] = useState<string | null>(null);

  // Users Tab State
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [resetPassUser, setResetPassUser] = useState<AppUser | null>(null);
  const [newPassInput, setNewPassInput] = useState("password123");

  // Audit Tab State
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [auditUserFilter, setAuditUserFilter] = useState("all");
  const [auditDateFilter, setAuditDateFilter] = useState("all");
  const [auditStatusFilter, setAuditStatusFilter] = useState("all");
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

  // Settings State
  const [mfaEnforced, setMfaEnforced] = useState(true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30);
  const [minPasswordLength, setMinPasswordLength] = useState(10);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");

  useEffect(() => {
    const loadedRoles = RoleDatabase.getRoles();
    setRoles(loadedRoles);
    setUsers(RoleDatabase.getUsers());
  }, []);

  useEffect(() => {
    if (activeTab === "audit") {
      setAuditLogs(AuditDatabase.getLogs());
    }
  }, [activeTab]);

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0] || null;

  // Role Operations
  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    
    const roleId = "ROLE_" + newRoleName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const existing = roles.find(r => r.id === roleId);
    if (existing) {
      alert("A role with a similar identifier already exists.");
      return;
    }

    const newRole: AppRole = {
      id: roleId,
      name: newRoleName.trim(),
      allowedModules: ["dashboard", "patients:read"]
    };

    const updated = [...roles, newRole];
    RoleDatabase.saveRoles(updated);
    
    AuditDatabase.logEvent(
      "Role Created", 
      "Role Management", 
      `Created custom role '${newRoleName}' (${roleId})`, 
      "Success"
    );
    
    setRoles(updated);
    setSelectedRoleId(newRole.id);
    setShowCreateRoleModal(false);
    setNewRoleName("");
    setNewRoleDescription("");
    setRoleNotice(`Role "${newRole.name}" created successfully.`);
    setTimeout(() => setRoleNotice(""), 3000);
  };

  const handleCloneRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const sourceRole = roles.find(r => r.id === cloneSourceRoleId);
    const sourceModules = sourceRole ? [...sourceRole.allowedModules] : ["dashboard"];

    const roleId = "ROLE_" + newRoleName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const newRole: AppRole = {
      id: roleId,
      name: newRoleName.trim(),
      allowedModules: sourceModules
    };

    const updated = [...roles, newRole];
    RoleDatabase.saveRoles(updated);

    AuditDatabase.logEvent(
      "Role Cloned",
      "Role Management",
      `Cloned role '${newRoleName}' from '${sourceRole?.name || cloneSourceRoleId}'`,
      "Success"
    );

    setRoles(updated);
    setSelectedRoleId(newRole.id);
    setShowCloneRoleModal(false);
    setNewRoleName("");
    setRoleNotice(`Cloned role "${newRole.name}" created with ${sourceModules.length} permission rules.`);
    setTimeout(() => setRoleNotice(""), 3000);
  };

  const handleSaveRoleModules = () => {
    if (!selectedRole) return;
    const updated = roles.map(r => r.id === selectedRole.id ? selectedRole : r);
    RoleDatabase.saveRoles(updated);
    
    AuditDatabase.logEvent(
      "Permission Changed", 
      "RBAC Governance", 
      `Updated module permissions for role '${selectedRole.name}' (${selectedRole.allowedModules.length} rules assigned)`, 
      "Success"
    );
    
    setRoles(updated);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const handleDeleteRole = (roleToDelete: AppRole) => {
    if (roleToDelete.id === "ROLE_SUPERADMIN" || roleToDelete.id === "ROLE_ADMIN") {
      alert("System Administrator roles cannot be deleted.");
      return;
    }

    const assignedUsers = users.filter(u => u.roleId === roleToDelete.id);
    if (assignedUsers.length > 0) {
      alert(`Cannot delete role "${roleToDelete.name}" because ${assignedUsers.length} user(s) are currently assigned to it. Reassign them first.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete the custom role "${roleToDelete.name}"?`)) {
      const updated = roles.filter(r => r.id !== roleToDelete.id);
      RoleDatabase.saveRoles(updated);
      
      AuditDatabase.logEvent("Role Deleted", "Role Management", `Deleted custom role '${roleToDelete.name}'`, "Success");

      setRoles(updated);
      if (selectedRoleId === roleToDelete.id) {
        setSelectedRoleId(updated[0]?.id || "");
      }
      setRoleNotice(`Role "${roleToDelete.name}" deleted.`);
      setTimeout(() => setRoleNotice(""), 3000);
    }
  };

  // Toggle Entire Module (Full Access vs None)
  const toggleFullModule = (modKey: string) => {
    if (!selectedRole || selectedRole.id === "ROLE_SUPERADMIN") return;

    let currentAllowed = [...selectedRole.allowedModules];
    const isFullGranted = currentAllowed.includes(modKey);
    const hasGranular = currentAllowed.some(m => m.startsWith(`${modKey}:`));

    if (isFullGranted || hasGranular) {
      // Remove full module & all granular actions for this module
      currentAllowed = currentAllowed.filter(m => m !== modKey && !m.startsWith(`${modKey}:`));
    } else {
      // Grant full access
      currentAllowed.push(modKey);
    }

    const updatedRole = { ...selectedRole, allowedModules: currentAllowed };
    setRoles(roles.map(r => r.id === selectedRole.id ? updatedRole : r));
  };

  // Toggle Single Action (Read / Write / Delete / Export)
  const toggleGranularAction = (modKey: string, action: PermissionAction) => {
    if (!selectedRole || selectedRole.id === "ROLE_SUPERADMIN") return;

    let currentAllowed = [...selectedRole.allowedModules];
    const fullKey = `${modKey}:${action}`;

    if (currentAllowed.includes(modKey)) {
      // Convert full module access to explicit granular actions excluding this toggled action
      const remainingActions = (["read", "write", "delete", "export"] as PermissionAction[]).filter(a => a !== action);
      currentAllowed = currentAllowed.filter(m => m !== modKey);
      remainingActions.forEach(a => currentAllowed.push(`${modKey}:${a}`));
    } else if (currentAllowed.includes(fullKey)) {
      // Remove specific action
      currentAllowed = currentAllowed.filter(m => m !== fullKey);
    } else {
      // Add specific action
      currentAllowed.push(fullKey);
    }

    // If all 4 actions are individually selected, collapse back to full module key
    const currentActions = (["read", "write", "delete", "export"] as PermissionAction[]).filter(a => 
      currentAllowed.includes(`${modKey}:${a}`)
    );
    if (currentActions.length === 4) {
      currentAllowed = currentAllowed.filter(m => !m.startsWith(`${modKey}:`));
      currentAllowed.push(modKey);
    }

    const updatedRole = { ...selectedRole, allowedModules: currentAllowed };
    setRoles(roles.map(r => r.id === selectedRole.id ? updatedRole : r));
  };

  const toggleCategoryModules = (categoryModules: string[]) => {
    if (!selectedRole || selectedRole.id === "ROLE_SUPERADMIN") return;
    
    const allSelected = categoryModules.every(m => 
      selectedRole.allowedModules.includes(m) || 
      getGrantedActionsForModule(selectedRole.allowedModules, m).length > 0
    );

    let nextAllowed = [...selectedRole.allowedModules];

    if (allSelected) {
      // Remove all modules in this category
      nextAllowed = nextAllowed.filter(m => 
        !categoryModules.includes(m) && !categoryModules.some(cm => m.startsWith(`${cm}:`))
      );
    } else {
      // Add full access for all modules in this category
      categoryModules.forEach(cm => {
        nextAllowed = nextAllowed.filter(m => m !== cm && !m.startsWith(`${cm}:`));
        nextAllowed.push(cm);
      });
    }

    const updatedRole = { ...selectedRole, allowedModules: nextAllowed };
    setRoles(roles.map(r => r.id === selectedRole.id ? updatedRole : r));
  };

  const applyPresetTemplate = (preset: "full" | "clinical" | "frontdesk" | "diagnostics" | "readonly") => {
    if (!selectedRole || selectedRole.id === "ROLE_SUPERADMIN") return;
    
    let targetModules: string[] = [];
    if (preset === "full") {
      targetModules = [...ALL_SYSTEM_MODULES];
    } else if (preset === "clinical") {
      targetModules = ["dashboard", "patients", "chart", "clinical", "doctor_workflow", "inpatient", "nursing", "icu", "emergency", "triage", "surgery", "discharge", "pharmacy", "laboratory"];
    } else if (preset === "frontdesk") {
      targetModules = ["dashboard", "patients:read", "register", "appointments", "outpatient", "queue", "op_management", "op_registration", "billing", "payments"];
    } else if (preset === "diagnostics") {
      targetModules = ["dashboard", "pharmacy", "laboratory", "radiology", "patients:read", "chart:read", "reports", "dpi_ocr"];
    } else if (preset === "readonly") {
      targetModules = ALL_SYSTEM_MODULES.map(m => `${m}:read`);
    }

    const updatedRole = { ...selectedRole, allowedModules: targetModules };
    setRoles(roles.map(r => r.id === selectedRole.id ? updatedRole : r));
  };

  // User Operations
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    let updatedUsers = [...users];
    const isNew = !users.find(u => u.id === editingUser.id);
    
    if (isNew) {
      const existingUser = users.find(u => u.username.toLowerCase() === editingUser.username.toLowerCase());
      if (existingUser) {
        alert(`Username "${editingUser.username}" is already taken by another account.`);
        return;
      }
      updatedUsers.push(editingUser);
      AuditDatabase.logEvent("User Account Created", "User Management", `Created new user account for ${editingUser.name} (${editingUser.username})`, "Success");
    } else {
      updatedUsers = updatedUsers.map(u => u.id === editingUser.id ? editingUser : u);
      AuditDatabase.logEvent("User Account Updated", "User Management", `Updated account details for ${editingUser.name} (${editingUser.username})`, "Success");
    }

    RoleDatabase.saveUsers(updatedUsers);
    setUsers(updatedUsers);
    setShowUserModal(false);
    setEditingUser(null);
  };

  const toggleUserStatus = (userToToggle: AppUser) => {
    const nextStatus: "Active" | "Inactive" = userToToggle.status === "Inactive" ? "Active" : "Inactive";
    const updatedUsers: AppUser[] = users.map(u => u.id === userToToggle.id ? { ...u, status: nextStatus } : u);
    
    RoleDatabase.saveUsers(updatedUsers);
    setUsers(updatedUsers);

    AuditDatabase.logEvent(
      "User Status Changed",
      "User Management",
      `Changed account status for ${userToToggle.username} to ${nextStatus}`,
      "Success"
    );
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUser || !newPassInput) return;

    const updatedUsers = users.map(u => u.id === resetPassUser.id ? { ...u, password: newPassInput } : u);
    RoleDatabase.saveUsers(updatedUsers);
    setUsers(updatedUsers);

    AuditDatabase.logEvent(
      "Password Reset",
      "User Security",
      `Administrative password reset performed for account ${resetPassUser.username}`,
      "Success"
    );

    setResetPassUser(null);
    setNewPassInput("password123");
    alert(`Password for ${resetPassUser.name} (${resetPassUser.username}) reset successfully.`);
  };

  const handleDeleteUser = (userId: string, username: string) => {
    if (username === "superadmin" || username === "admin") {
      alert("System Administrator accounts cannot be deleted.");
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete user account "${username}"?`)) {
      const updatedUsers = users.filter(u => u.id !== userId);
      RoleDatabase.saveUsers(updatedUsers);
      setUsers(updatedUsers);
      AuditDatabase.logEvent("User Account Deleted", "User Management", `Deleted user account for ${username}`, "Success");
    }
  };

  // Filtered lists
  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(roleSearch.toLowerCase()) || 
    r.id.toLowerCase().includes(roleSearch.toLowerCase())
  );

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.staffId.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === "all" || u.roleId === userRoleFilter;
    const matchesStatus = userStatusFilter === "all" || (u.status || "Active") === userStatusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const uniqueAuditActions = Array.from(new Set(auditLogs.map(l => l.action)));
  const uniqueAuditUsers = Array.from(new Set(auditLogs.map(l => l.username)));

  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(auditSearch.toLowerCase()) || 
                          log.username.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          log.description.toLowerCase().includes(auditSearch.toLowerCase());
    const matchesAction = auditActionFilter === "all" || log.action === auditActionFilter;
    const matchesUser = auditUserFilter === "all" || log.username === auditUserFilter;
    const matchesStatus = auditStatusFilter === "all" || log.status === auditStatusFilter;
    
    let matchesDate = true;
    if (auditDateFilter === "today") {
      matchesDate = new Date(log.timestamp).toDateString() === new Date().toDateString();
    } else if (auditDateFilter === "7days") {
      matchesDate = new Date(log.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (auditDateFilter === "30days") {
      matchesDate = new Date(log.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return matchesSearch && matchesAction && matchesUser && matchesStatus && matchesDate;
  });

  // System Stats
  const totalRolesCount = roles.length;
  const activeUsersCount = users.filter(u => (u.status || "Active") === "Active").length;
  const totalPermissionsAssigned = roles.reduce((acc, r) => acc + r.allowedModules.length, 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#F4F7FB] text-gray-900 font-sans select-none">
      
      {/* ── Sleek Minimalist Header ──────────────────────────────────────── */}
      <div className="bg-white border-b border-[#DDE2EC] px-8 pt-5 pb-0 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Administration & Access Control</h1>
            <p className="text-[12.5px] text-[#64748B] mt-0.5">Manage hospital roles, module permissions matrix, user accounts, and security logs.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowCreateRoleModal(true);
                setNewRoleName("");
              }}
              className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white font-semibold text-[12.5px] px-3.5 py-1.5 rounded-none transition-colors border border-blue-600 cursor-pointer shadow-2xs"
            >
              + Create Role
            </button>
            <button
              onClick={() => {
                setEditingUser({
                  id: "U_" + Date.now(),
                  username: "",
                  password: "password123",
                  name: "",
                  staffId: "STAFF-" + Date.now().toString().slice(-4),
                  roleId: roles[0]?.id || "ROLE_DOCTOR",
                  status: "Active"
                });
                setShowUserModal(true);
              }}
              className="bg-white hover:bg-gray-50 text-[#0F172A] font-semibold text-[12.5px] px-3.5 py-1.5 rounded-none transition-colors border border-[#CBD5E1] cursor-pointer shadow-2xs"
            >
              + Add User
            </button>
          </div>
        </div>

        {/* Clean Underline Tabs */}
        <div className="flex items-center gap-8 text-[13px] font-semibold border-t border-[#F1F5F9] pt-1">
          {[
            { id: "roles", label: "Roles & Permissions", count: roles.length },
            { id: "users", label: "User Accounts", count: users.length },
            { id: "audit", label: "Audit Logs", count: auditLogs.length },
            { id: "settings", label: "System Settings" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? "border-[#1B4FD8] text-[#1B4FD8] font-bold"
                    : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-none font-mono ${isActive ? "bg-blue-50 text-[#1B4FD8]" : "bg-gray-100 text-gray-600"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Tab Content Container ─────────────────────────────────── */}
      <div className="px-8 py-6 flex-1 flex flex-col min-h-0 bg-[#F4F7FB]">
        
        {/* ── TAB 1: ROLES & GRANULAR PERMISSION MATRIX ──────────────────── */}
        {activeTab === "roles" && (
          <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[600px]">
            
            {/* Left Column: Roles Sidebar */}
            <div className="w-full lg:w-80 bg-white border border-[#DDE2EC] rounded-none flex flex-col overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#DDE2EC] bg-[#F8FAFC]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-bold text-[#0F172A] tracking-wider uppercase">System Roles</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowCloneRoleModal(true)}
                      title="Clone selected role"
                      className="text-[11px] bg-white hover:bg-gray-50 text-[#334155] px-2 py-1 border border-[#CBD5E1] font-semibold cursor-pointer"
                    >
                      Clone
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateRoleModal(true);
                        setNewRoleName("");
                      }}
                      title="Create new role"
                      className="text-[11px] bg-[#1B4FD8] hover:bg-[#1740B4] text-white px-2 py-1 font-semibold cursor-pointer"
                    >
                      + New
                    </button>
                  </div>
                </div>

                <input
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  placeholder="Search roles..."
                  className="w-full bg-white border border-[#DDE2EC] rounded-none px-3 py-2 text-[12.5px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#F1F5F9]">
                {filteredRoles.map((role) => {
                  const isSelected = selectedRoleId === role.id;
                  const assignedCount = users.filter((u) => u.roleId === role.id).length;
                  const isProtected = role.id === "ROLE_SUPERADMIN" || role.id === "ROLE_ADMIN";

                  return (
                    <div
                      key={role.id}
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`p-3 rounded-none cursor-pointer transition-all flex items-start justify-between ${
                        isSelected
                          ? "bg-[#EFF6FF] border-l-4 border-[#1B4FD8] text-[#1B4FD8]"
                          : "hover:bg-gray-50 text-[#334155]"
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[13px] font-bold truncate ${isSelected ? "text-[#1B4FD8]" : "text-[#0F172A]"}`}>
                            {role.name}
                          </span>
                          {isProtected && (
                            <span className="text-[9.5px] bg-gray-100 text-gray-600 px-1.5 py-0.2 border border-gray-200 font-mono">
                              SYSTEM
                            </span>
                          )}
                        </div>
                        <div className="text-[11.5px] text-[#64748B] flex items-center gap-3 font-mono">
                          <span>{role.allowedModules.length} Rules</span>
                          <span>•</span>
                          <span>{assignedCount} Users</span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="text-[#1B4FD8] font-bold text-[14px]">›</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Granular Permission Matrix Builder */}
            <div className="flex-1 bg-white border border-[#DDE2EC] rounded-none flex flex-col overflow-hidden shadow-sm">
              {selectedRole ? (
                <>
                  {/* Selected Role Header & Controls */}
                  <div className="p-5 border-b border-[#DDE2EC] bg-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">{selectedRole.name}</h2>
                        <span className="text-[11px] font-mono text-[#1B4FD8] bg-blue-50 px-2.5 py-0.5 border border-blue-200 font-semibold">
                          ID: {selectedRole.id}
                        </span>
                        {selectedRole.id === "ROLE_SUPERADMIN" && (
                          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                            FULL UNRESTRICTED ACCESS
                          </span>
                        )}
                      </div>
                      <p className="text-[12.5px] text-[#64748B] mt-1">
                        Granted <strong className="text-[#1B4FD8]">{selectedRole.allowedModules.length}</strong> active rules across system modules.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!selectedRole.id.startsWith("ROLE_SUPER") && !selectedRole.id.endsWith("ADMIN") && (
                        <button
                          onClick={() => handleDeleteRole(selectedRole)}
                          className="bg-white hover:bg-red-50 text-red-700 border border-red-200 text-[12px] font-semibold px-3 py-1.5 rounded-none transition-colors cursor-pointer"
                        >
                          Delete Role
                        </button>
                      )}

                      <button
                        onClick={handleSaveRoleModules}
                        className={`${
                          saveStatus === "saved"
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-[#1B4FD8] hover:bg-[#1740B4]"
                        } text-white font-semibold text-[13px] px-4 py-1.5 rounded-none transition-colors border border-blue-600 flex items-center gap-2 shadow-sm cursor-pointer`}
                      >
                        {saveStatus === "saved" ? "✓ Permissions Saved!" : "Save Permission Changes"}
                      </button>
                    </div>
                  </div>

                  {/* Preset Shortcuts Bar */}
                  <div className="px-5 py-2.5 bg-[#F1F5F9] border-b border-[#DDE2EC] flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[11.5px] font-semibold text-[#475569] uppercase tracking-wider">
                      Granular Preset Templates:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { key: "full", label: "Full Module Access" },
                        { key: "clinical", label: "Clinical Staff Preset" },
                        { key: "frontdesk", label: "Front Desk Preset" },
                        { key: "diagnostics", label: "Pharmacy & Diagnostics" },
                        { key: "readonly", label: "Read-Only (All Modules)" },
                      ].map((p) => (
                        <button
                          key={p.key}
                          disabled={selectedRole.id === "ROLE_SUPERADMIN"}
                          onClick={() => applyPresetTemplate(p.key as any)}
                          className="text-[11.5px] bg-white hover:bg-gray-100 text-[#334155] disabled:opacity-50 px-2.5 py-1 border border-[#CBD5E1] rounded-none transition-colors font-medium cursor-pointer"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {roleNotice && (
                    <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-[12.5px] px-5 py-2">
                      {roleNotice}
                    </div>
                  )}

                  {/* Categorized Module Checkbox & Granular Actions Grid */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {MODULE_CATEGORIES.map((cat) => {
                      const allCatSelected = cat.modules.every((m) => 
                        selectedRole.allowedModules.includes(m) || 
                        getGrantedActionsForModule(selectedRole.allowedModules, m).length > 0
                      );

                      return (
                        <div key={cat.id} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-none p-4">
                          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#E2E8F0]">
                            <div>
                              <h4 className="text-[13.5px] font-bold text-[#0F172A]">{cat.title}</h4>
                              <p className="text-[11.5px] text-[#64748B]">{cat.description}</p>
                            </div>

                            <button
                              type="button"
                              disabled={selectedRole.id === "ROLE_SUPERADMIN"}
                              onClick={() => toggleCategoryModules(cat.modules)}
                              className={`text-[11px] font-semibold px-2.5 py-1 border rounded-none transition-colors cursor-pointer ${
                                allCatSelected
                                  ? "bg-blue-50 border-blue-300 text-[#1B4FD8] hover:bg-blue-100"
                                  : "bg-white border-[#CBD5E1] text-[#334155] hover:bg-gray-50"
                              }`}
                            >
                              {allCatSelected ? "Deselect Category" : "Select All in Category"}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {cat.modules.map((modKey) => {
                              const isFullGranted = selectedRole.allowedModules.includes(modKey);
                              const grantedActions = getGrantedActionsForModule(selectedRole.allowedModules, modKey);
                              const isSuper = selectedRole.id === "ROLE_SUPERADMIN";
                              const isExpanded = expandedGranularModule === modKey;

                              return (
                                <div
                                  key={modKey}
                                  className={`p-3 rounded-none border transition-all ${
                                    isFullGranted || grantedActions.length > 0
                                      ? "bg-[#EFF6FF] border-[#1B4FD8]"
                                      : "bg-white border-[#E2E8F0]"
                                  }`}
                                >
                                  {/* Module Header Strip */}
                                  <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={isFullGranted || grantedActions.length > 0}
                                        disabled={isSuper}
                                        onChange={() => toggleFullModule(modKey)}
                                        className="w-3.5 h-3.5 accent-[#1B4FD8] rounded-none cursor-pointer disabled:opacity-50 flex-shrink-0"
                                      />
                                      <span className="text-[12.5px] font-bold text-[#0F172A] capitalize truncate">
                                        {modKey.replace(/_/g, " ")}
                                      </span>
                                    </label>

                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      {isFullGranted ? (
                                        <span className="text-[10px] bg-blue-100 text-[#1B4FD8] px-2 py-0.5 border border-blue-200 font-bold">
                                          ALL ACTIONS
                                        </span>
                                      ) : (
                                        <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 border border-gray-200 font-semibold font-mono">
                                          {grantedActions.length} / 4 Actions
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => setExpandedGranularModule(isExpanded ? null : modKey)}
                                        className="text-[11px] text-[#1B4FD8] font-bold hover:underline px-1"
                                      >
                                        {isExpanded ? "Hide" : "Actions ⚙️"}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Action Badges Row */}
                                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                    {ACTIONS_LIST.map((act) => {
                                      const hasAction = isFullGranted || grantedActions.includes(act.key);
                                      return (
                                        <button
                                          key={act.key}
                                          type="button"
                                          disabled={isSuper}
                                          onClick={() => toggleGranularAction(modKey, act.key)}
                                          className={`text-[10.5px] px-2 py-0.5 border rounded-none flex items-center gap-1 transition-all cursor-pointer ${
                                            hasAction
                                              ? "bg-white text-[#1B4FD8] border-[#1B4FD8] font-bold shadow-2xs"
                                              : "bg-gray-50 text-gray-400 border-gray-200 opacity-60 hover:opacity-100"
                                          }`}
                                        >
                                          <span>{act.icon}</span>
                                          <span>{act.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-center text-[#64748B]">
                  Select a role from the left panel to configure permissions.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: USER ACCOUNTS & STAFF DIRECTORY ────────────────────── */}
        {activeTab === "users" && (
          <div className="bg-white border border-[#DDE2EC] rounded-none flex flex-col flex-1 overflow-hidden shadow-sm">
            
            {/* User Directory Toolbar */}
            <div className="p-4 border-b border-[#DDE2EC] bg-[#F8FAFC] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search staff name, username, or staff ID..."
                  className="w-full md:w-80 bg-white border border-[#DDE2EC] rounded-none px-3.5 py-1.5 text-[13px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1B4FD8]"
                />

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-white border border-[#DDE2EC] rounded-none px-3 py-1.5 text-[12.5px] text-[#334155] font-semibold focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="bg-white border border-[#DDE2EC] rounded-none px-3 py-1.5 text-[12.5px] text-[#334155] font-semibold focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active Only</option>
                  <option value="Inactive">Inactive Only</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setEditingUser({
                    id: "U_" + Date.now(),
                    username: "",
                    password: "password123",
                    name: "",
                    staffId: "STAFF-" + Date.now().toString().slice(-4),
                    roleId: roles[0]?.id || "ROLE_DOCTOR",
                    status: "Active"
                  });
                  setShowUserModal(true);
                }}
                className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white font-semibold text-[13px] px-4 py-1.5 rounded-none transition-colors border border-blue-600 shadow-sm w-full md:w-auto justify-center cursor-pointer"
              >
                + Add New Staff Account
              </button>
            </div>

            {/* Users Data Table */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F1F5F9] border-b border-[#DDE2EC] text-[11.5px] text-[#475569] uppercase font-mono tracking-wider">
                    <th className="px-6 py-3">Staff Account</th>
                    <th className="px-6 py-3">Staff ID</th>
                    <th className="px-6 py-3">Assigned System Role</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[13px] text-[#334155]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-[#64748B]">
                        No user accounts match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const userRole = roles.find((r) => r.id === u.roleId);
                      const isActive = (u.status || "Active") === "Active";

                      return (
                        <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-none bg-blue-50 border border-blue-200 text-[#1B4FD8] font-bold flex items-center justify-center text-xs">
                                {u.name.charAt(0) || u.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-[#0F172A]">{u.name}</div>
                                <div className="text-[11.5px] text-[#64748B] font-mono">@{u.username}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-3.5 font-mono text-[12.5px] text-[#475569]">
                            {u.staffId}
                          </td>

                          <td className="px-6 py-3.5">
                            <span className="text-[12px] bg-blue-50 text-[#1B4FD8] px-2.5 py-0.5 border border-blue-200 font-semibold rounded-none inline-block">
                              {userRole?.name || u.roleId}
                            </span>
                          </td>

                          <td className="px-6 py-3.5">
                            <button
                              type="button"
                              onClick={() => toggleUserStatus(u)}
                              className={`text-[11.5px] font-bold px-2.5 py-0.5 border rounded-none transition-colors cursor-pointer ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              ● {isActive ? "Active Account" : "Inactive"}
                            </button>
                          </td>

                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingUser({ ...u });
                                  setShowUserModal(true);
                                }}
                                className="text-[12px] bg-white hover:bg-gray-50 text-[#1B4FD8] px-2 py-1 border border-[#CBD5E1] font-semibold transition-colors cursor-pointer"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => {
                                  setResetPassUser(u);
                                  setNewPassInput("password123");
                                }}
                                className="text-[12px] bg-white hover:bg-gray-50 text-amber-700 px-2 py-1 border border-[#CBD5E1] font-semibold transition-colors cursor-pointer"
                              >
                                Reset Pass
                              </button>

                              <button
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                className="text-[12px] bg-white hover:bg-red-50 text-red-700 px-2 py-1 border border-red-200 font-semibold transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: SECURITY AUDIT LOGS ────────────────────────────────── */}
        {activeTab === "audit" && (
          <div className="bg-white border border-[#DDE2EC] rounded-none flex flex-col flex-1 overflow-hidden shadow-sm">
            
            {/* Audit Logs Filter Toolbar */}
            <div className="p-4 border-b border-[#DDE2EC] bg-[#F8FAFC] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                <input
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search log description, user, or action..."
                  className="w-full md:w-80 bg-white border border-[#DDE2EC] rounded-none px-3.5 py-1.5 text-[13px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1B4FD8]"
                />

                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="bg-white border border-[#DDE2EC] rounded-none px-3 py-1.5 text-[12.5px] text-[#334155] font-semibold focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
                >
                  <option value="all">All Event Actions</option>
                  {uniqueAuditActions.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>

                <select
                  value={auditUserFilter}
                  onChange={(e) => setAuditUserFilter(e.target.value)}
                  className="bg-white border border-[#DDE2EC] rounded-none px-3 py-1.5 text-[12.5px] text-[#334155] font-semibold focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
                >
                  <option value="all">All Users</option>
                  {uniqueAuditUsers.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>

                <select
                  value={auditDateFilter}
                  onChange={(e) => setAuditDateFilter(e.target.value)}
                  className="bg-white border border-[#DDE2EC] rounded-none px-3 py-1.5 text-[12.5px] text-[#334155] font-semibold focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert("Audit log report exported to CSV.")}
                  className="bg-white hover:bg-gray-50 text-[#334155] text-[12.5px] font-semibold px-3 py-1.5 border border-[#CBD5E1] rounded-none transition-colors shadow-sm cursor-pointer"
                >
                  Export Audit CSV
                </button>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F1F5F9] border-b border-[#DDE2EC] text-[11.5px] text-[#475569] uppercase font-mono tracking-wider">
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Action Event</th>
                    <th className="px-6 py-3">Module</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[13px] text-[#334155]">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-[#64748B]">
                        No audit log records match the selected search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr 
                        key={log.id} 
                        onClick={() => setSelectedAuditLog(log)}
                        className="hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-3 font-mono text-[11.5px] text-[#64748B] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>

                        <td className="px-6 py-3 font-bold text-[#0F172A] whitespace-nowrap">
                          {log.username}
                        </td>

                        <td className="px-6 py-3">
                          <span className="text-[11.5px] bg-blue-50 text-[#1B4FD8] px-2 py-0.5 border border-blue-200 font-semibold rounded-none">
                            {log.action}
                          </span>
                        </td>

                        <td className="px-6 py-3 text-[#64748B] font-medium">
                          {log.module}
                        </td>

                        <td className="px-6 py-3 text-[#334155] max-w-md truncate">
                          {log.description}
                        </td>

                        <td className="px-6 py-3 text-right">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-none border ${
                              log.status === "Success"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: SYSTEM & GOVERNANCE SETTINGS ────────────────────────── */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-4xl">
            
            {/* Security Policies Card */}
            <div className="bg-white border border-[#DDE2EC] rounded-none p-6 space-y-6 shadow-sm">
              <div className="border-b border-[#E2E8F0] pb-4">
                <h3 className="text-base font-bold text-[#0F172A]">Hospital System Security Policies</h3>
                <p className="text-[12.5px] text-[#64748B]">Configure global authentication requirements, session expiry, and access limits.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div>
                    <div className="font-bold text-[#0F172A] text-[13.5px]">Enforce Multi-Factor Auth (MFA)</div>
                    <div className="text-[11.5px] text-[#64748B]">Require OTP code on unknown device logins</div>
                  </div>
                  <button
                    onClick={() => setMfaEnforced(!mfaEnforced)}
                    className={`w-12 h-6 flex items-center p-1 rounded-none border transition-colors cursor-pointer ${
                      mfaEnforced ? "bg-[#1B4FD8] border-blue-600 justify-end" : "bg-gray-200 border-gray-300 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-none shadow"></div>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div>
                    <div className="font-bold text-[#0F172A] text-[13.5px]">Maintenance Mode</div>
                    <div className="text-[11.5px] text-[#64748B]">Restrict logins to Super Admins only</div>
                  </div>
                  <button
                    onClick={() => setMaintenanceMode(!maintenanceMode)}
                    className={`w-12 h-6 flex items-center p-1 rounded-none border transition-colors cursor-pointer ${
                      maintenanceMode ? "bg-amber-600 border-amber-500 justify-end" : "bg-gray-200 border-gray-300 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-none shadow"></div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">Session Idle Timeout (Minutes)</label>
                  <input
                    type="number"
                    value={sessionTimeoutMinutes}
                    onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
                    className="w-full bg-white border border-[#DDE2EC] rounded-none px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">Minimum Password Length</label>
                  <input
                    type="number"
                    value={minPasswordLength}
                    onChange={(e) => setMinPasswordLength(Number(e.target.value))}
                    className="w-full bg-white border border-[#DDE2EC] rounded-none px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#E2E8F0]">
                <button
                  onClick={() => {
                    setSettingsNotice("System governance security policy saved successfully.");
                    setTimeout(() => setSettingsNotice(""), 3000);
                  }}
                  className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white font-semibold text-[13px] px-5 py-2 rounded-none transition-colors border border-blue-600 shadow-sm"
                >
                  Save Governance Policies
                </button>
              </div>

              {settingsNotice && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12.5px] p-3">
                  ✓ {settingsNotice}
                </div>
              )}
            </div>

            {/* AI & OCR Endpoint Diagnostics Card */}
            <div className="bg-white border border-[#DDE2EC] rounded-none p-6 space-y-4 shadow-sm">
              <div className="border-b border-[#E2E8F0] pb-3">
                <h3 className="text-base font-bold text-[#0F172A]">Microservices & AI Gateway Diagnostics</h3>
                <p className="text-[12.5px] text-[#64748B]">Live backend services running behind Nginx API Gateway (Port 8010).</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: "API Gateway (Nginx)", port: "8010", status: "HEALTHY", latency: "4ms" },
                  { name: "Keppler OCR API", port: "7620", status: "HEALTHY", latency: "18ms" },
                  { name: "vLLM Qwen 7B Model", port: "8700", status: "HEALTHY", latency: "42ms" },
                  { name: "Auth & RBAC Service", port: "8010/api/auth", status: "HEALTHY", latency: "8ms" },
                  { name: "ICU Clinical DB Service", port: "8010/api/icu", status: "HEALTHY", latency: "12ms" },
                  { name: "Keppler OCR Frontend Embed", port: "3000", status: "RUNNING", latency: "2ms" },
                ].map((s, idx) => (
                  <div key={idx} className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-bold text-[#0F172A]">{s.name}</div>
                      <div className="text-[11px] font-mono text-[#64748B]">Port {s.port} • Latency {s.latency}</div>
                    </div>
                    <span className="text-[10.5px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 font-bold">
                      ● {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────────── */}

      {/* 1. Create Role Modal */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE2EC] shadow-xl w-full max-w-md rounded-none overflow-hidden">
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#DDE2EC] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A]">Create New Custom Role</h3>
              <button onClick={() => setShowCreateRoleModal(false)} className="text-[#64748B] hover:text-black">✕</button>
            </div>
            <form onSubmit={handleCreateRole} className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">Role Name</label>
                <input
                  required
                  autoFocus
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Senior Critical Care Registrar"
                  className="w-full bg-white border border-[#DDE2EC] rounded-none px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Responsibilities and access scope..."
                  className="w-full bg-white border border-[#DDE2EC] rounded-none px-3.5 py-2 text-[12.5px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowCreateRoleModal(false)}
                  className="bg-white hover:bg-gray-50 text-[#334155] text-[13px] font-semibold px-4 py-2 rounded-none transition-colors border border-[#CBD5E1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[13px] font-semibold px-5 py-2 rounded-none transition-colors border border-blue-600 shadow-sm"
                >
                  Create & Configure Modules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Clone Role Modal */}
      {showCloneRoleModal && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE2EC] shadow-xl w-full max-w-md rounded-none overflow-hidden">
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#DDE2EC] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A]">Clone Existing Role</h3>
              <button onClick={() => setShowCloneRoleModal(false)} className="text-[#64748B] hover:text-black">✕</button>
            </div>
            <form onSubmit={handleCloneRole} className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">Source Role to Copy Permissions From</label>
                <select
                  value={cloneSourceRoleId}
                  onChange={(e) => setCloneSourceRoleId(e.target.value)}
                  className="w-full bg-white border border-[#DDE2EC] rounded-none px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.allowedModules.length} Rules)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">New Role Name</label>
                <input
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. ICU Charge Nurse"
                  className="w-full bg-white border border-[#DDE2EC] rounded-none px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowCloneRoleModal(false)}
                  className="bg-white hover:bg-gray-50 text-[#334155] text-[13px] font-semibold px-4 py-2 rounded-none transition-colors border border-[#CBD5E1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[13px] font-semibold px-5 py-2 rounded-none transition-colors border border-blue-600 shadow-sm"
                >
                  Clone Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Create / Edit User Account Modal */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE2EC] shadow-xl w-full max-w-lg rounded-none overflow-hidden">
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#DDE2EC] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A]">
                {users.some((u) => u.id === editingUser.id) ? "Edit Staff User Account" : "Create New Staff Account"}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="text-[#64748B] hover:text-black">✕</button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">Full Name</label>
                <input
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  placeholder="e.g. Dr. Robert Miller"
                  className="w-full bg-white border border-[#DDE2EC] rounded-none px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">Username ID</label>
                  <input
                    required
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value.toLowerCase().trim() })}
                    placeholder="e.g. rmiller"
                    className="w-full bg-white border border-[#DDE2EC] rounded-none px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">Staff Employee ID</label>
                  <input
                    required
                    value={editingUser.staffId}
                    onChange={(e) => setEditingUser({ ...editingUser, staffId: e.target.value })}
                    placeholder="e.g. DOC-901"
                    className="w-full bg-white border border-[#DDE2EC] rounded-none px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">Assigned System Role</label>
                  <select
                    value={editingUser.roleId}
                    onChange={(e) => setEditingUser({ ...editingUser, roleId: e.target.value })}
                    className="w-full bg-white border border-[#DDE2EC] rounded-none px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-semibold cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">Account Status</label>
                  <select
                    value={editingUser.status || "Active"}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                    className="w-full bg-white border border-[#DDE2EC] rounded-none px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-semibold cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">Initial Account Password</label>
                <input
                  required
                  type="text"
                  value={editingUser.password || "password123"}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  className="w-full bg-white border border-[#DDE2EC] rounded-none px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="bg-white hover:bg-gray-50 text-[#334155] text-[13px] font-semibold px-4 py-2 rounded-none transition-colors border border-[#CBD5E1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[13px] font-semibold px-5 py-2 rounded-none transition-colors border border-blue-600 shadow-sm"
                >
                  Save User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Reset Password Modal */}
      {resetPassUser && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE2EC] shadow-xl w-full max-w-sm rounded-none overflow-hidden">
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#DDE2EC] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A]">Reset Account Password</h3>
              <button onClick={() => setResetPassUser(null)} className="text-[#64748B] hover:text-black">✕</button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="text-[12.5px] text-[#334155]">
                Resetting password for staff member <strong className="text-[#0F172A]">{resetPassUser.name}</strong> (@{resetPassUser.username}).
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">New Password</label>
                <input
                  required
                  type="text"
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  className="w-full bg-white border border-[#DDE2EC] rounded-none px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setResetPassUser(null)}
                  className="bg-white hover:bg-gray-50 text-[#334155] text-[13px] font-semibold px-4 py-2 rounded-none transition-colors border border-[#CBD5E1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-semibold px-4 py-2 rounded-none transition-colors border border-amber-600 shadow-sm"
                >
                  Confirm Password Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Audit Detail Modal */}
      {selectedAuditLog && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE2EC] shadow-xl w-full max-w-lg rounded-none overflow-hidden">
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#DDE2EC] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A]">Security Event Log Inspector</h3>
              <button onClick={() => setSelectedAuditLog(null)} className="text-[#64748B] hover:text-black">✕</button>
            </div>

            <div className="p-6 space-y-4 text-[13px]">
              <div className="grid grid-cols-2 gap-4 bg-[#F8FAFC] p-4 border border-[#E2E8F0]">
                <div>
                  <div className="text-[11px] text-[#64748B] uppercase font-mono">Event ID</div>
                  <div className="font-mono text-[#0F172A] text-[12px]">{selectedAuditLog.id}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B] uppercase font-mono">Timestamp</div>
                  <div className="font-mono text-[#0F172A] text-[12px]">{new Date(selectedAuditLog.timestamp).toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] text-[#64748B] uppercase font-mono">Executing User</div>
                  <div className="font-bold text-[#0F172A]">{selectedAuditLog.username}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B] uppercase font-mono">Event Action</div>
                  <div className="font-semibold text-[#1B4FD8]">{selectedAuditLog.action}</div>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-[#64748B] uppercase font-mono mb-1">Target Module</div>
                <div className="text-[#0F172A] font-mono">{selectedAuditLog.module}</div>
              </div>

              <div>
                <div className="text-[11px] text-[#64748B] uppercase font-mono mb-1">Event Description</div>
                <div className="bg-[#F8FAFC] p-3 border border-[#E2E8F0] text-[#334155] font-mono text-[12px]">
                  {selectedAuditLog.description}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-[#E2E8F0]">
                <button
                  onClick={() => setSelectedAuditLog(null)}
                  className="bg-white hover:bg-gray-50 text-[#334155] text-[13px] font-semibold px-4 py-2 rounded-none transition-colors border border-[#CBD5E1]"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
