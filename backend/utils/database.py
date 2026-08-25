"""Minimal persistence layer for the ER + Bed Management backend.

Modeled on keppler-reference/Keppler_healthcare-main-master/backend/utils/database.py
(the source fork ER/Beds was originally built against), trimmed to only the
tables and functions the ER and Bed Management modules actually touch --
see MANIFEST.md's "database.py caveat" for the function list this is scoped to.

Unlike the reference app (which evolved its schema via incremental ALTER
TABLE migrations across many commits), this is a fresh build: every table is
created in its final shape directly, with no historical migration dance.
"""

import json
import math
import os
import re
import uuid as uuid_lib
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

import psycopg2
from psycopg2 import pool as psycopg2_pool
from psycopg2.extras import DictCursor

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(PROJECT_ROOT, ".env"), override=False)

DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()
IST_TIMEZONE = timezone(timedelta(hours=5, minutes=30))
DEFAULT_HOSPITAL_CODE = (os.getenv("DEFAULT_HOSPITAL_CODE") or "hosp-default").strip().lower()

BED_TYPE_DEFAULT_DAILY_RATE = {
    "General": 1500,
    "Semi-Private": 2500,
    "Private": 4000,
    "ICU": 8000,
}


def current_ist_datetime():
    return datetime.now(IST_TIMEZONE)


def current_ist_timestamp():
    return current_ist_datetime().isoformat(timespec="seconds")


def normalize_hospital_code(code):
    value = (code or DEFAULT_HOSPITAL_CODE).strip().lower()
    return value or DEFAULT_HOSPITAL_CODE


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if "connect_timeout" not in url:
        sep = "&" if "?" in url else "?"
        url += f"{sep}connect_timeout=5"
    return url


def _to_sql_params(sql: str):
    return sql.replace("?", "%s")


_PG_POOL = None
_PG_POOL_MINCONN = int(os.getenv("PG_POOL_MIN", "1"))
_PG_POOL_MAXCONN = int(os.getenv("PG_POOL_MAX", "20"))


def _get_pg_pool():
    global _PG_POOL
    if _PG_POOL is None:
        _PG_POOL = psycopg2_pool.ThreadedConnectionPool(
            _PG_POOL_MINCONN,
            _PG_POOL_MAXCONN,
            _normalize_database_url(DATABASE_URL),
            cursor_factory=DictCursor,
        )
    return _PG_POOL


@contextmanager
def get_connection(autocommit: bool = False):
    pool = _get_pg_pool()
    conn = None
    for attempt in range(3):
        try:
            conn = pool.getconn()
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
            conn.rollback()
            break
        except (psycopg2.OperationalError, psycopg2.InterfaceError):
            if conn:
                pool.putconn(conn, close=True)
                conn = None
            if attempt == 2:
                raise
    if not conn:
        raise RuntimeError("Failed to get a working connection from pool")

    conn.autocommit = autocommit
    try:
        yield _CompatConnection(conn)
    except Exception:
        if not autocommit:
            try:
                conn.rollback()
            except (psycopg2.OperationalError, psycopg2.InterfaceError):
                pass
        raise
    finally:
        pool.putconn(conn)


class _CompatConnection:
    def __init__(self, conn):
        self._conn = conn

    def cursor(self):
        return _CompatCursor(self._conn.cursor())

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def __getattr__(self, name):
        return getattr(self._conn, name)


class _CompatCursor:
    def __init__(self, cursor):
        self._cursor = cursor

    def execute(self, query, params=None):
        sql = _to_sql_params(query)
        if params is None:
            return self._cursor.execute(sql)
        return self._cursor.execute(sql, params)

    def fetchone(self):
        return self._wrap_row(self._cursor.fetchone())

    def fetchall(self):
        return [self._wrap_row(row) for row in self._cursor.fetchall()]

    @property
    def rowcount(self):
        return self._cursor.rowcount

    def _wrap_row(self, row):
        if row is None:
            return row
        if hasattr(row, "keys"):
            return row
        description = getattr(self._cursor, "description", None) or []
        columns = [col[0] for col in description]
        if not columns:
            return row
        return _RowProxy(row, columns)

    def __getattr__(self, name):
        return getattr(self._cursor, name)


class _RowProxy:
    def __init__(self, values, columns):
        self._values = tuple(values)
        self._columns = tuple(columns)
        self._index = {name: idx for idx, name in enumerate(self._columns)}

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._values[key]
        return self._values[self._index[key]]

    def get(self, key, default=None):
        if key not in self._index:
            return default
        return self._values[self._index[key]]

    def items(self):
        return [(name, self._values[idx]) for idx, name in enumerate(self._columns)]

    def keys(self):
        return self._columns

    def __iter__(self):
        return iter(self.items())


# ==================== Hospitals (multi-tenancy) ====================

def resolve_hospital_id(hospital_code=None):
    code = normalize_hospital_code(hospital_code)
    hospital = get_hospital_by_code(code)
    if hospital:
        return hospital["id"]
    hospital_id, _created = create_hospital(code)
    return hospital_id


def get_hospital_by_code(hospital_code):
    code = normalize_hospital_code(hospital_code)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM hospitals WHERE code = ?", (code,))
        return cursor.fetchone()


def create_hospital(hospital_code, name=None):
    code = normalize_hospital_code(hospital_code)
    hospital_name = (name or code.replace("-", " ").title()).strip() or "Default Hospital"
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM hospitals WHERE code = ?", (code,))
        existing = cursor.fetchone()
        if existing:
            return existing["id"], False
        cursor.execute(
            "INSERT INTO hospitals (code, name, status) VALUES (?, ?, 'active') RETURNING id",
            (code, hospital_name),
        )
        hospital_id = cursor.fetchone()[0]
        conn.commit()
        return hospital_id, True


# ==================== Schema ====================

OPERATIONAL_TABLES = (
    "patients",
    "admissions",
    "bed_allocations",
    "invoices",
    "patient_consents",
    "er_visits",
    "er_complaints",
    "er_incident_history",
    "er_vitals",
    "er_triage_config",
    "er_triage",
    "er_treatments",
    "er_clinical_notes",
    "er_disposition",
    "er_bed_requests",
)


