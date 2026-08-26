from flask import Blueprint, jsonify, request

from app import current_hospital_id, require_permissions
from utils.database import search_patients

# Deliberately minimal -- not the reference app's full patients module (no
# create/update/list-all/departments/consents CRUD here). This exists only
# because ErPage.tsx's "Search Existing" (New Visit modal) and unknown-patient
# merge flow both call GET /api/patients?q= directly; ER's own registration
# already creates patients standalone without needing anything else here.
patients_bp = Blueprint("patients", __name__)


@patients_bp.get("/api/patients")
@require_permissions("patients.read")
def patients_search():
    query = (request.args.get("q") or "").strip()
    if len(query) < 2:
        return jsonify({"patients": []})
    hospital_id = current_hospital_id()
    patients = search_patients(query, hospital_id=hospital_id)
    return jsonify({"patients": [dict(p) for p in patients]})
