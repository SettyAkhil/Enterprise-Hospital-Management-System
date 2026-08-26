import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

new_nav = """const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", Icon: Icon.Dashboard },
  {
    key: "patients", label: "Patients", Icon: Icon.Patients,
    children: [
      { key: "patients", label: "Patient Search" },
      { key: "register", label: "Registration" },
    ]
  },
  { key: "appointments", label: "Appointments", Icon: Icon.Calendar, badge: 14 },
  {
    key: "outpatient", label: "Outpatient", Icon: Icon.Stethoscope,
    children: [
      { key: "op_management", label: "OP Dashboard" },
      { key: "queue", label: "Queue Management" },
    ]
  },
  {
    key: "emergency", label: "Emergency", Icon: Icon.Emergency, badge: 8,
    children: [
      { key: "emergency", label: "ED Track Board" },
      { key: "triage", label: "Triage" },
    ]
  },
  {
    key: "clinical", label: "Clinical", Icon: Icon.Clinical,
    children: [
      { key: "chart", label: "Encounters" },
      { key: "chart", label: "Orders" },
      { key: "chart", label: "Results" },
      { key: "doctor_workflow", label: "Doctor Workflow" },
    ]
  },
  {
    key: "inpatient", label: "Inpatient", Icon: Icon.Bed,
    children: [
      { key: "inpatient", label: "Bed Board" },
      { key: "icu", label: "ICU" },
      { key: "admissions", label: "Admissions" },
      { key: "discharge", label: "Discharge" },
      { key: "readmission", label: "Readmission" },
    ]
  },
  { key: "nursing", label: "Nursing", Icon: Icon.Nursing },
  { key: "laboratory", label: "Laboratory", Icon: Icon.Lab, badge: 3 },
  { key: "radiology", label: "Radiology", Icon: Icon.Radiology },
  { key: "pharmacy", label: "Pharmacy", Icon: Icon.Pharmacy, badge: 8 },
  { key: "surgery", label: "Surgery", Icon: Icon.Surgery },
  { 
    key: "billing", label: "Billing", Icon: Icon.Billing,
    children: [
      { key: "payments", label: "Payment Collection" },
      { key: "revenue_reports", label: "Revenue Reports" }
    ]
  },
  { key: "insurance", label: "Insurance", Icon: Icon.Insurance },
  { 
    key: "hrms", label: "HR & Staff", Icon: Icon.User,
    children: [
      { key: "employees", label: "Employees" },
      { key: "scheduling", label: "Doctor Scheduling" }
    ]
  },
  { 
    key: "intelligence", label: "Hosp AI", Icon: Icon.FlaskConical,
    children: [
      { key: "ocr", label: "Smart OCR" },
      { key: "symptom_ai", label: "Symptom AI" },
      { key: "clinical_rag", label: "Clinical RAG" },
      { key: "clinical_summaries", label: "Clinical Summaries" },
      { key: "bulk_ai", label: "Bulk AI Processing" },
      { key: "nl_filtering", label: "NL Filtering" }
    ]
  },
  { key: "reports", label: "Reports", Icon: Icon.Reports },
  { key: "analytics", label: "Analytics", Icon: Icon.Analytics },
  { key: "admin", label: "Administration", Icon: Icon.Admin },
];"""

content = re.sub(r'const NAV: NavItem\[\] = \[.*?\];', new_nav, content, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(content)
