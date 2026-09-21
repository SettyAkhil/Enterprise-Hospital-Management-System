/**
 * Keppler Healthcare Enterprise HMS - OP Reports Database & Analytics Service
 * Connects directly to persistent Outpatient encounters in db.ts and provides
 * filtered aggregations, KPI calculations with period-over-period comparisons,
 * trend lines, department breakdowns, visit-type distribution, and paginated queries.
 */

import { db, DBOPEncounter } from "./db"
import {
  getDoctorMaster,
  ACTIVE_SPECIALTIES,
  doctorsForSpecialty,
} from "./doctorMaster"

export type DateRangePreset = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth" | "custom"

export type VisitTypeFilter = "All" | "New Consultation" | "Follow-up Visit" | "Procedure" | "Health Checkup"

export type StatusFilter = "All" | "Waiting" | "In Consultation" | "Completed" | "Cancelled"

export interface OpReportFilters {
  dateRangePreset: DateRangePreset
  customStartDate?: string // YYYY-MM-DD
  customEndDate?: string // YYYY-MM-DD
  department: string // "All" or department name
  doctor: string // "All" or doctor name
  visitType: VisitTypeFilter
  status: StatusFilter
}

export interface KpiMetric {
  value: number
  previousValue: number
  pctChange: number // e.g. +14.2 or -5.1
  isPositive: boolean // whether positive change is good
}

export interface OpReportKpis {
  totalVisits: KpiMetric
  newPatients: KpiMetric
  existingPatients: KpiMetric
  completedConsultations: KpiMetric
  waitingPatients: KpiMetric
  cancelledVisits: KpiMetric
}

export interface OpTrendDataPoint {
  date: string // e.g. "2026-09-10"
  label: string // e.g. "Sep 10"
  totalVisits: number
  newPatients: number
  existingPatients: number
}

export interface DepartmentStat {
  department: string
  count: number
  percentage: number
  color: string
}

export interface VisitTypeStat {
  name: string
  count: number
  percentage: number
  color: string
}

export interface EnrichedOpVisit
  extends DBOPEncounter { // YYYY-MM-DD
  encounterDate: string
  encounterDateTimeFormatted: string
  derivedVisitType: "New Consultation" | "Follow-up Visit" | "Procedure" | "Health Checkup"
  statusCategory: "Waiting" | "In Consultation" | "Completed" | "Cancelled"
}

const STORAGE_SEEDED_HISTORICAL_KEY = "hospai_op_reports_seeded_v3"

/**
 * Standard department colors for consistent visual hierarchy
 */
export const DEPARTMENT_COLORS: Record<string, string> = {
  "General Medicine": "#1B4FD8",
  Cardiology: "#0284C7",
  Orthopedics: "#0D9488",
  Pediatrics: "#7C3AED",
  ENT: "#EA580C",
  Dermatology: "#D97706",
  "General Surgery": "#4F46E5",
  Neurology: "#9333EA",
  Pulmonology: "#2563EB",
  Gynecology: "#DB2777",
  Urology: "#059669",
  Diabetology: "#0891B2",
  Radiology: "#64748B",
  Other: "#475569",
}

export const VISIT_TYPE_COLORS: Record<string, string> = {
  "New Consultation": "#1B4FD8",
  "Follow-up Visit": "#0284C7",
  Procedure: "#7C3AED",
  "Health Checkup": "#10B981",
}