def init_database():
    with get_connection(autocommit=True) as conn:
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hospitals (
                id SERIAL PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
                disabled_at TIMESTAMP,
                disabled_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
                username TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('employee', 'staff')),
                access_role TEXT DEFAULT 'receptionist',
                user_type TEXT DEFAULT 'normal' CHECK(user_type IN ('admin', 'normal')),
                module_access TEXT DEFAULT '[]',
                job_role TEXT,
                full_name TEXT,
                email TEXT,
                phone TEXT,
                department TEXT,
                employee_id TEXT,
                status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
                password_changed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(hospital_id, username)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
                token_hash TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                ip_address TEXT,
                user_agent TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS patients (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
                patient_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                middle_name TEXT,
                last_name TEXT NOT NULL,
                dob DATE,
                age INTEGER,
                weight REAL,
                height REAL,
                gender TEXT,
                pregnant INTEGER DEFAULT 0,
                allergies TEXT,
                symptoms TEXT,
                phone TEXT,
                address TEXT,
                blood_group TEXT,
                emergency_contact TEXT,
                guardian_name TEXT,
                aadhar_number TEXT,
                registration_source TEXT DEFAULT 'outpatient',
                patient_type TEXT DEFAULT 'regular',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admissions (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
                patient_id TEXT NOT NULL REFERENCES patients(patient_id),
                admission_date TIMESTAMP NOT NULL,
                discharge_date DATE,
                expected_discharge_date DATE,
                discharge_override_reason TEXT,
                er_visit_id INTEGER,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bed_master (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
                ward TEXT NOT NULL,
                room_no TEXT NOT NULL,
                bed_no TEXT NOT NULL,
                bed_type TEXT NOT NULL DEFAULT 'General',
                status TEXT NOT NULL DEFAULT 'Available',
                daily_rate REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(hospital_id, ward, room_no, bed_no)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bed_allocations (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
                admission_id INTEGER NOT NULL,
                bed_id INTEGER NOT NULL,
                patient_id TEXT NOT NULL,
                ward TEXT,
                room_no TEXT,
                bed_no TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                daily_rate REAL,
                previous_allocation_id INTEGER,
                transfer_reason TEXT,
                allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                released_at TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
                invoice_no TEXT UNIQUE NOT NULL,
                patient_id TEXT,
                module TEXT NOT NULL CHECK(module IN ('OP', 'IP', 'LAB', 'PHARMACY', 'ER')),
                subtotal REAL DEFAULT 0,
                tax REAL DEFAULT 0,
                discount REAL DEFAULT 0,
                total_amount REAL NOT NULL,
                paid_amount REAL DEFAULT 0,
                advance_amount REAL DEFAULT 0,
                refunded_amount REAL DEFAULT 0,
                due_amount REAL DEFAULT 0,
                payment_status TEXT DEFAULT 'due' CHECK(payment_status IN ('paid', 'partial', 'due', 'refunded')),
                created_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS patient_consents (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
                er_visit_id INTEGER,
                patient_id TEXT,
                patient_name TEXT NOT NULL,
                consent_type TEXT NOT NULL DEFAULT 'general'
                    CHECK(consent_type IN ('general', 'procedure', 'privacy', 'insurance', 'lama')),
                signed_by TEXT NOT NULL,
                relation_to_patient TEXT,
                witness_doctor TEXT,
                signed_by_phone TEXT,
                refusal_reason TEXT,
                legal_waiver_acknowledged BOOLEAN DEFAULT FALSE,
                status TEXT NOT NULL DEFAULT 'signed' CHECK(status IN ('signed', 'revoked')),
                notes TEXT,
                signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                actor_username TEXT,
                action TEXT NOT NULL,
                module_name TEXT NOT NULL,
                entity_key TEXT,
                payload TEXT,
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # ---- ER / Casualty module ----
        cursor.execute("CREATE SEQUENCE IF NOT EXISTS patient_id_seq START WITH 100001")
        cursor.execute("CREATE SEQUENCE IF NOT EXISTS er_visit_seq START WITH 1")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS er_visits (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL,
                visit_no TEXT UNIQUE NOT NULL,
                patient_id TEXT,
                is_unknown_patient BOOLEAN DEFAULT FALSE,
                unknown_patient_label TEXT,
                merged_into_patient_id TEXT,
                arrival_mode TEXT,
                brought_by TEXT,
                referral_hospital TEXT,
                police_involved BOOLEAN DEFAULT FALSE,
                condition_at_arrival TEXT,
                conscious_status TEXT,
                arrival_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT NOT NULL DEFAULT 'registered',
                assigned_doctor_name TEXT,
                assigned_specialty TEXT,
                doctor_assigned_at TIMESTAMP,
                doctor_accepted_at TIMESTAMP,
                registered_by TEXT,
                closed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS er_complaints (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL,
                er_visit_id INTEGER NOT NULL,
                complaint TEXT NOT NULL,
                severity TEXT,
                start_date DATE,
                start_time TEXT,
                duration TEXT,
                progression TEXT,
                associated_symptoms TEXT,
                source_of_information TEXT,
                reported_by TEXT,
                case_category TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS er_incident_history (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL,
                er_visit_id INTEGER NOT NULL UNIQUE,
                incident_type TEXT,
                incident_at TIMESTAMP,
                incident_time_precision TEXT,
                discovered_at TIMESTAMP,
                details_json JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS er_vitals (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL,
                er_visit_id INTEGER NOT NULL,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                recorded_by TEXT,
                heart_rate INTEGER,
                bp_systolic INTEGER,
                bp_diastolic INTEGER,
                respiratory_rate INTEGER,
                spo2 INTEGER,
                temperature REAL,
                consciousness_level TEXT,
                blood_glucose REAL,
                pain_score INTEGER,
                gcs INTEGER,
                pupillary_response TEXT,
                notes TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS er_triage_config (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL,
                category_code TEXT NOT NULL,
                category_label TEXT NOT NULL,
                description TEXT,
                sort_order INTEGER DEFAULT 0,
                color TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_er_triage_config_code "
            "ON er_triage_config(hospital_id, category_code)"
        )
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS er_triage (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL,
                er_visit_id INTEGER NOT NULL UNIQUE,
                category TEXT NOT NULL,
                triage_bed_label TEXT,
                reason TEXT,
                assigned_by TEXT,
                triaged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS er_treatments (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL,
                er_visit_id INTEGER NOT NULL,
                intervention_type TEXT NOT NULL,
                description TEXT,
                administered_by TEXT,
                prescribed_by TEXT,
                performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS er_clinical_notes (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL,
                er_visit_id INTEGER NOT NULL,
                note_type TEXT NOT NULL DEFAULT 'assessment',
                author TEXT,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS er_disposition (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL,
                er_visit_id INTEGER NOT NULL UNIQUE,
                outcome TEXT NOT NULL,
                required_specialty TEXT,
                clinical_reason TEXT NOT NULL,
                decided_by TEXT,
                decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                priority TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS er_bed_requests (
                id SERIAL PRIMARY KEY,
                hospital_id INTEGER NOT NULL,
                er_visit_id INTEGER NOT NULL,
                disposition_id INTEGER NOT NULL,
                requested_level_of_care TEXT NOT NULL,
                requested_specialty TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                requested_by TEXT,
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                allocated_bed_id INTEGER,
                allocated_admission_id INTEGER,
                allocated_by TEXT,
                allocated_at TIMESTAMP
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_patient_id ON patients(patient_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_er_visits_hospital ON er_visits(hospital_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_er_visits_patient ON er_visits(patient_id)")
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_er_bed_requests_status ON er_bed_requests(hospital_id, status)"
        )

        # uuid + audit/soft-delete columns on every operational table, matching
        # the reference app's multi-tenant/audit convention.
        for table_name in OPERATIONAL_TABLES:
            for column, col_type in (
                ("uuid", "TEXT"),
                ("created_by", "TEXT"),
                ("updated_by", "TEXT"),
                ("deleted_by", "TEXT"),
                ("deleted_at", "TIMESTAMP"),
            ):
                _ensure_column(cursor, table_name, column, col_type)
            cursor.execute(
                f"ALTER TABLE {table_name} ALTER COLUMN uuid SET DEFAULT gen_random_uuid()::text"
            )
            cursor.execute(
                f"CREATE UNIQUE INDEX IF NOT EXISTS idx_{table_name}_uuid ON {table_name}(uuid)"
            )

        conn.commit()


def _ensure_column(cursor, table_name: str, column_name: str, postgres_type: str):
    cursor.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_name = ? AND column_name = ?",
        (table_name, column_name),
    )
    if cursor.fetchone():
        return
    cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {postgres_type}")


# ==================== Patients ====================

def generate_patient_id(hospital_id=None):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT nextval('patient_id_seq')")
        issued = cursor.fetchone()[0]
        conn.commit()
    return f"PAT-{issued}"


def generate_er_patient_id(hospital_id=None):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT nextval('patient_id_seq')")
        issued = cursor.fetchone()[0]
        conn.commit()
    return f"ER-PAT-{issued}"


def check_duplicate_patient(name, last_name, dob, phone, hospital_id=None):
    scoped_hospital_id = hospital_id or resolve_hospital_id()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT patient_id, name, last_name FROM patients
            WHERE hospital_id = ? AND deleted_at IS NULL AND LOWER(name) = LOWER(?) AND LOWER(last_name) = LOWER(?)
            AND (dob = ? OR phone = ?)
            """,
            (scoped_hospital_id, name, last_name, dob, phone),
        )
        return cursor.fetchone()


def add_patient(data, hospital_id=None):
    scoped_hospital_id = hospital_id or data.get("hospital_id") or resolve_hospital_id()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO patients (
                hospital_id, patient_id, name, middle_name, last_name, dob, age, weight, height,
                gender, pregnant, allergies, symptoms, phone, address, blood_group,
                emergency_contact, guardian_name, aadhar_number, registration_source, patient_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                scoped_hospital_id,
                data["patient_id"],
                data["name"],
                data.get("middle_name", ""),
                data["last_name"],
                data.get("dob"),
                data.get("age"),
                data.get("weight"),
                data.get("height"),
                data.get("gender"),
                data.get("pregnant", 0),
                data.get("allergies", ""),
                data.get("symptoms", ""),
                data.get("phone", ""),
                data.get("address", ""),
                data.get("blood_group", ""),
                data.get("emergency_contact", ""),
                data.get("guardian_name", ""),
                data.get("aadhar_number", ""),
                data.get("registration_source", "outpatient"),
                data.get("patient_type", "regular"),
            ),
        )
        conn.commit()
        return data["patient_id"]


def get_patient(patient_id, hospital_id=None):
    scoped_hospital_id = hospital_id or resolve_hospital_id()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM patients WHERE patient_id = ? AND hospital_id = ? AND deleted_at IS NULL",
            (patient_id, scoped_hospital_id),
        )
        return cursor.fetchone()


def add_admission(patient_id, notes="", hospital_id=None):
    scoped_hospital_id = hospital_id or resolve_hospital_id()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO admissions (hospital_id, patient_id, admission_date, notes) "
            "VALUES (?, ?, ?, ?) RETURNING id",
            (scoped_hospital_id, patient_id, current_ist_timestamp(), notes),
        )
        admission_id = cursor.fetchone()[0]
        conn.commit()
        return admission_id


# ==================== Departments / Doctors (op module, minimal) ====================
# Doctors are users with job_role='Doctor' -- there is no separate "doctors"
# table in this build (matches how get_suggested_doctors/list_doctors already
# read from `users` in the reference app; the standalone `doctors` table
# there is dead weight for this feature and was intentionally not ported).

def list_departments(hospital_id=None):
    scoped_hospital_id = hospital_id or resolve_hospital_id()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT DISTINCT department AS department_name
            FROM users
            WHERE hospital_id = ? AND department IS NOT NULL AND department != ''
              AND status = 'active' AND LOWER(job_role) = 'doctor'
            ORDER BY department_name ASC
            """,
            (scoped_hospital_id,),
        )
        return cursor.fetchall()


def list_doctors(department=None, hospital_id=None):
    scoped_hospital_id = hospital_id or resolve_hospital_id()
    with get_connection() as conn:
        cursor = conn.cursor()
        query = """
            SELECT id, full_name AS doctor_name, department, status
            FROM users
            WHERE LOWER(job_role) = 'doctor' AND hospital_id = ?
        """
        if department:
            cursor.execute(
                f"SELECT * FROM ({query}) AS combined WHERE department = ? ORDER BY doctor_name",
                (scoped_hospital_id, department),
            )
        else:
            cursor.execute(
                f"SELECT * FROM ({query}) AS combined ORDER BY doctor_name",
                (scoped_hospital_id,),
            )
        return [dict(row) for row in cursor.fetchall()]


def get_suggested_doctors(department=None, region=None, hospital_id=None):
    scoped_hospital_id = hospital_id or resolve_hospital_id()
    region_dept_map = {
        "chest": "Cardiology", "head": "Neurology", "neck": "ENT",
        "abdomen": "General Medicine", "hips": "Orthopedics", "thighs": "Orthopedics",
        "knees": "Orthopedics", "feet": "Orthopedics", "arms": "Orthopedics",
        "skin": "Dermatology", "full_body": "General Medicine",
    }
    target_dept = department
    if not target_dept and region:
        target_dept = region_dept_map.get(region.lower(), "General Medicine")

    with get_connection() as conn:
        cursor = conn.cursor()
        query = """
            SELECT id, full_name AS doctor_name, department, status
            FROM users
            WHERE LOWER(job_role) = 'doctor' AND hospital_id = ?
        """
        if target_dept:
            cursor.execute(
                f"SELECT * FROM ({query}) AS combined WHERE LOWER(department) LIKE LOWER(?) ORDER BY doctor_name",
                (scoped_hospital_id, f"%{target_dept}%"),
            )
            matched = [dict(row) for row in cursor.fetchall()]
            if matched:
                return matched
        cursor.execute(
            f"SELECT * FROM ({query}) AS combined ORDER BY doctor_name",
            (scoped_hospital_id,),
        )
        return [dict(row) for row in cursor.fetchall()]


def match_doctor_to_department(available_doctors, department):
    """Picks the first entry from available_doctors (each formatted
    "Name (Department)") whose parenthetical department matches department,
    case-insensitively. Shared by symptom_ai's AI triage and ER doctor
    assignment -- same "suggest, don't decide" mechanism in both places."""
    target = (department or "").strip().lower()
    if not target:
        return ""
    for doc_entry in available_doctors or []:
        m = re.match(r"^(.*)\(([^()]*)\)\s*$", doc_entry.strip())
        doc_name, doc_dept = (
            (m.group(1).strip(), m.group(2).strip().lower()) if m else (doc_entry.strip(), "")
        )
        if doc_dept == target:
            return doc_name
    return ""


# ==================== Patient consents ====================

def create_patient_consent(data, hospital_id=None):
    scoped_hospital_id = hospital_id or data.get("hospital_id") or resolve_hospital_id()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO patient_consents (
                hospital_id, er_visit_id, patient_id, patient_name, consent_type, signed_by,
                relation_to_patient, witness_doctor, signed_by_phone, refusal_reason,
                legal_waiver_acknowledged, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
            """,
            (
                scoped_hospital_id,
                data.get("er_visit_id"),
                data.get("patient_id"),
                data["patient_name"],
                data.get("consent_type", "general"),
                data["signed_by"],
                data.get("relation_to_patient"),
                data.get("witness_doctor"),
                data.get("signed_by_phone"),
                data.get("refusal_reason"),
                bool(data.get("legal_waiver_acknowledged", False)),
                data.get("status", "signed"),
                data.get("notes"),
            ),
        )
        consent_id = cursor.fetchone()[0]
        conn.commit()
        return consent_id


def list_patient_consents(patient_id=None, er_visit_id=None, hospital_id=None):
    scoped_hospital_id = hospital_id or resolve_hospital_id()
    with get_connection() as conn:
        cursor = conn.cursor()
        clauses = ["hospital_id = ?"]
        params = [scoped_hospital_id]
        if patient_id:
            clauses.append("patient_id = ?")
            params.append(patient_id)
        if er_visit_id:
            clauses.append("er_visit_id = ?")
            params.append(er_visit_id)
        cursor.execute(
            f"SELECT * FROM patient_consents WHERE {' AND '.join(clauses)} "
            "ORDER BY signed_at DESC, id DESC",
            tuple(params),
        )
        return cursor.fetchall()


# ==================== Invoices ====================

def create_invoice(data, hospital_id=None):
    scoped_hospital_id = hospital_id or resolve_hospital_id()
    with get_connection() as conn:
        cursor = conn.cursor()
        paid_amount = float(data.get("paid_amount", 0) or 0)
        advance_amount = float(data.get("advance_amount", 0) or 0)
        refunded_amount = float(data.get("refunded_amount", 0) or 0)
        collected_amount = max(paid_amount + advance_amount - refunded_amount, 0.0)
        total_amount = float(data["total_amount"])
        due_amount = max(total_amount - collected_amount, 0.0)
        cursor.execute(
            """
            INSERT INTO invoices (
                hospital_id, invoice_no, patient_id, module, subtotal, tax, discount,
                total_amount, paid_amount, due_amount, payment_status, created_by,
                advance_amount, refunded_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
            """,
            (
                scoped_hospital_id,
                data["invoice_no"],
                data.get("patient_id"),
                data["module"],
                data.get("subtotal", 0),
                data.get("tax", 0),
                data.get("discount", 0),
                total_amount,
                paid_amount,
                data.get("due_amount", due_amount),
                data.get("payment_status", "due"),
                data.get("created_by"),
                advance_amount,
                refunded_amount,
            ),
        )
        invoice_id = cursor.fetchone()[0]
        conn.commit()
        return invoice_id


# ==================== Beds ====================

def list_beds(hospital_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                b.id, b.ward, b.room_no, b.bed_no, b.bed_type, b.status, b.daily_rate,
                ba.id AS allocation_id, ba.admission_id, ba.allocated_at,
                p.patient_id, p.name AS patient_name, p.last_name AS patient_last_name,
                p.phone AS patient_phone, p.age AS patient_age, p.gender AS patient_gender,
                a.notes AS admission_notes, a.admission_date, a.expected_discharge_date
            FROM bed_master b
            LEFT JOIN bed_allocations ba ON ba.bed_id = b.id AND ba.status = 'active'
            LEFT JOIN patients p ON p.patient_id = ba.patient_id
            LEFT JOIN admissions a ON a.id = ba.admission_id
            WHERE b.hospital_id = ?
            ORDER BY b.ward, b.room_no,
                CASE WHEN b.bed_no ~ '^[0-9]+$' THEN LPAD(b.bed_no, 10, '0') ELSE b.bed_no END
            """,
            (hospital_id,),
        )
        rows = [dict(row) for row in cursor.fetchall()]
        for row in rows:
            for field in ("allocated_at", "admission_date", "expected_discharge_date"):
                if row.get(field) is not None and hasattr(row[field], "isoformat"):
                    row[field] = row[field].isoformat()
        return rows


def get_bed(bed_id, hospital_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM bed_master WHERE id = ? AND hospital_id = ?", (bed_id, hospital_id)
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def create_bed(hospital_id, ward, room_no, bed_no, bed_type, daily_rate=None):
    rate = daily_rate if daily_rate is not None else BED_TYPE_DEFAULT_DAILY_RATE.get(
        bed_type, BED_TYPE_DEFAULT_DAILY_RATE["General"]
    )
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO bed_master (hospital_id, ward, room_no, bed_no, bed_type, status, daily_rate)
            VALUES (?, ?, ?, ?, ?, 'Available', ?)
            RETURNING id
            """,
            (hospital_id, ward, room_no, bed_no, bed_type, rate),
        )
        bed_id = cursor.fetchone()[0]
        conn.commit()
        return bed_id


def create_beds_range(hospital_id, ward, room_no, bed_type, from_bed, to_bed, daily_rate=None):
    rate = daily_rate if daily_rate is not None else BED_TYPE_DEFAULT_DAILY_RATE.get(
        bed_type, BED_TYPE_DEFAULT_DAILY_RATE["General"]
    )
    created, skipped = [], []
    with get_connection() as conn:
        cursor = conn.cursor()
        for n in range(from_bed, to_bed + 1):
            bed_no = str(n)
            cursor.execute(
                """
                INSERT INTO bed_master (hospital_id, ward, room_no, bed_no, bed_type, status, daily_rate)
                VALUES (?, ?, ?, ?, ?, 'Available', ?)
                ON CONFLICT (hospital_id, ward, room_no, bed_no) DO NOTHING
                RETURNING id
                """,
                (hospital_id, ward, room_no, bed_no, bed_type, rate),
            )
            (created if cursor.fetchone() else skipped).append(bed_no)
        conn.commit()
    return {"created": created, "skipped": skipped}


def update_bed(bed_id, hospital_id, **fields):
    if not fields:
        return False
    columns = list(fields.keys())
    set_clause = ", ".join(f"{col} = ?" for col in columns)
    values = [fields[col] for col in columns]
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"UPDATE bed_master SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND hospital_id = ?",
            (*values, bed_id, hospital_id),
        )
        updated = cursor.rowcount > 0
        conn.commit()
        return updated


def delete_bed(bed_id, hospital_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM bed_master WHERE id = ? AND hospital_id = ? AND status != 'Occupied'",
            (bed_id, hospital_id),
        )
        deleted = cursor.rowcount > 0
        conn.commit()
        return deleted


def find_active_bed_for_patient(patient_id, hospital_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT b.id, b.ward, b.room_no, b.bed_no
            FROM bed_allocations ba
            JOIN bed_master b ON b.id = ba.bed_id
            WHERE ba.patient_id = ? AND ba.hospital_id = ? AND ba.status = 'active'
            LIMIT 1
            """,
            (patient_id, hospital_id),
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def assign_patient_to_bed(hospital_id, bed_id, patient_id, notes, expected_los_days=None):
    """Admitting a patient into a bed IS the admission -- creates the
    admissions row and the bed_allocations link in one step. The bed_id
    always comes from the caller (Reception); this function never picks
    one itself -- that boundary is what the whole ER module is built around."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT ward, room_no, bed_no, status, daily_rate FROM bed_master WHERE id = ? AND hospital_id = ?",
            (bed_id, hospital_id),
        )
        bed = cursor.fetchone()
        if not bed:
            return None
        if bed["status"] != "Available":
            raise ValueError("This bed is no longer available.")

        admission_timestamp = current_ist_timestamp()
        expected_discharge_date = None
        if expected_los_days:
            expected_discharge_date = (
                current_ist_datetime().date() + timedelta(days=int(expected_los_days))
            )
        cursor.execute(
            """
            INSERT INTO admissions (hospital_id, patient_id, admission_date, notes, expected_discharge_date)
            VALUES (?, ?, ?, ?, ?) RETURNING id
            """,
            (hospital_id, patient_id, admission_timestamp, notes, expected_discharge_date),
        )
        admission_id = cursor.fetchone()[0]

        cursor.execute(
            """
            INSERT INTO bed_allocations
                (hospital_id, bed_id, admission_id, patient_id, ward, room_no, bed_no, status, daily_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
            RETURNING id
            """,
            (hospital_id, bed_id, admission_id, patient_id, bed["ward"], bed["room_no"], bed["bed_no"], bed["daily_rate"]),
        )
        allocation_id = cursor.fetchone()[0]

        cursor.execute(
            "UPDATE bed_master SET status = 'Occupied', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (bed_id,),
        )
        conn.commit()
        return {"admission_id": admission_id, "allocation_id": allocation_id}


def compute_room_charges(hospital_id, admission_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT ward, room_no, bed_no, allocated_at, released_at, daily_rate "
            "FROM bed_allocations WHERE hospital_id = ? AND admission_id = ? ORDER BY allocated_at ASC",
            (hospital_id, admission_id),
        )
        rows = cursor.fetchall()

    segments, total = [], 0.0
    now = current_ist_datetime().replace(tzinfo=None)
    for row in rows:
        allocated_at = row["allocated_at"]
        released_at = row["released_at"] or now
        if isinstance(allocated_at, str):
            allocated_at = datetime.fromisoformat(allocated_at)
        if isinstance(released_at, str):
            released_at = datetime.fromisoformat(released_at)
        if allocated_at.tzinfo:
            allocated_at = allocated_at.replace(tzinfo=None)
        if released_at.tzinfo:
            released_at = released_at.replace(tzinfo=None)
        elapsed_seconds = (released_at - allocated_at).total_seconds()
        days = max(1, math.ceil(elapsed_seconds / 86400))
        rate = float(row["daily_rate"] or 0)
        amount = days * rate
        total += amount
        segments.append({
            "ward": row["ward"], "room_no": row["room_no"], "bed_no": row["bed_no"],
            "days": days, "daily_rate": rate, "amount": amount,
        })
    return {"segments": segments, "total": total}


def release_bed(hospital_id, bed_id, discharge_override_reason=None, room_charge_total=None, created_by=None):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, admission_id, patient_id FROM bed_allocations "
            "WHERE bed_id = ? AND hospital_id = ? AND status = 'active'",
            (bed_id, hospital_id),
        )
        allocation = cursor.fetchone()
        if not allocation:
            return False

        cursor.execute(
            "UPDATE bed_allocations SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE id = ?",
            (allocation["id"],),
        )
        cursor.execute(
            "UPDATE admissions SET discharge_date = CURRENT_DATE, "
            "discharge_override_reason = COALESCE(?, discharge_override_reason) "
            "WHERE id = ? AND discharge_date IS NULL",
            (discharge_override_reason, allocation["admission_id"]),
        )
        cursor.execute(
            "UPDATE bed_master SET status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (bed_id,),
        )
        patient_id = allocation["patient_id"]
        conn.commit()

    total = (
        room_charge_total if room_charge_total is not None
        else compute_room_charges(hospital_id, allocation["admission_id"])["total"]
    )
    if total and total > 0:
        invoice_no = f"INV-IP-{allocation['admission_id']}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        create_invoice(
            {
                "invoice_no": invoice_no, "patient_id": patient_id, "module": "IP",
                "total_amount": total, "subtotal": total, "payment_status": "due",
                "created_by": created_by,
            },
            hospital_id=hospital_id,
        )
    return True


def transfer_bed(hospital_id, from_bed_id, to_bed_id, reason=None):
    if from_bed_id == to_bed_id:
        raise ValueError("Source and destination beds must be different.")

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, admission_id, patient_id FROM bed_allocations "
            "WHERE bed_id = ? AND hospital_id = ? AND status = 'active'",
            (from_bed_id, hospital_id),
        )
        current_allocation = cursor.fetchone()
        if not current_allocation:
            raise ValueError("No active patient found in the source bed.")

        cursor.execute(
            "SELECT ward, room_no, bed_no, status, daily_rate FROM bed_master WHERE id = ? AND hospital_id = ?",
            (to_bed_id, hospital_id),
        )
        target_bed = cursor.fetchone()
        if not target_bed:
            raise ValueError("Destination bed not found.")
        if target_bed["status"] != "Available":
            raise ValueError("Destination bed is not available.")

        cursor.execute(
            "UPDATE bed_allocations SET status = 'transferred', released_at = CURRENT_TIMESTAMP WHERE id = ?",
            (current_allocation["id"],),
        )
        cursor.execute(
            """
            INSERT INTO bed_allocations
                (hospital_id, bed_id, admission_id, patient_id, ward, room_no, bed_no,
                 status, previous_allocation_id, transfer_reason, daily_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
            RETURNING id
            """,
            (
                hospital_id, to_bed_id, current_allocation["admission_id"], current_allocation["patient_id"],
                target_bed["ward"], target_bed["room_no"], target_bed["bed_no"],
                current_allocation["id"], reason, target_bed["daily_rate"],
            ),
        )
        new_allocation_id = cursor.fetchone()[0]

        cursor.execute(
            "UPDATE bed_master SET status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (from_bed_id,),
        )
        cursor.execute(
            "UPDATE bed_master SET status = 'Occupied', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (to_bed_id,),
        )
        conn.commit()
        return {
            "allocation_id": new_allocation_id,
            "admission_id": current_allocation["admission_id"],
            "from_bed": from_bed_id, "to_bed": to_bed_id,
        }


def get_discharge_checklist(hospital_id, bed_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, admission_id, patient_id FROM bed_allocations "
            "WHERE bed_id = ? AND hospital_id = ? AND status = 'active'",
            (bed_id, hospital_id),
        )
        allocation = cursor.fetchone()
        if not allocation:
            return None

        cursor.execute(
            """
            SELECT invoice_no, total_amount, paid_amount, due_amount, payment_status
            FROM invoices
            WHERE patient_id = ? AND hospital_id = ? AND deleted_at IS NULL
              AND payment_status IN ('due', 'partial')
            """,
            (allocation["patient_id"], hospital_id),
        )
        pending_invoices = [dict(row) for row in cursor.fetchall()]
        billing_ok = len(pending_invoices) == 0
        admission_id = allocation["admission_id"]
        patient_id = allocation["patient_id"]

    room_charges = compute_room_charges(hospital_id, admission_id)
    return {
        "admission_id": admission_id,
        "patient_id": patient_id,
        "billing": {"ok": billing_ok, "pending_invoices": pending_invoices},
        "room_charges": room_charges,
        "clear": billing_ok,
    }


# ==================== ER / Casualty module ====================

# Deliberately collapsed vs. a more granular status list: the *clinical*
# outcome detail always lives in er_disposition.outcome, so er_visits.status
# only needs to track coarse workflow progress for the queue view.
ER_STATUS_TRANSITIONS = {
    "registered": {"triaged", "closed"},
    "triaged": {"under_treatment", "doctor_assigned", "closed"},
    "under_treatment": {"doctor_assigned", "under_investigation", "stabilized", "closed"},
    "doctor_assigned": {"under_treatment", "under_investigation", "stabilized", "awaiting_disposition", "closed"},
    "under_investigation": {"under_treatment", "stabilized", "awaiting_disposition", "closed"},
    "stabilized": {"under_treatment", "under_investigation", "awaiting_disposition", "closed"},
    "awaiting_disposition": {"bed_requested", "closed"},
    "bed_requested": {"bed_allocated", "closed"},
    "bed_allocated": {"transferred", "closed"},
    "transferred": {"closed"},
    "closed": set(),
}

# Disposition outcomes that need a physical bed -- these get an er_bed_requests
# row; everything else (including "lama") closes the visit directly.
ER_OUTCOMES_REQUIRING_BED = {"ward", "icu", "ot", "observation"}


def update_er_visit_status(hospital_id, er_visit_id, new_status):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT status FROM er_visits WHERE id = ? AND hospital_id = ?",
            (er_visit_id, hospital_id),
        )
        row = cursor.fetchone()
        if not row:
            raise ValueError("ER visit not found.")
        current_status = row["status"]
        if new_status != current_status and new_status not in ER_STATUS_TRANSITIONS.get(current_status, set()):
            raise ValueError(f"Cannot move ER visit from '{current_status}' to '{new_status}'.")
        closed_clause = ", closed_at = CURRENT_TIMESTAMP" if new_status == "closed" else ""
        cursor.execute(
            f"UPDATE er_visits SET status = ?{closed_clause} WHERE id = ?",
            (new_status, er_visit_id),
        )
        conn.commit()
        return True


def create_er_visit(data, hospital_id=None):
    scoped_hospital_id = hospital_id or resolve_hospital_id()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT nextval('er_visit_seq')")
        seq = cursor.fetchone()[0]
        visit_no = f"ER-{current_ist_datetime().year}-{int(seq):06d}"
        cursor.execute(
            """
            INSERT INTO er_visits (
                hospital_id, visit_no, patient_id, is_unknown_patient, unknown_patient_label,
                arrival_mode, brought_by, referral_hospital, police_involved,
                condition_at_arrival, conscious_status, registered_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
            """,
            (
                scoped_hospital_id, visit_no, data.get("patient_id"),
                bool(data.get("is_unknown_patient", False)), data.get("unknown_patient_label"),
                data.get("arrival_mode"), data.get("brought_by"), data.get("referral_hospital"),
                bool(data.get("police_involved", False)), data.get("condition_at_arrival"),
                data.get("conscious_status"), data.get("registered_by"),
            ),
        )
        visit_id = cursor.fetchone()[0]
        conn.commit()
        return {"id": visit_id, "visit_no": visit_no}


def register_er_patient(hospital_id, patient_data, visit_data, complaints=None, vitals=None, registered_by=None):
    """Atomically registers an emergency room patient and opens their ER visit
    without needing any OP registration detour or merge steps."""
    scoped_hospital_id = hospital_id or resolve_hospital_id()

    patient_id = patient_data.get("patient_id")
    if not patient_id:
        patient_id = generate_er_patient_id(scoped_hospital_id)

    name = (patient_data.get("name") or "Emergency Patient").strip()
    middle_name = (patient_data.get("middle_name") or "").strip()
    last_name = (patient_data.get("last_name") or "").strip()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO patients (
                hospital_id, patient_id, name, middle_name, last_name,
                dob, age, weight, height, gender, pregnant,
                allergies, symptoms, phone, address, blood_group,
                emergency_contact, guardian_name, aadhar_number, registration_source, patient_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'emergency', 'emergency')
            """,
            (
                scoped_hospital_id, patient_id, name, middle_name, last_name,
                patient_data.get("dob"), patient_data.get("age"), patient_data.get("weight"),
                patient_data.get("height"), patient_data.get("gender"),
                1 if patient_data.get("pregnant") else 0,
                patient_data.get("allergies", ""), patient_data.get("symptoms", ""),
                patient_data.get("phone", ""), patient_data.get("address", ""),
                patient_data.get("blood_group", ""), patient_data.get("emergency_contact", ""),
                patient_data.get("guardian_name", ""), patient_data.get("aadhar_number", ""),
            ),
        )
        conn.commit()

    try:
        visit_payload = dict(visit_data or {})
        visit_payload["patient_id"] = patient_id
        visit_payload["is_unknown_patient"] = False
        visit_payload["registered_by"] = registered_by or visit_payload.get("registered_by")
        visit_result = create_er_visit(visit_payload, hospital_id=scoped_hospital_id)
        visit_id = visit_result["id"]

        if complaints:
            if isinstance(complaints, list):
                for c in complaints:
                    if isinstance(c, str) and c.strip():
                        add_er_complaint(scoped_hospital_id, visit_id, {"complaint": c.strip(), "reported_by": registered_by})
                    elif isinstance(c, dict) and c.get("complaint"):
                        c.setdefault("reported_by", registered_by)
                        add_er_complaint(scoped_hospital_id, visit_id, c)
            elif isinstance(complaints, str) and complaints.strip():
                add_er_complaint(scoped_hospital_id, visit_id, {"complaint": complaints.strip(), "reported_by": registered_by})

        if vitals and isinstance(vitals, dict):
            has_vitals = any(
                vitals.get(k) is not None and str(vitals.get(k)).strip() != ""
                for k in ["heart_rate", "bp_systolic", "bp_diastolic", "spo2", "temperature", "respiratory_rate", "pain_score", "gcs"]
            )
            if has_vitals:
                add_er_vitals(scoped_hospital_id, visit_id, vitals, recorded_by=registered_by)
    except Exception:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM patients WHERE patient_id = ? AND hospital_id = ?",
                (patient_id, scoped_hospital_id),
            )
            conn.commit()
        raise

    patient_record = get_patient(patient_id, hospital_id=scoped_hospital_id)
    return {
        "patient_id": patient_id,
        "patient": dict(patient_record) if patient_record else patient_data,
        "visit": visit_result,
    }


def list_er_visits(patient_id=None, hospital_id=None, status=None, active_only=False):
    with get_connection() as conn:
        cursor = conn.cursor()
        clauses = ["v.deleted_at IS NULL"]
        params = []
        if hospital_id:
            clauses.append("v.hospital_id = ?")
            params.append(hospital_id)
        if patient_id:
            clauses.append("v.patient_id = ?")
            params.append(patient_id)
        if status:
            clauses.append("v.status = ?")
            params.append(status)
        if active_only:
            clauses.append("v.status != 'closed'")
        where_clause = f" WHERE {' AND '.join(clauses)}"
        cursor.execute(
            f"""
            SELECT v.*, t.category AS triage_category, t.triage_bed_label AS triage_bed_label,
                   p.name AS patient_name, p.last_name AS patient_last_name, p.gender AS patient_gender,
                   p.age AS patient_age, p.phone AS patient_phone, p.emergency_contact AS patient_emergency_contact
            FROM er_visits v
            LEFT JOIN er_triage t ON t.er_visit_id = v.id
            LEFT JOIN patients p ON p.patient_id = v.patient_id AND p.hospital_id = v.hospital_id
            {where_clause}
            ORDER BY v.arrival_at DESC
            """,
            tuple(params),
        )
        return cursor.fetchall()


def get_er_visit(er_visit_id, hospital_id=None):
    scoped_hospital_id = hospital_id or resolve_hospital_id()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM er_visits WHERE id = ? AND hospital_id = ? AND deleted_at IS NULL",
            (er_visit_id, scoped_hospital_id),
        )
        visit = cursor.fetchone()
        if not visit:
            return None
        visit = dict(visit)

        if visit.get("patient_id"):
            cursor.execute(
                "SELECT * FROM patients WHERE patient_id = ? AND hospital_id = ? AND deleted_at IS NULL",
                (visit["patient_id"], scoped_hospital_id),
            )
            p_row = cursor.fetchone()
            visit["patient"] = dict(p_row) if p_row else None
        else:
            visit["patient"] = None

        cursor.execute("SELECT * FROM er_complaints WHERE er_visit_id = ? ORDER BY created_at ASC", (er_visit_id,))
        visit["complaints"] = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM er_incident_history WHERE er_visit_id = ?", (er_visit_id,))
        incident = cursor.fetchone()
        visit["incident_history"] = dict(incident) if incident else None

        cursor.execute("SELECT * FROM er_vitals WHERE er_visit_id = ? ORDER BY recorded_at ASC", (er_visit_id,))
        visit["vitals"] = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM er_triage WHERE er_visit_id = ?", (er_visit_id,))
        triage = cursor.fetchone()
        visit["triage"] = dict(triage) if triage else None

        cursor.execute("SELECT * FROM er_treatments WHERE er_visit_id = ? ORDER BY performed_at ASC", (er_visit_id,))
        visit["treatments"] = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM er_clinical_notes WHERE er_visit_id = ? ORDER BY created_at ASC", (er_visit_id,))
        visit["clinical_notes"] = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM er_disposition WHERE er_visit_id = ?", (er_visit_id,))
        disposition = cursor.fetchone()
        visit["disposition"] = dict(disposition) if disposition else None

        cursor.execute("SELECT * FROM er_bed_requests WHERE er_visit_id = ? ORDER BY requested_at DESC", (er_visit_id,))
        visit["bed_requests"] = [dict(r) for r in cursor.fetchall()]

        return visit


def merge_er_unknown_patient(hospital_id, er_visit_id, patient_id):
    """Links a temporary unknown-patient ER visit to a confirmed patient_id.
    Everything already recorded on the visit stays exactly where it is --
    only er_visits.patient_id changes."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM er_visits WHERE id = ? AND hospital_id = ?", (er_visit_id, hospital_id))
        if not cursor.fetchone():
            return False
        cursor.execute(
            "SELECT patient_id FROM patients WHERE patient_id = ? AND hospital_id = ? AND deleted_at IS NULL",
            (patient_id, hospital_id),
        )
        if not cursor.fetchone():
            raise ValueError(f"Patient {patient_id} was not found in this hospital.")
        cursor.execute(
            "UPDATE er_visits SET patient_id = ?, is_unknown_patient = FALSE, merged_into_patient_id = ? WHERE id = ?",
            (patient_id, patient_id, er_visit_id),
        )
        conn.commit()
        return True


def add_er_complaint(hospital_id, er_visit_id, data):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO er_complaints (
                hospital_id, er_visit_id, complaint, severity, start_date, start_time,
                duration, progression, associated_symptoms, source_of_information,
                reported_by, case_category
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
            """,
            (
                hospital_id, er_visit_id, data["complaint"], data.get("severity"),
                data.get("start_date"), data.get("start_time"), data.get("duration"),
                data.get("progression"), data.get("associated_symptoms"),
                data.get("source_of_information"), data.get("reported_by"), data.get("case_category"),
            ),
        )
        complaint_id = cursor.fetchone()[0]
        conn.commit()
        return complaint_id


def set_er_incident(hospital_id, er_visit_id, data):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM er_incident_history WHERE er_visit_id = ?", (er_visit_id,))
        existing = cursor.fetchone()
        details_json = json.dumps(data.get("details") or {})
        if existing:
            cursor.execute(
                "UPDATE er_incident_history SET incident_type = ?, incident_at = ?, "
                "incident_time_precision = ?, discovered_at = ?, details_json = ? WHERE er_visit_id = ?",
                (
                    data.get("incident_type"), data.get("incident_at"), data.get("incident_time_precision"),
                    data.get("discovered_at"), details_json, er_visit_id,
                ),
            )
        else:
            cursor.execute(
                "INSERT INTO er_incident_history (hospital_id, er_visit_id, incident_type, "
                "incident_at, incident_time_precision, discovered_at, details_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    hospital_id, er_visit_id, data.get("incident_type"), data.get("incident_at"),
                    data.get("incident_time_precision"), data.get("discovered_at"), details_json,
                ),
            )
        conn.commit()
        return True


def add_er_vitals(hospital_id, er_visit_id, data, recorded_by=None):
    """Every call inserts a new row -- vitals are never updated/overwritten."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO er_vitals (
                hospital_id, er_visit_id, recorded_by, heart_rate, bp_systolic, bp_diastolic,
                respiratory_rate, spo2, temperature, consciousness_level, blood_glucose,
                pain_score, gcs, pupillary_response, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
            """,
            (
                hospital_id, er_visit_id, recorded_by, data.get("heart_rate"), data.get("bp_systolic"),
                data.get("bp_diastolic"), data.get("respiratory_rate"), data.get("spo2"),
                data.get("temperature"), data.get("consciousness_level"), data.get("blood_glucose"),
                data.get("pain_score"), data.get("gcs"), data.get("pupillary_response"), data.get("notes"),
            ),
        )
        vitals_id = cursor.fetchone()[0]
        conn.commit()
        return vitals_id


def list_er_triage_config(hospital_id, active_only=True):
    with get_connection() as conn:
        cursor = conn.cursor()
        clauses = ["hospital_id = ?", "deleted_at IS NULL"]
        params = [hospital_id]
        if active_only:
            clauses.append("is_active = TRUE")
        cursor.execute(
            f"SELECT * FROM er_triage_config WHERE {' AND '.join(clauses)} ORDER BY sort_order ASC, category_code ASC",
            tuple(params),
        )
        return cursor.fetchall()


def create_er_triage_category(hospital_id, data):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO er_triage_config (hospital_id, category_code, category_label, description, sort_order, color)
            VALUES (?, ?, ?, ?, ?, ?) RETURNING id
            """,
            (
                hospital_id, data["category_code"], data["category_label"], data.get("description"),
                int(data.get("sort_order", 0) or 0), data.get("color"),
            ),
        )
        category_id = cursor.fetchone()[0]
        conn.commit()
        return category_id


def set_er_triage(hospital_id, er_visit_id, data, assigned_by=None):
    """One triage row per visit -- corrections overwrite it."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM er_triage WHERE er_visit_id = ?", (er_visit_id,))
        existing = cursor.fetchone()
        if existing:
            cursor.execute(
                "UPDATE er_triage SET category = ?, triage_bed_label = ?, reason = ?, "
                "assigned_by = ?, triaged_at = CURRENT_TIMESTAMP WHERE er_visit_id = ?",
                (data["category"], data.get("triage_bed_label"), data.get("reason"), assigned_by, er_visit_id),
            )
        else:
            cursor.execute(
                "INSERT INTO er_triage (hospital_id, er_visit_id, category, triage_bed_label, reason, assigned_by) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (hospital_id, er_visit_id, data["category"], data.get("triage_bed_label"), data.get("reason"), assigned_by),
            )
        conn.commit()

    try:
        update_er_visit_status(hospital_id, er_visit_id, "triaged")
    except ValueError:
        pass
    return True


def add_er_treatment(hospital_id, er_visit_id, data):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO er_treatments (hospital_id, er_visit_id, intervention_type, description, administered_by, prescribed_by, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
            """,
            (hospital_id, er_visit_id, data["intervention_type"], data.get("description"), data.get("administered_by"), data.get("prescribed_by"), data.get("notes")),
        )
        treatment_id = cursor.fetchone()[0]
        conn.commit()

    try:
        update_er_visit_status(hospital_id, er_visit_id, "under_treatment")
    except ValueError:
        pass
    return treatment_id


def assign_er_doctor(hospital_id, er_visit_id, specialty, doctor_name=None):
    """Suggests a doctor via match_doctor_to_department when no doctor_name is
    given; staff can always override. Falls back to any available doctor if
    nobody in the exact specialty is on staff, rather than leaving the visit
    unassigned."""
    final_doctor = (doctor_name or "").strip()
    matched_specialty = specialty
    used_fallback = False
    if not final_doctor:
        candidates = get_suggested_doctors(department=specialty, hospital_id=hospital_id)
        available = [f"{doc['doctor_name']} ({doc.get('department') or ''})" for doc in candidates if doc.get("doctor_name")]
        final_doctor = match_doctor_to_department(available, specialty)
        if not final_doctor and candidates:
            top = candidates[0]
            final_doctor = (top.get("doctor_name") or "").strip()
            matched_specialty = top.get("department") or specialty
            used_fallback = bool(final_doctor)

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE er_visits SET assigned_doctor_name = ?, assigned_specialty = ?, "
            "doctor_assigned_at = CURRENT_TIMESTAMP, doctor_accepted_at = NULL WHERE id = ? AND hospital_id = ?",
            (final_doctor or None, matched_specialty, er_visit_id, hospital_id),
        )
        conn.commit()

    try:
        update_er_visit_status(hospital_id, er_visit_id, "doctor_assigned")
    except ValueError:
        pass
    return {"doctor_name": final_doctor, "matched_specialty": matched_specialty, "used_fallback": used_fallback}


def accept_er_doctor_assignment(hospital_id, er_visit_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE er_visits SET doctor_accepted_at = CURRENT_TIMESTAMP "
            "WHERE id = ? AND hospital_id = ? AND assigned_doctor_name IS NOT NULL",
            (er_visit_id, hospital_id),
        )
        conn.commit()
        return cursor.rowcount > 0


def add_er_clinical_note(hospital_id, er_visit_id, note_type, content, author=None):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO er_clinical_notes (hospital_id, er_visit_id, note_type, author, content) "
            "VALUES (?, ?, ?, ?, ?) RETURNING id",
            (hospital_id, er_visit_id, note_type, author, content),
        )
        note_id = cursor.fetchone()[0]
        conn.commit()
        return note_id


def record_er_disposition(hospital_id, er_visit_id, data, decided_by=None):
    """Records the ER doctor's clinical decision -- never a bed number. For
    outcomes that need a physical bed, also creates the er_bed_requests row
    Reception fulfills via allocate_er_bed_request(); this function never
    touches bed_master/bed_allocations itself."""
    outcome = data["outcome"]
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM er_visits WHERE id = ? AND hospital_id = ?", (er_visit_id, hospital_id))
        visit_row = cursor.fetchone()
        if not visit_row:
            raise ValueError("ER visit not found.")
        if visit_row["status"] in ("bed_allocated", "transferred", "closed"):
            raise ValueError("This ER visit has already progressed past the disposition stage.")

        cursor.execute("SELECT id FROM er_disposition WHERE er_visit_id = ?", (er_visit_id,))
        existing = cursor.fetchone()
        if existing:
            cursor.execute(
                "UPDATE er_disposition SET outcome = ?, required_specialty = ?, clinical_reason = ?, "
                "decided_by = ?, decided_at = CURRENT_TIMESTAMP, priority = ? WHERE er_visit_id = ? RETURNING id",
                (outcome, data.get("required_specialty"), data["clinical_reason"], decided_by, data.get("priority"), er_visit_id),
            )
        else:
            cursor.execute(
                "INSERT INTO er_disposition (hospital_id, er_visit_id, outcome, required_specialty, clinical_reason, decided_by, priority) "
                "VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
                (hospital_id, er_visit_id, outcome, data.get("required_specialty"), data["clinical_reason"], decided_by, data.get("priority")),
            )
        disposition_id = cursor.fetchone()[0]

        if existing:
            cursor.execute(
                "UPDATE er_bed_requests SET status = 'cancelled' WHERE er_visit_id = ? AND status = 'pending'",
                (er_visit_id,),
            )

        bed_request_id = None
        if outcome in ER_OUTCOMES_REQUIRING_BED:
            cursor.execute(
                "INSERT INTO er_bed_requests (hospital_id, er_visit_id, disposition_id, requested_level_of_care, requested_specialty, requested_by) "
                "VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
                (hospital_id, er_visit_id, disposition_id, outcome, data.get("required_specialty"), decided_by),
            )
            bed_request_id = cursor.fetchone()[0]

        new_status = "bed_requested" if bed_request_id else "awaiting_disposition"
        cursor.execute("UPDATE er_visits SET status = ? WHERE id = ?", (new_status, er_visit_id))
        conn.commit()

    return {"disposition_id": disposition_id, "bed_request_id": bed_request_id}


def list_er_bed_requests(hospital_id, status=None):
    with get_connection() as conn:
        cursor = conn.cursor()
        clauses = ["r.hospital_id = ?"]
        params = [hospital_id]
        if status:
            clauses.append("r.status = ?")
            params.append(status)
        cursor.execute(
            f"""
            SELECT r.*, v.visit_no, v.patient_id, v.unknown_patient_label, v.is_unknown_patient
            FROM er_bed_requests r
            JOIN er_visits v ON v.id = r.er_visit_id
            WHERE {' AND '.join(clauses)}
            ORDER BY r.requested_at ASC
            """,
            tuple(params),
        )
        return cursor.fetchall()


def allocate_er_bed_request(hospital_id, bed_request_id, bed_id, notes, allocated_by=None, expected_los_days=None):
    """Reception fulfilling an ER bed request. Calls assign_patient_to_bed()
    completely unchanged -- this is the boundary the whole ER module is
    built around: ER only ever creates a request, never assigns a bed."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM er_bed_requests WHERE id = ? AND hospital_id = ? AND status = 'pending'",
            (bed_request_id, hospital_id),
        )
        req = cursor.fetchone()
        if not req:
            return None
        er_visit_id = req["er_visit_id"]
        cursor.execute("SELECT patient_id FROM er_visits WHERE id = ?", (er_visit_id,))
        visit_row = cursor.fetchone()
        patient_id = visit_row["patient_id"] if visit_row else None

    if not patient_id:
        raise ValueError(
            "This ER visit isn't linked to a confirmed patient record yet -- "
            "merge the unknown patient before allocating a bed."
        )

    result = assign_patient_to_bed(hospital_id, bed_id, patient_id, notes, expected_los_days=expected_los_days)
    if result is None:
        return None

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE er_bed_requests SET status = 'allocated', allocated_bed_id = ?, allocated_admission_id = ?, "
            "allocated_by = ?, allocated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (bed_id, result["admission_id"], allocated_by, bed_request_id),
        )
        cursor.execute("UPDATE admissions SET er_visit_id = ? WHERE id = ?", (er_visit_id, result["admission_id"]))
        conn.commit()

    try:
        update_er_visit_status(hospital_id, er_visit_id, "bed_allocated")
    except ValueError:
        pass
    return {**result, "er_visit_id": er_visit_id, "bed_request_id": bed_request_id}


def compute_er_charges(hospital_id, er_visit_id, consultation_fee=0.0):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT intervention_type, description FROM er_treatments WHERE hospital_id = ? AND er_visit_id = ? ORDER BY performed_at ASC",
            (hospital_id, er_visit_id),
        )
        treatment_rows = cursor.fetchall()

    items, total = [], 0.0
    if consultation_fee:
        items.append({"label": "ER Consultation", "amount": float(consultation_fee)})
        total += float(consultation_fee)
    for row in treatment_rows:
        label = row["intervention_type"] if not row["description"] else f"{row['intervention_type']} — {row['description']}"
        items.append({"label": label, "amount": 0.0})
    return {"items": items, "total": total}


def close_er_visit(hospital_id, er_visit_id, total_amount=None, consultation_fee=0.0, created_by=None):
    charges = compute_er_charges(hospital_id, er_visit_id, consultation_fee=consultation_fee)
    total = total_amount if total_amount is not None else charges["total"]

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT patient_id FROM er_visits WHERE id = ? AND hospital_id = ?", (er_visit_id, hospital_id))
        row = cursor.fetchone()
        if not row:
            return None
        patient_id = row["patient_id"]

    invoice_id = None
    if total and total > 0 and patient_id:
        invoice_no = f"INV-ER-{er_visit_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        invoice_id = create_invoice(
            {
                "invoice_no": invoice_no, "patient_id": patient_id, "module": "ER",
                "total_amount": total, "subtotal": total, "payment_status": "due", "created_by": created_by,
            },
            hospital_id=hospital_id,
        )

    update_er_visit_status(hospital_id, er_visit_id, "closed")
    return {"invoice_id": invoice_id, "total": total, "items": charges["items"]}


# ==================== Audit log ====================

def add_audit_log(data):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO audit_logs (actor_username, action, module_name, entity_key, payload, ip_address) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (data.get("actor_username"), data["action"], data["module_name"], data.get("entity_key"), data.get("payload"), data.get("ip_address")),
        )
        conn.commit()
