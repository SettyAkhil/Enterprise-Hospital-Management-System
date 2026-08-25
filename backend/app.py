from __future__ import annotations

import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

if __name__ == "__main__":
    # modules/*/routes.py do `from app import (...)`. Running this file directly
    # registers it as `__main__`, not `app`, which would re-trigger the whole
    # module under a second identity on that import and crash with a circular
    # import. Alias `app` to the in-progress `__main__` module first so both
    # names resolve to the same module object.
    sys.modules.setdefault("app", sys.modules[__name__])

import json
from datetime import date, datetime
from functools import wraps

from flask import Flask, g, jsonify, request
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS

from core.auth import (
    SESSION_COOKIE_NAME,
    SESSION_TTL_SECONDS,
    authenticate,
    create_default_users,
    create_session,
    delete_session,
    get_session_user,
    resolve_user_permissions,
)
from utils.database import add_audit_log, init_database, resolve_hospital_id


class ISODateTimeJSONProvider(DefaultJSONProvider):
    """Flask's DefaultJSONProvider serializes datetime/date as RFC 1123
    HTTP-date strings, not ISO 8601 -- the frontend's date parsing expects
    ISO 8601, so convert explicitly at the source instead of teaching every
    frontend parser this format."""

    @staticmethod
    def default(o):
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        return DefaultJSONProvider.default(o)


app = Flask(__name__)
app.json = ISODateTimeJSONProvider(app)

_frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:8443")
CORS(app, supports_credentials=True, origins=[_frontend_origin, "http://localhost:5173"])


def _session_cookie_settings():
    is_https = request.is_secure or os.getenv("SESSION_COOKIE_SECURE", "").lower() == "true"
    return {
        "httponly": True,
        "secure": is_https,
        "samesite": "Lax",
        "path": "/",
        "max_age": SESSION_TTL_SECONDS,
    }


def request_hospital_id() -> int:
    requested_code = request.headers.get("X-Hospital-Code", "")
    return resolve_hospital_id(requested_code or None)


def current_hospital_id() -> int:
    user = getattr(g, "current_user", None) or {}
    return int(user.get("hospital_id") or request_hospital_id())


def require_session(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        token = request.cookies.get(SESSION_COOKIE_NAME)
        user = get_session_user(token)
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        g.current_user = user
        return view(*args, **kwargs)

    return wrapper


def require_permissions(*required_permissions):
    def decorator(view):
        @wraps(view)
        @require_session
        def wrapper(*args, **kwargs):
            user_permissions = resolve_user_permissions(g.current_user)
            if not all(permission in user_permissions for permission in required_permissions):
                return jsonify({"error": "Forbidden", "required_permissions": list(required_permissions)}), 403
            return view(*args, **kwargs)

        return wrapper

    return decorator


def log_audit_event(action, module_name, entity_key=None, payload=None):
    actor = (getattr(g, "current_user", None) or {}).get("username")
    serialized_payload = None
    if payload is not None:
        try:
            serialized_payload = json.dumps(payload, separators=(",", ":"), default=str)
        except Exception:
            serialized_payload = str(payload)
    add_audit_log(
        {
            "actor_username": actor,
            "action": action,
            "module_name": module_name,
            "entity_key": entity_key,
            "payload": serialized_payload,
            "ip_address": request.headers.get("X-Forwarded-For", request.remote_addr),
        }
    )


def validate_required_fields(payload, fields):
    missing = [field for field in fields if payload.get(field) in (None, "")]
    if missing:
        return jsonify({"error": "Missing required fields", "missing": missing}), 400
    return None


# ==================== Bootstrap: schema + demo users ====================
init_database()
create_default_users()


# ==================== Auth routes ====================

@app.route("/api/auth/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return ("", 204)
    payload = request.get_json(force=True)
    hospital_id = request_hospital_id()
    user = authenticate(payload.get("username", ""), payload.get("password", ""), hospital_id=hospital_id)
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    if "error" in user:
        return jsonify(user), 403
    session_token, _expires_at = create_session(
        user_id=user["id"],
        hospital_id=user["hospital_id"],
        ip_address=request.headers.get("X-Forwarded-For", request.remote_addr),
        user_agent=request.headers.get("User-Agent"),
    )
    response = jsonify({"user": {k: v for k, v in user.items() if k != "id"}})
    response.headers["Cache-Control"] = "no-store"
    response.set_cookie(SESSION_COOKIE_NAME, session_token, **_session_cookie_settings())
    return response


@app.get("/api/auth/session")
def auth_session():
    token = request.cookies.get(SESSION_COOKIE_NAME)
    user = get_session_user(token)
    if not user:
        response = jsonify({"user": None, "error": "Authentication required"})
        response.headers["Cache-Control"] = "no-store"
        return response, 200
    response = jsonify({"user": {k: v for k, v in user.items() if k != "id"}})
    response.headers["Cache-Control"] = "no-store"
    return response


@app.post("/api/auth/logout")
def logout():
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if session_token:
        delete_session(session_token)
    response = jsonify({"message": "Logged out successfully"})
    response.set_cookie(SESSION_COOKIE_NAME, "", expires=0)
    return response


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


# ==================== Blueprints ====================
from modules.op.routes import op_bp
from modules.symptom_ai.routes import symptom_ai_bp
from modules.beds.routes import beds_bp
from modules.er.routes import er_bp

app.register_blueprint(op_bp)
app.register_blueprint(symptom_ai_bp)
app.register_blueprint(beds_bp)
app.register_blueprint(er_bp)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8000")), debug=True, use_reloader=False)