export class OpReportsService {
  /**
   * Initializes and ensures longitudinal historical encounters exist across
   * the past 60 days so reporting filters (Today, Yesterday, Last 7 Days,
   * Last 30 Days, This Month, Last Month) reflect realistic data.
   */
  public static ensureLongitudinalData(): void {
    if (typeof window === "undefined") return
    try {
      const existingSeed = localStorage.getItem(STORAGE_SEEDED_HISTORICAL_KEY)
      if (existingSeed) return

      const currentEncounters = db.getEncounters()
      const augmented: DBOPEncounter[] = [...currentEncounters]
      const now = new Date()

      // Helper to generate an encounter on a relative day offset
      const generateEncounter = (
        daysAgo: number,
        hour: number,
        minute: number,
        patientName: string,
        umr: string,
        opNum: number,
        age: number,
        sex: "Male" | "Female",
        dept: string,
        doctor: string,
        isNew: boolean,
        status: DBOPEncounter["status"] | "Cancelled",
        chiefComplaint: string,
        diagnosis: string,
        visitTypeOverride?: "New Consultation" | "Follow-up Visit" | "Procedure" | "Health Checkup",
      ): DBOPEncounter => {
        const d = new Date(now)
        d.setDate(d.getDate() - daysAgo)
        d.setHours(hour, minute, 0, 0)

        const isoDate = d.toISOString().split("T")[0]
        const timeStr = d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })

        return {
          id: `ENC-REP-${isoDate.replace(/-/g, "")}-${String(opNum).padStart(3, "0")}`,
          umr,
          opNumber: `OP${String(opNum).padStart(3, "0")}`,
          patientName,
          age,
          sex,
          phone: `(617) 555-${String(1000 + opNum).slice(-4)}`,
          address: "Greater Metropolitan Hospital Area, MA",
          bloodGroup: opNum % 2 === 0 ? "O+" : opNum % 3 === 0 ? "B+" : "A+",
          dept,
          isNew,
          registrationTime: timeStr,
          chiefComplaint,
          symptoms: [chiefComplaint.split(" ")[0] || "Consultation"],
          aiSpecialty: dept,
          aiDoctor: doctor,
          aiConfidence: 96,
          doctorGenderPref: "Any",
          assignedDoctor: doctor,
          doctorStatus: "Available",
          queueToken: `${dept.charAt(0)}-${opNum}`,
          queuePosition: 1,
          room: `Consult Room ${101 + (opNum % 12)}`,
          diagnosis,
          icd10: "R69",
          prescription: [
            {
              medicine: "Tab Paracetamol 650mg",
              dosage: "1 tab",
              frequency: "TID",
              duration: "5 days",
              instructions: "After food",
            },
            {
              medicine: "Tab Pantoprazole 40mg",
              dosage: "1 tab",
              frequency: "OD",
              duration: "10 days",
              instructions: "Before breakfast",
            },
          ],
          investigations:
            opNum % 3 === 0
              ? ["Complete Blood Count (CBC)"]
              : opNum % 5 === 0
                ? ["ECG 12-Lead"]
                : [],
          advice:
            "Maintain balanced nutrition and adequate hydration. Review if symptoms persist.",
          vitals: {
            bp: `${118 + (opNum % 25)}/${74 + (opNum % 16)} mmHg`,
            pulse: `${68 + (opNum % 20)} bpm`,
            temp: "98.6 °F",
            spo2: "99%",
            weight: `${58 + (opNum % 30)} kg`,
            notes: "Vitals stable upon assessment",
          },
          billing: {
            consultationFee: 50,
            labFee: opNum % 3 === 0 ? 35 : 0,
            total: opNum % 3 === 0 ? 85 : 50,
            status: "Paid",
            mode: opNum % 2 === 0 ? "UPI" : "Card",
          },
          furtherAction: "None",
          status: status as any,
          timestamps: {
            arrival: `${timeStr}`,
            registration: `${timeStr}`,
            vitalsRecorded: `${timeStr}`,
            consultationStart: `${timeStr}`,
            consultationEnd:
              status === "Consultation Completed" || status === "OP Completed"
                ? `${timeStr}`
                : undefined,
            billingCompleted: `${timeStr}`,
            visitCompleted:
              status === "OP Completed" ? `${timeStr}` : undefined,
          },
          ...{ date: isoDate, visitType: visitTypeOverride } as any,
        }
      }

