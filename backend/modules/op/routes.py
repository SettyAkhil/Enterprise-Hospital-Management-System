from flask import Blueprint, jsonify, request

from app import current_hospital_id, require_permissions
from utils.database import get_suggested_doctors, list_departments, list_doctors

op_bp = Blueprint("op", __name__)


@op_bp.get("/api/registration/departments")
@require_permissions("op.read")
def registration_departments():
    hospital_id = current_hospital_id()
    departments = list_departments(hospital_id=hospital_id)
    return jsonify({"departments": [dict(d) for d in departments]})


@op_bp.get("/api/op/doctors")
@require_permissions("op.read")
def op_doctors_list():
    hospital_id = current_hospital_id()
    department = request.args.get("department")
    doctors = list_doctors(department=department, hospital_id=hospital_id)
    return jsonify({"doctors": doctors})


@op_bp.get("/api/op/doctors/suggest")
@require_permissions("op.read")
def op_doctors_suggest():
    department = request.args.get("department")
    region = request.args.get("region")
    doctors = get_suggested_doctors(department=department, region=region, hospital_id=current_hospital_id())
    return jsonify({"doctors": doctors, "suggested_department": department or region})
