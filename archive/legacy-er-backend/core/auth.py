"""Session + RBAC core. Modeled on keppler-reference/.../backend/core/auth.py,
trimmed to the modules ER + Bed Management actually need: dashboard, patients,
op, beds, er, symptom_ai. The permission-derivation mechanism itself
(module_access arrays -> permission sets, admin = everything) is kept
unchanged so @require_permissions("er.registration.write") etc. behave
exactly as the copied modules/er/routes.py and modules/beds/routes.py expect.
"""

import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Union

import bcrypt

from utils.database import get_connection, resolve_hospital_id

SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "hospai_er_session")
SESSION_TTL_HOURS = int(os.getenv("SESSION_TTL_HOURS", "12"))
SESSION_TTL_SECONDS = SESSION_TTL_HOURS * 60 * 60
SESSION_PEPPER = os.getenv("SESSION_PEPPER", "")

USER_TYPES = ("admin", "normal")

ASSIGNABLE_MODULES = (
    "dashboard",
    "patients",
    "op",
    "beds",
    "er",
    "symptom_ai",
)
DEFAULT_NORMAL_MODULES = ("dashboard", "patients", "op")

MODULE_BASE_PERMISSION = {
    "dashboard": "patients.read",
    "patients": "patients.read",
    "op": "op.read",
    "beds": "beds.read",
    "er": "er.read",
    "symptom_ai": "symptom_ai.use",
}

SUB_MODULES = {
    "op": {
        "doctors": {"label": "Doctor Directory", "permissions": ["op.doctors.write"]},
    },
    "beds": {
        "manage": {
            "label": "Add/Edit Beds & Admit/Discharge Patients",
            "permissions": ["beds.write"],
        },
    },
    "er": {
        "registration": {
            "label": "ER Registration & Intake",
            "permissions": ["er.registration.write"],
        },
        "triage": {
            "label": "Triage & Vitals",
            "permissions": ["er.triage.write"],
        },
        "treatment": {
            "label": "Emergency Treatment",
            "permissions": ["er.treatment.write"],
        },
        "doctor_assignment": {
            "label": "Doctor Assignment & Clinical Notes",
            "permissions": ["er.doctor_assignment.write"],
        },
        "disposition": {
            "label": "Disposition Decision",
            "permissions": ["er.disposition.write"],
        },
        # Deliberately not "bed_request": fulfilling an ER bed request is a Bed
        # Management action (calls assign_patient_to_bed() unchanged) and is
        # gated on beds.write instead, so ER clinical staff and Reception stay
        # separate grants.
        "config": {
            "label": "Triage Category Configuration",
            "permissions": ["er.config.write"],
        },
    },
}


def _all_sub_permissions(module: str) -> set:
    result = set()
    for sub in SUB_MODULES.get(module, {}).values():
        result.update(sub["permissions"])
    return result


MODULE_PERMISSION_MAP = {
    module: {base_permission} | _all_sub_permissions(module)
    for module, base_permission in MODULE_BASE_PERMISSION.items()
}

_VALID_MODULE_ACCESS_KEYS = set(ASSIGNABLE_MODULES) | {
    f"{module}.{sub_key}" for module, subs in SUB_MODULES.items() for sub_key in subs
}