      // Seed historical records across key past intervals
      const samplePatients = [
        {
          name: "Suresh Reddy",
          umr: "UMR10071",
          age: 45,
          sex: "Male" as const,
          dept: "Cardiology",
          doc: "Dr. Arjun Mehta",
          diag: "Essential Hypertension Stage 1",
        },
        {
          name: "Priya Sharma",
          umr: "UMR10072",
          age: 32,
          sex: "Female" as const,
          dept: "General Medicine",
          doc: "Dr. Vikram Malhotra",
          diag: "Acute Upper Respiratory Tract Infection",
        },
        {
          name: "Anand Kulkarni",
          umr: "UMR10073",
          age: 54,
          sex: "Male" as const,
          dept: "Orthopedics",
          doc: "Dr. David Anderson",
          diag: "Degenerative Lumbar Spondylosis",
        },
        {
          name: "Deepa Menon",
          umr: "UMR10074",
          age: 29,
          sex: "Female" as const,
          dept: "Dermatology",
          doc: "Dr. Kavita Rao",
          diag: "Atopic Dermatitis & Eczema",
        },
        {
          name: "Mohammed Farooq",
          umr: "UMR10075",
          age: 62,
          sex: "Male" as const,
          dept: "Cardiology",
          doc: "Dr. Rajesh Sharma",
          diag: "Ischemic Heart Disease - Follow-up",
        },
        {
          name: "Lakshmi Narayanan",
          umr: "UMR10076",
          age: 39,
          sex: "Female" as const,
          dept: "ENT",
          doc: "Dr. M. Rama Krishna",
          diag: "Chronic Allergic Rhinosinusitis",
        },
        {
          name: "Kiran Mazumdar",
          umr: "UMR10077",
          age: 8,
          sex: "Male" as const,
          dept: "Pediatrics",
          doc: "Dr. Anita Desai",
          diag: "Pediatric Viral Pharyngitis",
        },
        {
          name: "Vikram Singhania",
          umr: "UMR10078",
          age: 51,
          sex: "Male" as const,
          dept: "General Medicine",
          doc: "Dr. Vikram Malhotra",
          diag: "Type 2 Diabetes Mellitus with Dyslipidemia",
        },
        {
          name: "Meenakshi Sundaram",
          umr: "UMR10079",
          age: 41,
          sex: "Female" as const,
          dept: "Orthopedics",
          doc: "Dr. Sanjay Kapoor",
          diag: "Right Knee Osteoarthritis Grade II",
        },
        {
          name: "Rohan Varma",
          umr: "UMR10080",
          age: 26,
          sex: "Male" as const,
          dept: "General Surgery",
          doc: "Dr. Sameer Joshi",
          diag: "Right Inguinal Hernia Assessment",
        },
        {
          name: "Sneha Mukherjee",
          umr: "UMR10081",
          age: 35,
          sex: "Female" as const,
          dept: "Pulmonology",
          doc: "Dr. Arvind Swaminathan",
          diag: "Mild Intermittent Bronchial Asthma",
        },
        {
          name: "Tanmay Bhatt",
          umr: "UMR10082",
          age: 48,
          sex: "Male" as const,
          dept: "Cardiology",
          doc: "Dr. Arjun Mehta",
          diag: "Paroxysmal Supraventricular Tachycardia",
        },
      ]

      // Spread encounters over last 45 days
      let opCounter = 200
      // Today visits (day 0)
      for (let i = 0; i < 6; i++) {
        const p = samplePatients[i % samplePatients.length]
        augmented.push(
          generateEncounter(
            0,
            9 + (i % 8),
            (i * 12) % 60,
            p.name,
            p.umr,
            opCounter++,
            p.age,
            p.sex,
            p.dept,
            p.doc,
            i % 2 === 0,
            i === 5
              ? "In Queue"
              : i === 4
                ? "Under Consultation"
                : "OP Completed",
            p.diag,
            p.diag,
            i % 4 === 0
              ? "New Consultation"
              : i % 4 === 1
                ? "Follow-up Visit"
                : i % 4 === 2
                  ? "Procedure"
                  : "Health Checkup",
          ),
        )
      }

