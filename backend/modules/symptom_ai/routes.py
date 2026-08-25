import json
import re

from flask import Blueprint, jsonify, request

from app import require_permissions
from utils.database import match_doctor_to_department

symptom_ai_bp = Blueprint("symptom_ai", __name__)

VALID_INTERVENTION_TYPES = {
    "oxygen", "iv_access", "fluids", "cardiac_monitoring", "medication", "cpr",
    "defibrillation", "airway_management", "nebulization", "wound_care",
    "blood_transfusion", "gastric_lavage", "other",
}
INTERVENTION_TYPE_ALIASES = {
    "iv": "iv_access", "iv line": "iv_access", "cannulation": "iv_access", "line": "iv_access",
    "iv fluids": "fluids", "intravenous fluids": "fluids", "fluid": "fluids", "saline": "fluids", "ivf": "fluids",
    "cardiopulmonary resuscitation": "cpr", "resuscitation": "cpr",
    "shock": "defibrillation", "cardioversion": "defibrillation", "aed": "defibrillation",
    "airway": "airway_management", "intubation": "airway_management", "ett": "airway_management", "bag-valve": "airway_management",
    "oxygen therapy": "oxygen", "o2": "oxygen", "high-flow oxygen": "oxygen", "nrbm": "oxygen",
    "ecg": "cardiac_monitoring", "ekg": "cardiac_monitoring", "monitoring": "cardiac_monitoring",
    "cardiac monitor": "cardiac_monitoring", "telemetry": "cardiac_monitoring",
    "drugs": "medication", "pharmacotherapy": "medication", "injections": "medication", "drug": "medication",
    "nebulizer": "nebulization", "nebulise": "nebulization", "bronchodilator": "nebulization", "duolin": "nebulization",
    "dressing": "wound_care", "bandage": "wound_care", "splint": "wound_care", "pressure dressing": "wound_care",
    "blood": "blood_transfusion", "transfusion": "blood_transfusion", "prbc": "blood_transfusion",
    "lavage": "gastric_lavage", "stomach wash": "gastric_lavage", "charcoal": "gastric_lavage",
}


def _normalize_intervention_type(raw: str) -> str:
    key = raw.strip().lower()
    if key in VALID_INTERVENTION_TYPES:
        return key
    return INTERVENTION_TYPE_ALIASES.get(key, "other")


def _bare_name(entry: str) -> str:
    m = re.match(r"^(.*)\(([^()]*)\)\s*$", entry.strip())
    return m.group(1).strip() if m else entry.strip()


def _normalize_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