ADMIN_PERMISSIONS = set().union(*MODULE_PERMISSION_MAP.values())


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(10)).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _format_ts(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat()


def _parse_ts(value: Union[str, datetime]) -> datetime:
    parsed = value if isinstance(value, datetime) else datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _hash_session_token(token: str) -> str:
    return hashlib.sha256(f"{token}{SESSION_PEPPER}".encode()).hexdigest()


def normalize_module_access(raw_modules, user_type=None) -> list:
    if (user_type or "").strip().lower() == "admin":
        return list(ASSIGNABLE_MODULES)
    if raw_modules is None:
        return []
    if isinstance(raw_modules, list):
        candidates = raw_modules
    elif isinstance(raw_modules, str):
        text = raw_modules.strip()
        if not text:
            candidates = []
        else:
            try:
                decoded = json.loads(text)
                candidates = decoded if isinstance(decoded, list) else [text]
            except json.JSONDecodeError:
                candidates = [part.strip() for part in text.split(",") if part.strip()]
    else:
        candidates = []

    normalized = []
    for module_name in candidates:
        module_key = str(module_name).strip().lower()
        if module_key in _VALID_MODULE_ACCESS_KEYS and module_key not in normalized:
            normalized.append(module_key)
    return normalized


def get_permissions(user_type, module_access=None) -> list:
    if (user_type or "").strip().lower() == "admin":
        return sorted(ADMIN_PERMISSIONS)

    permissions = set()
    for entry in normalize_module_access(module_access, user_type):
        if "." in entry:
            module_name, sub_key = entry.split(".", 1)
            sub = SUB_MODULES.get(module_name, {}).get(sub_key)
            if not sub:
                continue
            permissions.update(sub["permissions"])
            base_permission = MODULE_BASE_PERMISSION.get(module_name)
            if base_permission:
                permissions.add(base_permission)
        else:
            permissions.update(MODULE_PERMISSION_MAP.get(entry, set()))
    return sorted(permissions)


def resolve_user_profile(user_row) -> dict:
    user_type = (user_row.get("user_type") or "normal").strip().lower()
    if user_type not in USER_TYPES:
        user_type = "normal"
    module_access = normalize_module_access(user_row.get("module_access"), user_type)
    return {
        "username": user_row.get("username"),
        "job_role": user_row.get("job_role"),
        "user_type": user_type,
        "module_access": module_access,
        "permissions": get_permissions(user_type, module_access),
        "full_name": user_row.get("full_name"),
        "email": user_row.get("email"),
        "phone": user_row.get("phone"),
        "department": user_row.get("department"),
        "status": user_row.get("status"),
        "hospital_code": user_row.get("hospital_code"),
    }


def resolve_user_permissions(user: dict) -> set:
    explicit_permissions = user.get("permissions")
    if explicit_permissions:
        return set(explicit_permissions)
    return set(get_permissions(user.get("user_type"), user.get("module_access")))


def validate_password(password: str) -> Optional[str]:
    if not password or len(password) < 8:
        return "Password must be at least 8 characters long."
    return None


def create_default_users():
    """Seed a default hospital + a handful of demo accounts covering every
    role the ER/Bed Management workflow needs to exercise end-to-end."""
    hospital_id = resolve_hospital_id()
    defaults = [
        {
            "username": "admin",
            "password": "Admin@123",
            "user_type": "admin",
            "module_access": list(ASSIGNABLE_MODULES),
            "job_role": "Administrator",
            "full_name": "Hospital Admin",
            "department": "Administration",
        },
        {
            "username": "reception",
            "password": "Reception@123",
            "user_type": "normal",
            "module_access": ["dashboard", "patients", "er.registration", "beds"],
            "job_role": "Receptionist",
            "full_name": "ER Reception",
            "department": "Front Desk",
        },
        {
            "username": "nurse",
            "password": "Nurse@123",
            "user_type": "normal",
            "module_access": ["dashboard", "er.triage", "er.treatment"],
            "job_role": "Nurse",
            "full_name": "ER Triage Nurse",
            "department": "Emergency",
        },
        {
            "username": "erdoctor",
            "password": "ErDoctor@123",
            "user_type": "normal",
            "module_access": [
                "dashboard", "op", "symptom_ai",
                "er.doctor_assignment", "er.disposition", "er.config",
            ],
            "job_role": "Doctor",
            "full_name": "Dr. General Medicine",
            "department": "General Medicine",
        },
        {
            "username": "cardiodoctor",
            "password": "Cardio@123",
            "user_type": "normal",
            "module_access": ["dashboard", "op", "symptom_ai", "er.doctor_assignment", "er.disposition"],
            "job_role": "Doctor",
            "full_name": "Dr. Cardiology",
            "department": "Cardiology",
        },
    ]

    with get_connection() as conn:
        cursor = conn.cursor()
        for user in defaults:
            cursor.execute(
                "SELECT id FROM users WHERE hospital_id = ? AND username = ?",
                (hospital_id, user["username"]),
            )
            if cursor.fetchone():
                continue
            cursor.execute(
                """
                INSERT INTO users (
                    hospital_id, username, password_hash, role, access_role, user_type,
                    module_access, job_role, full_name, department, status
                ) VALUES (?, ?, ?, 'employee', ?, ?, ?, ?, ?, ?, 'active')
                """,
                (
                    hospital_id,
                    user["username"],
                    hash_password(user["password"]),
                    "owner" if user["user_type"] == "admin" else "clinician",
                    user["user_type"],
                    json.dumps(user["module_access"], separators=(",", ":")),
                    user["job_role"],
                    user["full_name"],
                    user["department"],
                ),
            )
        conn.commit()


def authenticate(username: str, password: str, hospital_id: Optional[int] = None):
    scoped_hospital_id = hospital_id or resolve_hospital_id()
    with get_connection() as conn:
        cursor = conn.cursor()
        clean_identifier = (username or "").strip()
        cursor.execute(
            """
            SELECT u.id, u.hospital_id, u.username, u.password_hash, u.user_type, u.module_access, u.job_role,
                   u.full_name, u.email, u.phone, u.department, u.status,
                   h.code AS hospital_code, h.status AS hospital_status
            FROM users u
            LEFT JOIN hospitals h ON h.id = u.hospital_id
            WHERE LOWER(u.username) = LOWER(?) AND u.hospital_id = ?
            """,
            (clean_identifier, scoped_hospital_id),
        )
        user = cursor.fetchone()
        if not user:
            return None
        user_map = dict(user)
        if not verify_password(password, user_map.get("password_hash", "")):
            return None
        if user_map.get("status") == "inactive":
            return {"error": "Account is inactive. Please contact administrator."}
        if user_map.get("hospital_status") not in (None, "active"):
            return {"error": "Hospital account is disabled. Please contact administrator."}

        profile = resolve_user_profile(user_map)
        profile["id"] = user_map.get("id")
        profile["hospital_id"] = user_map.get("hospital_id") or scoped_hospital_id
        return profile


def create_session(user_id: int, hospital_id: int, ip_address: Optional[str] = None, user_agent: Optional[str] = None):
    expires_at = _now_utc() + timedelta(hours=SESSION_TTL_HOURS)
    with get_connection() as conn:
        cursor = conn.cursor()
        for _attempt in range(5):
            token = secrets.token_urlsafe(32)
            token_hash = _hash_session_token(token)
            try:
                cursor.execute(
                    "INSERT INTO sessions (user_id, hospital_id, token_hash, expires_at, ip_address, user_agent) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (user_id, hospital_id, token_hash, _format_ts(expires_at), ip_address, user_agent),
                )
                conn.commit()
                return token, expires_at
            except Exception:
                conn.rollback()
                continue
    raise RuntimeError("Failed to create session")


def get_session_user(token: Optional[str]):
    if not token:
        return None
    token_hash = _hash_session_token(token)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT s.id AS session_id, s.expires_at AS expires_at, s.hospital_id AS hospital_id,
                   u.id AS user_id, u.username, u.job_role, u.user_type, u.module_access,
                   u.full_name, u.email, u.phone, u.department, u.status,
                   h.code AS hospital_code, h.status AS hospital_status
            FROM sessions s
            JOIN users u ON s.user_id = u.id AND s.hospital_id = u.hospital_id
            JOIN hospitals h ON s.hospital_id = h.id
            WHERE s.token_hash = ?
            """,
            (token_hash,),
        )
        row = cursor.fetchone()
        if not row:
            return None

        expires_at = _parse_ts(row["expires_at"])
        if expires_at <= _now_utc() or row["status"] == "inactive" or row["hospital_status"] != "active":
            cursor.execute("DELETE FROM sessions WHERE id = ?", (row["session_id"],))
            conn.commit()
            return None

        profile = resolve_user_profile(dict(row))
        profile["id"] = row["user_id"]
        profile["hospital_id"] = row["hospital_id"]
        return profile


def delete_session(token: Optional[str]):
    if not token:
        return
    token_hash = _hash_session_token(token)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))
        conn.commit()