      // Yesterday visits (day 1)
      for (let i = 0; i < 8; i++) {
        const p = samplePatients[(i + 2) % samplePatients.length]
        augmented.push(
          generateEncounter(
            1,
            9 + (i % 8),
            (i * 10) % 60,
            p.name,
            p.umr,
            opCounter++,
            p.age,
            p.sex,
            p.dept,
            p.doc,
            i % 3 === 0,
            i === 7 ? "Cancelled" : "OP Completed",
            p.diag,
            p.diag,
            i % 3 === 0 ? "New Consultation" : "Follow-up Visit",
          ),
        )
      }

      // Past 7 days (days 2 through 7)
      for (let day = 2; day <= 7; day++) {
        const count = 5 + (day % 4)
        for (let i = 0; i < count; i++) {
          const p = samplePatients[(day + i) % samplePatients.length]
          augmented.push(
            generateEncounter(
              day,
              9 + (i % 7),
              (i * 14) % 60,
              p.name,
              p.umr,
              opCounter++,
              p.age,
              p.sex,
              p.dept,
              p.doc,
              (day + i) % 2 === 0,
              (day + i) % 11 === 0 ? "Cancelled" : "OP Completed",
              p.diag,
              p.diag,
              i === 0
                ? "Procedure"
                : i === 1
                  ? "Health Checkup"
                  : (day + i) % 2 === 0
                    ? "New Consultation"
                    : "Follow-up Visit",
            ),
          )
        }
      }

      // Earlier in the month / last month (days 8 through 45)
      for (let day = 8; day <= 45; day += 2) {
        const count = 4 + (day % 5)
        for (let i = 0; i < count; i++) {
          const p = samplePatients[(day * 3 + i) % samplePatients.length]
          augmented.push(
            generateEncounter(
              day,
              9 + (i % 8),
              (i * 15) % 60,
              p.name,
              p.umr,
              opCounter++,
              p.age,
              p.sex,
              p.dept,
              p.doc,
              (day + i) % 3 === 0,
              (day + i) % 13 === 0 ? "Cancelled" : "OP Completed",
              p.diag,
              p.diag,
              (day + i) % 4 === 0
                ? "Health Checkup"
                : (day + i) % 4 === 1
                  ? "Procedure"
                  : (day + i) % 2 === 0
                    ? "New Consultation"
                    : "Follow-up Visit",
            ),
          )
        }
      }