@symptom_ai_bp.post("/api/symptom-ai/triage")
@require_permissions("symptom_ai.use")
def symptom_ai_triage():
    """AI-assisted ER triage suggestion: department, urgency, doctor, and a
    structured emergency-care bundle. Requires a configured LLM endpoint
    (VLLM_BASE_URL) -- see ai/vllm_provider.py. Falls back to a non-AI
    department suggestion when unavailable rather than failing outright, so
    the rest of the ER workflow (manual triage, doctor assignment,
    disposition, bed requests) never depends on this endpoint succeeding."""
    data = request.json or {}
    symptoms = data.get("symptoms")
    available_departments = data.get("available_departments", [])
    available_doctors = data.get("available_doctors", [])

    if not symptoms:
        return jsonify({"error": "Missing symptoms"}), 400

    from ai.vllm_provider import llm_provider

    def fallback_triage(reason: str):
        department = next(
            (d for d in available_departments if "general" in d.strip().lower()),
            available_departments[0] if available_departments else "General Medicine",
        )
        return jsonify(
            {
                "department": department,
                "urgency": "Medium",
                "reasoning": f"AI triage is unavailable, so this was routed to {department} for staff review. {reason}",
                "doctor": match_doctor_to_department(available_doctors, department) if available_doctors else "",
                "suggested_treatment": None,
                "suggested_treatments": [],
                "fallback": True,
            }
        )

    if not llm_provider.is_configured():
        return fallback_triage("No AI triage provider is configured on the server.")

    prompt = f"""
You are an Emergency Medicine AI Clinical Triage Expert in a hospital.
The patient presents with the following symptoms, complaints, and vitals:
{symptoms}

Available departments: {', '.join(available_departments) if available_departments else 'Any'}
Available doctors: {', '.join(available_doctors) if available_doctors else 'Any'}

Analyze the clinical presentation and provide a JSON response with:
1. "department": The most appropriate department from the EXACT list of Available departments. If the symptoms do not clearly match any of the available departments, you MUST output the best match from the list.
2. "urgency": "Low", "Medium", "High", or "Critical".
3. "reasoning": A concise, high-yield clinical assessment (maximum 1-2 tight sentences).
4. "doctor": Pick one name from the Available doctors list whose department (shown in parentheses) matches the "department" you chose above.
5. "suggested_treatments": A structured emergency care bundle with 2 to 4 immediate, realistic first-line clinical interventions. Each description MUST be a short, direct clinical order (max 6 to 10 words). Array of objects: [{{"intervention_type": one of "oxygen"/"iv_access"/"fluids"/"cardiac_monitoring"/"medication"/"cpr"/"defibrillation"/"airway_management"/"nebulization"/"wound_care"/"blood_transfusion"/"gastric_lavage"/"other", "description": "Short clinical order"}}]

Your response MUST be valid JSON only. Do not include markdown formatting or backticks.
"""
    try:
        response_text = llm_provider.generate(prompt, json_mode=True, max_tokens=600)
        if not response_text:
            return fallback_triage("Please check the configured AI provider and model server connectivity.")

        response_text = response_text.strip()
        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "", 1)
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        result = json.loads(response_text.strip())

        if available_departments:
            dept_lower = (result.get("department") or "").strip().lower()
            match = next((d for d in available_departments if d.strip().lower() == dept_lower), None)
            if not match:
                for d in available_departments:
                    d_clean = d.strip().lower()
                    if d_clean in dept_lower or dept_lower in d_clean or (
                        len(d_clean) > 4 and len(dept_lower) > 4 and d_clean[:5] == dept_lower[:5]
                    ):
                        match = d
                        break
            if match:
                result["department"] = match
            else:
                gen_med = next((d for d in available_departments if "general" in d.lower()), None)
                result["department"] = gen_med or (available_departments[0] if available_departments else "General Medicine")

        raw_doctor = (result.get("doctor") or "").strip()
        if raw_doctor and available_doctors:
            bare_available = {_normalize_name(_bare_name(d)): d for d in available_doctors}
            candidate_entry = bare_available.get(_normalize_name(_bare_name(raw_doctor)))
            if candidate_entry:
                dept_match = re.match(r"^(.*)\(([^()]*)\)\s*$", candidate_entry.strip())
                candidate_dept = dept_match.group(2).strip().lower() if dept_match else ""
                target_dept = (result.get("department") or "").strip().lower()
                result["doctor"] = "" if (candidate_dept and target_dept and candidate_dept != target_dept) else _bare_name(candidate_entry)
            else:
                result["doctor"] = ""
        elif raw_doctor and not available_doctors:
            result["doctor"] = raw_doctor

        if not (result.get("doctor") or "").strip() and available_doctors:
            result["doctor"] = match_doctor_to_department(available_doctors, result.get("department", ""))

        raw_treatments = result.get("suggested_treatments")
        if not raw_treatments and result.get("suggested_treatment"):
            raw_treatments = [result["suggested_treatment"]]
        elif not raw_treatments:
            raw_treatments = []

        normalized_treatments = []
        for t in raw_treatments:
            if isinstance(t, dict):
                raw_type = str(t.get("intervention_type") or "").strip()
                if raw_type:
                    normalized_treatments.append({
                        "intervention_type": _normalize_intervention_type(raw_type),
                        "description": str(t.get("description") or "").strip()[:300],
                    })
            elif isinstance(t, str) and t.strip():
                mapped_type = _normalize_intervention_type(t)
                normalized_treatments.append({
                    "intervention_type": mapped_type,
                    "description": t.strip()[:300] if mapped_type == "other" else "",
                })

        result["suggested_treatments"] = normalized_treatments
        result["suggested_treatment"] = normalized_treatments[0] if normalized_treatments else None

        return jsonify(result)
    except json.JSONDecodeError:
        return fallback_triage("The AI response was not valid JSON.")
    except Exception as exc:
        message = str(exc)
        if "RESOURCE_EXHAUSTED" in message or "quota" in message.lower() or "429" in message:
            return fallback_triage("The configured AI provider quota is exhausted.")
        return fallback_triage("Please check the AI provider configuration.")