      // Persist augmented set to localStorage
      localStorage.setItem("hospai_db_encounters_v1", JSON.stringify(augmented))
      localStorage.setItem(STORAGE_SEEDED_HISTORICAL_KEY, "true")
    } catch (e) {
      console.warn("Could not seed longitudinal OP report records:", e)
    }
  }

  /**
   * Helper to extract or derive standardized encounter date (YYYY-MM-DD)
   */
  public static getEncounterDate(enc: DBOPEncounter): string {
    if ((enc as any).date && /^\d{4}-\d{2}-\d{2}$/.test((enc as any).date)) {
      return (enc as any).date
    }
    if (
      enc.timestamps?.visitCompleted &&
      enc.timestamps.visitCompleted.includes("-")
    ) {
      const match = enc.timestamps.visitCompleted.match(/\d{4}-\d{2}-\d{2}/)
      if (match) return match[0]
    }
    if (
      enc.timestamps?.registration &&
      enc.timestamps.registration.includes("-")
    ) {
      const match = enc.timestamps.registration.match(/\d{4}-\d{2}-\d{2}/)
      if (match) return match[0]
    }
    // If encounter has an ID formatted as ENC-REP-YYYYMMDD-XXX
    const idMatch = enc.id.match(/ENC-REP-(\d{4})(\d{2})(\d{2})/)
    if (idMatch) {
      return `${idMatch[1]}-${idMatch[2]}-${idMatch[3]}`
    }
    // Default to today if no date found
    return new Date().toISOString().split("T")[0]
  }

  /**
   * Normalizes DB encounter into EnrichedOpVisit
   */
  public static enrichEncounter(enc: DBOPEncounter): EnrichedOpVisit {
    const encDate = this.getEncounterDate(enc)
    const regTime =
      enc.registrationTime || enc.timestamps?.registration || "09:30 AM"

    // Format full Date & Time display
    let formattedDateTime = `${encDate} ${regTime}`
    try {
      const [year, month, day] = encDate.split("-").map(Number)
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ]
      formattedDateTime = `${monthNames[month - 1]} ${day}, ${year} · ${regTime}`
    } catch {
      // fallback
    }

    // Derive Visit Type
    let derivedVisitType: "New Consultation" | "Follow-up Visit" | "Procedure" | "Health Checkup" =
      "New Consultation"
    if ((enc as any).visitType) {
      derivedVisitType = (enc as any).visitType
    } else if (enc.isNew) {
      derivedVisitType = "New Consultation"
    } else if (
      enc.investigations &&
      enc.investigations.some(
        (inv) =>
          inv.toLowerCase().includes("checkup") ||
          inv.toLowerCase().includes("panel"),
      )
    ) {
      derivedVisitType = "Health Checkup"
    } else if (
      enc.services &&
      enc.services.some(
        (s) =>
          s.category === "Procedure" ||
          s.name.toLowerCase().includes("procedure"),
      )
    ) {
      derivedVisitType = "Procedure"
    } else {
      derivedVisitType = "Follow-up Visit"
    }

    // Categorize Status
    let statusCategory: "Waiting" | "In Consultation" | "Completed" | "Cancelled" =
      "Waiting"
    const st = (enc.status || "").toLowerCase()
    if (st.includes("cancel")) {
      statusCategory = "Cancelled"
    } else if (st.includes("under consult") || st.includes("in consult")) {
      statusCategory = "In Consultation"
    } else if (st.includes("completed") || st.includes("discharged")) {
      statusCategory = "Completed"
    } else {
      // Registered, Symptoms Captured, Awaiting Doctor, In Queue, etc.
      statusCategory = "Waiting"
    }

    return {
      ...enc,
      encounterDate: encDate,
      encounterDateTimeFormatted: formattedDateTime,
      derivedVisitType,
      statusCategory,
    }
  }

  /**
   * Computes the exact start and end date (inclusive) for a date range preset
   */
  public static getDateRangeBoundaries(
    preset: DateRangePreset,
    customStart?: string,
    customEnd?: string,
  ): {
    startDate: string
    endDate: string
    prevStartDate: string
    prevEndDate: string
  } {
    const today = new Date()
    const toIso = (d: Date) => d.toISOString().split("T")[0]

    const todayStr = toIso(today)

    if (preset === "today") {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = toIso(yesterday)
      return {
        startDate: todayStr,
        endDate: todayStr,
        prevStartDate: yesterdayStr,
        prevEndDate: yesterdayStr,
      }
    }

    if (preset === "yesterday") {
      const y1 = new Date(today)
      y1.setDate(y1.getDate() - 1)
      const y2 = new Date(today)
      y2.setDate(y2.getDate() - 2)
      return {
        startDate: toIso(y1),
        endDate: toIso(y1),
        prevStartDate: toIso(y2),
        prevEndDate: toIso(y2),
      }
    }

    if (preset === "last7") {
      const start = new Date(today)
      start.setDate(start.getDate() - 6)

      const prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      const prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - 6)

      return {
        startDate: toIso(start),
        endDate: todayStr,
        prevStartDate: toIso(prevStart),
        prevEndDate: toIso(prevEnd),
      }
    }

    if (preset === "last30") {
      const start = new Date(today)
      start.setDate(start.getDate() - 29)

      const prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      const prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - 29)

      return {
        startDate: toIso(start),
        endDate: todayStr,
        prevStartDate: toIso(prevStart),
        prevEndDate: toIso(prevEnd),
      }
    }

    if (preset === "thisMonth") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const dayDiff = Math.max(
        1,
        Math.round(
          (today.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24),
        ),
      )

      const prevMonthEnd = new Date(firstDay)
      prevMonthEnd.setDate(prevMonthEnd.getDate() - 1)
      const prevMonthStart = new Date(prevMonthEnd)
      prevMonthStart.setDate(prevMonthStart.getDate() - dayDiff)

      return {
        startDate: toIso(firstDay),
        endDate: todayStr,
        prevStartDate: toIso(prevMonthStart),
        prevEndDate: toIso(prevMonthEnd),
      }
    }

    if (preset === "lastMonth") {
      const firstDayLastMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1,
      )
      const lastDayLastMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        0,
      )

      const firstDayTwoMonthsAgo = new Date(
        today.getFullYear(),
        today.getMonth() - 2,
        1,
      )
      const lastDayTwoMonthsAgo = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        0,
      )

      return {
        startDate: toIso(firstDayLastMonth),
        endDate: toIso(lastDayLastMonth),
        prevStartDate: toIso(firstDayTwoMonthsAgo),
        prevEndDate: toIso(lastDayTwoMonthsAgo),
      }
    }

    // Custom
    const startStr = customStart || todayStr
    const endStr = customEnd || todayStr
    const sDate = new Date(startStr)
    const eDate = new Date(endStr)
    const diffDays = Math.max(
      1,
      Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)),
    )

    const pEnd = new Date(sDate)
    pEnd.setDate(pEnd.getDate() - 1)
    const pStart = new Date(pEnd)
    pStart.setDate(pStart.getDate() - diffDays)

    return {
      startDate: startStr,
      endDate: endStr,
      prevStartDate: toIso(pStart),
      prevEndDate: toIso(pEnd),
    }
  }

  /**
   * Retrieves all enriched visits and applies the provided filter criteria
   */
  public static getFilteredVisits(filters: OpReportFilters): {
    currentPeriodVisits: EnrichedOpVisit[]
    previousPeriodVisits: EnrichedOpVisit[]
    allVisits: EnrichedOpVisit[]
  } {
    this.ensureLongitudinalData()
    const rawEncounters = db.getEncounters()
    const allEnriched = rawEncounters.map((e) => this.enrichEncounter(e))

    const boundaries = this.getDateRangeBoundaries(
      filters.dateRangePreset,
      filters.customStartDate,
      filters.customEndDate,
    )

    // Apply Department, Doctor, VisitType, Status filters
    const matchDimensionFilters = (v: EnrichedOpVisit): boolean => {
      // Department
      if (filters.department && filters.department !== "All") {
        if (
          v.dept.trim().toLowerCase() !==
          filters.department.trim().toLowerCase()
        ) {
          return false
        }
      }
      // Doctor
      if (filters.doctor && filters.doctor !== "All") {
        const docName = (v.assignedDoctor || v.aiDoctor || "")
          .trim()
          .toLowerCase()
        if (docName !== filters.doctor.trim().toLowerCase()) {
          return false
        }
      }
      // Visit Type
      if (filters.visitType && filters.visitType !== "All") {
        if (v.derivedVisitType !== filters.visitType) {
          return false
        }
      }
      // Status
      if (filters.status && filters.status !== "All") {
        if (v.statusCategory !== filters.status) {
          return false
        }
      }
      return true
    }

    const currentPeriodVisits = allEnriched.filter((v) => {
      const d = v.encounterDate
      const inDateRange = d >= boundaries.startDate && d <= boundaries.endDate
      return inDateRange && matchDimensionFilters(v)
    })

    const previousPeriodVisits = allEnriched.filter((v) => {
      const d = v.encounterDate
      const inDateRange =
        d >= boundaries.prevStartDate && d <= boundaries.prevEndDate
      return inDateRange && matchDimensionFilters(v)
    })

    // Sort current period visits newest first
    currentPeriodVisits.sort((a, b) =>
      b.encounterDate.localeCompare(a.encounterDate),
    )

    return {
      currentPeriodVisits,
      previousPeriodVisits,
      allVisits: allEnriched,
    }
  }

  /**
   * Computes the 6 KPIs with exact period-over-period percentage comparisons
   */
  public static computeKpis(
    currentVisits: EnrichedOpVisit[],
    previousVisits: EnrichedOpVisit[],
  ): OpReportKpis {
    const calcMetric = (
      curr: number,
      prev: number,
      isPositiveTrendGood = true,
    ): KpiMetric => {
      let pct = 0
      if (prev === 0) {
        pct = curr > 0 ? 100 : 0
      } else {
        pct = Number((((curr - prev) / prev) * 100).toFixed(1))
      }
      return {
        value: curr,
        previousValue: prev,
        pctChange: pct,
        isPositive: isPositiveTrendGood ? pct >= 0 : pct <= 0,
      }
    }

    // 1. Total OP Visits
    const totalCurrent = currentVisits.length
    const totalPrev = previousVisits.length

    // 2. New Patients
    const newCurrent = currentVisits.filter((v) => v.isNew).length
    const newPrev = previousVisits.filter((v) => v.isNew).length

    // 3. Existing Patients
    const existingCurrent = currentVisits.filter((v) => !v.isNew).length
    const existingPrev = previousVisits.filter((v) => !v.isNew).length

    // 4. Completed Consultations
    const completedCurrent = currentVisits.filter(
      (v) => v.statusCategory === "Completed",
    ).length
    const completedPrev = previousVisits.filter(
      (v) => v.statusCategory === "Completed",
    ).length

    // 5. Waiting Patients
    const waitingCurrent = currentVisits.filter(
      (v) => v.statusCategory === "Waiting",
    ).length
    const waitingPrev = previousVisits.filter(
      (v) => v.statusCategory === "Waiting",
    ).length

    // 6. Cancelled Visits
    const cancelledCurrent = currentVisits.filter(
      (v) => v.statusCategory === "Cancelled",
    ).length
    const cancelledPrev = previousVisits.filter(
      (v) => v.statusCategory === "Cancelled",
    ).length

    return {
      totalVisits: calcMetric(totalCurrent, totalPrev, true),
      newPatients: calcMetric(newCurrent, newPrev, true),
      existingPatients: calcMetric(existingCurrent, existingPrev, true),
      completedConsultations: calcMetric(completedCurrent, completedPrev, true),
      waitingPatients: calcMetric(waitingCurrent, waitingPrev, false), // more waiting is less favorable
      cancelledVisits: calcMetric(cancelledCurrent, cancelledPrev, false), // more cancelled is less favorable
    }
  }

  /**
   * Generates chronological daily trend data for the Line Chart
   */
  public static computeTrendData(
    visits: EnrichedOpVisit[],
    preset: DateRangePreset,
    startDate: string,
    endDate: string,
  ): OpTrendDataPoint[] {
    const s = new Date(startDate)
    const e = new Date(endDate)
    const dayMap = new Map<string, {
      total: number
      newP: number
      existingP: number
    }>()

    // Seed continuous days across the interval
    const curr = new Date(s)
    while (curr <= e) {
      const iso = curr.toISOString().split("T")[0]
      dayMap.set(iso, { total: 0, newP: 0, existingP: 0 })
      curr.setDate(curr.getDate() + 1)
    }

    // Populate counts
    visits.forEach((v) => {
      const item = dayMap.get(v.encounterDate)
      if (item) {
        item.total += 1
        if (v.isNew) item.newP += 1
        else item.existingP += 1
      }
    })

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]
    const points: OpTrendDataPoint[] = []

    dayMap.forEach((val, dateKey) => {
      const parts = dateKey.split("-").map(Number)
      const label = `${monthNames[parts[1] - 1]} ${parts[2]}`
      points.push({
        date: dateKey,
        label,
        totalVisits: val.total,
        newPatients: val.newP,
        existingPatients: val.existingP,
      })
    })

    return points
  }

  /**
   * Generates department visit breakdown for the Bar Chart
   */
  public static computeDepartmentStats(
    visits: EnrichedOpVisit[],
  ): DepartmentStat[] {
    const counts: Record<string, number> = {}
    visits.forEach((v) => {
      const dept = v.dept || "General Medicine"
      counts[dept] = (counts[dept] || 0) + 1
    })

    const total = visits.length || 1
    const sortedDepts = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([department, count]) => ({
        department,
        count,
        percentage: Number(((count / total) * 100).toFixed(1)),
        color: DEPARTMENT_COLORS[department] || DEPARTMENT_COLORS["Other"],
      }))

    return sortedDepts
  }

  /**
   * Generates visit type distribution for the Donut Chart
   */
  public static computeVisitTypeStats(
    visits: EnrichedOpVisit[],
  ): VisitTypeStat[] {
    const counts: Record<string, number> = {
      "New Consultation": 0,
      "Follow-up Visit": 0,
      Procedure: 0,
      "Health Checkup": 0,
    }

    visits.forEach((v) => {
      counts[v.derivedVisitType] = (counts[v.derivedVisitType] || 0) + 1
    })

    const total = visits.length || 1
    return [
      {
        name: "New Consultation",
        count: counts["New Consultation"],
        percentage: Number(
          ((counts["New Consultation"] / total) * 100).toFixed(1),
        ),
        color: VISIT_TYPE_COLORS["New Consultation"],
      },
      {
        name: "Follow-up Visit",
        count: counts["Follow-up Visit"],
        percentage: Number(
          ((counts["Follow-up Visit"] / total) * 100).toFixed(1),
        ),
        color: VISIT_TYPE_COLORS["Follow-up Visit"],
      },
      {
        name: "Procedure",
        count: counts["Procedure"],
        percentage: Number(((counts["Procedure"] / total) * 100).toFixed(1)),
        color: VISIT_TYPE_COLORS["Procedure"],
      },
      {
        name: "Health Checkup",
        count: counts["Health Checkup"],
        percentage: Number(
          ((counts["Health Checkup"] / total) * 100).toFixed(1),
        ),
        color: VISIT_TYPE_COLORS["Health Checkup"],
      },
    ]
  }

  /**
   * Returns list of all unique departments in the system
   */
  public static getAvailableDepartments(): string[] {
    const fromEncounters = db
      .getEncounters()
      .map((e) => e.dept)
      .filter(Boolean)
    const fromMaster = ACTIVE_SPECIALTIES
    const set = new Set([
      ...fromEncounters,
      ...fromMaster,
      "General Medicine",
      "Cardiology",
      "Orthopedics",
      "Pediatrics",
      "ENT",
      "Dermatology",
    ])
    return Array.from(set).sort()
  }

  /**
   * Returns list of doctors dynamically filtered by department
   */
  public static getDoctorsByDepartment(department: string): string[] {
    if (!department || department === "All") {
      const allMaster = getDoctorMaster().map((d) => d.name)
      const allEncounters = db
        .getEncounters()
        .map((e) => e.assignedDoctor || e.aiDoctor)
        .filter(Boolean)
      return Array.from(new Set([...allMaster, ...allEncounters])).sort()
    }

    const masterSpecialtyDoctors = doctorsForSpecialty(department).map(
      (d) => d.name,
    )
    const encounterDoctors = db
      .getEncounters()
      .filter((e) => (e.dept || "").toLowerCase() === department.toLowerCase())
      .map((e) => e.assignedDoctor || e.aiDoctor)
      .filter(Boolean)

    const merged = Array.from(
      new Set([...masterSpecialtyDoctors, ...encounterDoctors]),
    ).sort()
    return merged.length > 0 ? merged : [`Dr. On Duty (${department})`]
  }
}
