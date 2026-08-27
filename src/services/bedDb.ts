/**
 * Enterprise Hospital Management System - Inpatient Bed Management Database
 * Real-time persistent state management for Wards, ICU Beds, Bed Allocations,
 * Transfers, and Discharge Clearance.
 */

import { ErDatabase } from "./erDb";

export type BedStatus = "Available" | "Occupied" | "Maintenance";

export interface BedRecord {
  id: number;
  ward: string;
  room_no: string;
  bed_no: string;
  bed_type: "General" | "Semi-Private" | "Private" | "ICU";
  status: BedStatus;
  daily_rate: number;
  allocation_id: number | null;
  admission_id: number | null;
  allocated_at: string | null;
  admission_date: string | null;
  expected_discharge_date: string | null;
  patient_id: string | null;
  patient_name: string | null;
  patient_last_name: string | null;
  patient_phone: string | null;
  patient_age: number | null;
  patient_gender: string | null;
  admission_notes: string | null;
  room_charges_so_far: number | null;
}

export interface DischargedPatientRecord {
  id: string; // "DISC-1001"
  patientId: string;
  patientName: string;
  mrn: string;
  ward: string;
  roomNo: string;
  bedNo: string;
  admissionDate: string;
  dischargeDate: string;
  lengthOfStayDays: number;
  dischargeReason: string;
  roomChargesTotal: number;
  attendingDoctor: string;
}

export interface BedSummary {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
}

const STORAGE_KEY = "hospai_inpatient_beds_v3";
const DISCHARGED_STORAGE_KEY = "hospai_discharged_patients_v3";

const INITIAL_BEDS: BedRecord[] = [
  // ── 3N Medical / Surgical Wards ──
  {
    id: 1,
    ward: "3N Medical/Surgical",
    room_no: "204",
    bed_no: "204-A",
    bed_type: "Semi-Private",
    status: "Occupied",
    daily_rate: 2500,
    allocation_id: 101,
    admission_id: 501,
    allocated_at: "2026-08-22T14:10:00.000Z",
    admission_date: "2026-08-22T14:10:00.000Z",
    expected_discharge_date: "2026-08-29T14:10:00.000Z",
    patient_id: "P-100245",
    patient_name: "John",
    patient_last_name: "Smith",
    patient_phone: "(617) 555-0143",
    patient_age: 41,
    patient_gender: "Male",
    admission_notes: "Admitted from ER: Hyperglycemic urgency and hypertensive episode",
    room_charges_so_far: 12500,
  },
  {
    id: 2,
    ward: "3N Medical/Surgical",
    room_no: "208",
    bed_no: "208-A",
    bed_type: "General",
    status: "Occupied",
    daily_rate: 1500,
    allocation_id: 102,
    admission_id: 502,
    allocated_at: "2026-08-21T09:30:00.000Z",
    admission_date: "2026-08-21T09:30:00.000Z",
    expected_discharge_date: "2026-08-28T09:30:00.000Z",
    patient_id: "P-100246",
    patient_name: "Mary",
    patient_last_name: "Jones",
    patient_phone: "(617) 555-0188",
    patient_age: 53,
    patient_gender: "Female",
    admission_notes: "Admitted for Community Acquired Pneumonia, mild hypoxia",
    room_charges_so_far: 9000,
  },
  {
    id: 3,
    ward: "3N Medical/Surgical",
    room_no: "221",
    bed_no: "221-A",
    bed_type: "Private",
    status: "Occupied",
    daily_rate: 4000,
    allocation_id: 103,
    admission_id: 503,
    allocated_at: "2026-08-19T16:00:00.000Z",
    admission_date: "2026-08-19T16:00:00.000Z",
    expected_discharge_date: "2026-08-30T16:00:00.000Z",
    patient_id: "P-100221",
    patient_name: "Robert",
    patient_last_name: "Lee",
    patient_phone: "(617) 555-0199",
    patient_age: 68,
    patient_gender: "Male",
    admission_notes: "Admitted for Congestive Heart Failure exacerbation",
    room_charges_so_far: 32000,
  },
  {
    id: 4,
    ward: "3N Medical/Surgical",
    room_no: "212",
    bed_no: "212-A",
    bed_type: "General",
    status: "Available",
    daily_rate: 1500,
    allocation_id: null,
    admission_id: null,
    allocated_at: null,
    admission_date: null,
    expected_discharge_date: null,
    patient_id: null,
    patient_name: null,
    patient_last_name: null,
    patient_phone: null,
    patient_age: null,
    patient_gender: null,
    admission_notes: null,
    room_charges_so_far: null,
  },
  {
    id: 5,
    ward: "3N Medical/Surgical",
    room_no: "215",
    bed_no: "215-A",
    bed_type: "Semi-Private",
    status: "Available",
    daily_rate: 2500,
    allocation_id: null,
    admission_id: null,
    allocated_at: null,
    admission_date: null,
    expected_discharge_date: null,
    patient_id: null,
    patient_name: null,
    patient_last_name: null,
    patient_phone: null,
    patient_age: null,
    patient_gender: null,
    admission_notes: null,
    room_charges_so_far: null,
  },

  // ── Intensive Care Unit (ICU) Wards ──
  {
    id: 6,
    ward: "Intensive Care Unit (ICU)",
    room_no: "ICU-01",
    bed_no: "ICU-Bed-1",
    bed_type: "ICU",
    status: "Available",
    daily_rate: 8000,
    allocation_id: null,
    admission_id: null,
    allocated_at: null,
    admission_date: null,
    expected_discharge_date: null,
    patient_id: null,
    patient_name: null,
    patient_last_name: null,
    patient_phone: null,
    patient_age: null,
    patient_gender: null,
    admission_notes: null,
    room_charges_so_far: null,
  },
  {
    id: 7,
    ward: "Intensive Care Unit (ICU)",
    room_no: "ICU-02",
    bed_no: "ICU-Bed-2",
    bed_type: "ICU",
    status: "Available",
    daily_rate: 8000,
    allocation_id: null,
    admission_id: null,
    allocated_at: null,
    admission_date: null,
    expected_discharge_date: null,
    patient_id: null,
    patient_name: null,
    patient_last_name: null,
    patient_phone: null,
    patient_age: null,
    patient_gender: null,
    admission_notes: null,
    room_charges_so_far: null,
  },
  {
    id: 8,
    ward: "Intensive Care Unit (ICU)",
    room_no: "ICU-03",
    bed_no: "ICU-Bed-3",
    bed_type: "ICU",
    status: "Maintenance",
    daily_rate: 8000,
    allocation_id: null,
    admission_id: null,
    allocated_at: null,
    admission_date: null,
    expected_discharge_date: null,
    patient_id: null,
    patient_name: null,
    patient_last_name: null,
    patient_phone: null,
    patient_age: null,
    patient_gender: null,
    admission_notes: "Scheduled ventilator recalibration and deep sanitization",
    room_charges_so_far: null,
  },

  // ── 4S Surgical Ward ──
  {
    id: 9,
    ward: "4S Surgical",
    room_no: "401",
    bed_no: "401-A",
    bed_type: "Private",
    status: "Available",
    daily_rate: 4000,
    allocation_id: null,
    admission_id: null,
    allocated_at: null,
    admission_date: null,
    expected_discharge_date: null,
    patient_id: null,
    patient_name: null,
    patient_last_name: null,
    patient_phone: null,
    patient_age: null,
    patient_gender: null,
    admission_notes: null,
    room_charges_so_far: null,
  },
  {
    id: 10,
    ward: "4S Surgical",
    room_no: "402",
    bed_no: "402-A",
    bed_type: "General",
    status: "Available",
    daily_rate: 1500,
    allocation_id: null,
    admission_id: null,
    allocated_at: null,
    admission_date: null,
    expected_discharge_date: null,
    patient_id: null,
    patient_name: null,
    patient_last_name: null,
    patient_phone: null,
    patient_age: null,
    patient_gender: null,
    admission_notes: null,
    room_charges_so_far: null,
  },
];

const INITIAL_DISCHARGED: DischargedPatientRecord[] = [
  {
    id: "DISC-101",
    patientId: "P-100212",
    patientName: "Frank Torres",
    mrn: "100212",
    ward: "3N Medical/Surgical",
    roomNo: "212",
    bedNo: "212-A",
    admissionDate: "2026-08-23T06:45:00.000Z",
    dischargeDate: "2026-08-26T14:30:00.000Z",
    lengthOfStayDays: 4,
    dischargeReason: "Hypertensive urgency resolved. BP 124/80 on oral amlodipine. Discharge home cleared.",
    roomChargesTotal: 6000,
    attendingDoctor: "Dr. M. Anderson",
  },
  {
    id: "DISC-102",
    patientId: "P-100215",
    patientName: "Helen Park",
    mrn: "100215",
    ward: "3N Medical/Surgical",
    roomNo: "215",
    bedNo: "215-A",
    admissionDate: "2026-08-20T11:20:00.000Z",
    dischargeDate: "2026-08-25T17:00:00.000Z",
    lengthOfStayDays: 6,
    dischargeReason: "Skin infection cleared following IV Vancomycin course. Negative repeat cultures.",
    roomChargesTotal: 15000,
    attendingDoctor: "Dr. M. Anderson",
  },
];

export class BedDatabase {
  private static load(): BedRecord[] {
    if (typeof window === "undefined") return INITIAL_BEDS;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        this.save(INITIAL_BEDS);
        return INITIAL_BEDS;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_BEDS;
    }
  }

  private static save(beds: BedRecord[]): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(beds));
    } catch (e) {
      console.error("Failed to save beds to localStorage", e);
    }
  }

  static getDischargedPatients(): DischargedPatientRecord[] {
    if (typeof window === "undefined") return INITIAL_DISCHARGED;
    try {
      const stored = window.localStorage.getItem(DISCHARGED_STORAGE_KEY);
      if (!stored) {
        this.saveDischarged(INITIAL_DISCHARGED);
        return INITIAL_DISCHARGED;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_DISCHARGED;
    }
  }

  private static saveDischarged(list: DischargedPatientRecord[]): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(DISCHARGED_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("Failed to save discharged patients to localStorage", e);
    }
  }

  static getBeds(): BedRecord[] {
    return this.load();
  }

  static getBed(id: number): BedRecord | undefined {
    return this.load().find((b) => b.id === id);
  }

  static getSummary(): BedSummary {
    const beds = this.load();
    return {
      total: beds.length,
      available: beds.filter((b) => b.status === "Available").length,
      occupied: beds.filter((b) => b.status === "Occupied").length,
      maintenance: beds.filter((b) => b.status === "Maintenance").length,
    };
  }

  /**
   * Allocate Bed from an ER Request (ICU or Inpatient Ward)
   */
  static allocateBedFromEr(bedId: number, erBedRequestId: number, notes?: string): BedRecord {
    const beds = this.load();
    const bedIndex = beds.findIndex((b) => b.id === bedId);
    if (bedIndex === -1) throw new Error("Bed not found");

    const erRequests = ErDatabase.getBedRequests();
    const req = erRequests.find((r) => r.id === erBedRequestId);
    if (!req) throw new Error("ER Bed Request not found");

    const now = new Date().toISOString();
    const targetBed = beds[bedIndex];

    targetBed.status = "Occupied";
    targetBed.allocation_id = 1000 + bedId;
    targetBed.admission_id = 5000 + bedId;
    targetBed.allocated_at = now;
    targetBed.admission_date = now;
    targetBed.expected_discharge_date = new Date(Date.now() + 7 * 86400000).toISOString();
    targetBed.patient_id = req.patient_id || `P-ER-${req.er_visit_id}`;
    targetBed.patient_name = req.patient_name || "Emergency Patient";
    targetBed.patient_last_name = req.patient_last_name || "";
    targetBed.admission_notes = notes || `Admitted from ER (${req.visit_no}) for ${req.requested_level_of_care}`;
    targetBed.room_charges_so_far = targetBed.daily_rate;

    beds[bedIndex] = targetBed;
    this.save(beds);

    return targetBed;
  }

  /**
   * Direct Bed Assignment
   */
  static assignBed(
    bedId: number,
    patient: { patient_id: string; name: string; last_name?: string; phone?: string; age?: number; gender?: string },
    notes?: string,
    expectedDays?: number
  ): BedRecord {
    const beds = this.load();
    const bedIndex = beds.findIndex((b) => b.id === bedId);
    if (bedIndex === -1) throw new Error("Bed not found");

    const now = new Date().toISOString();
    const target = beds[bedIndex];
    const days = expectedDays || 5;

    target.status = "Occupied";
    target.allocation_id = 2000 + bedId;
    target.admission_id = 6000 + bedId;
    target.allocated_at = now;
    target.admission_date = now;
    target.expected_discharge_date = new Date(Date.now() + days * 86400000).toISOString();
    target.patient_id = patient.patient_id;
    target.patient_name = patient.name;
    target.patient_last_name = patient.last_name || "";
    target.patient_phone = patient.phone || null;
    target.patient_age = patient.age || null;
    target.patient_gender = patient.gender || null;
    target.admission_notes = notes || "Direct Inpatient Admission";
    target.room_charges_so_far = target.daily_rate;

    beds[bedIndex] = target;
    this.save(beds);
    return target;
  }

  /**
   * Bed Transfer (e.g. Ward to ICU or Ward to Ward)
   */
  static transferBed(fromBedId: number, toBedId: number, reason?: string): BedRecord {
    const beds = this.load();
    const fromIndex = beds.findIndex((b) => b.id === fromBedId);
    const toIndex = beds.findIndex((b) => b.id === toBedId);

    if (fromIndex === -1 || toIndex === -1) throw new Error("Target or source bed not found");

    const fromBed = beds[fromIndex];
    const toBed = beds[toIndex];

    if (toBed.status !== "Available") throw new Error("Target bed is not available");

    // Copy patient data to new bed
    toBed.status = "Occupied";
    toBed.allocation_id = fromBed.allocation_id;
    toBed.admission_id = fromBed.admission_id;
    toBed.allocated_at = new Date().toISOString();
    toBed.admission_date = fromBed.admission_date;
    toBed.expected_discharge_date = fromBed.expected_discharge_date;
    toBed.patient_id = fromBed.patient_id;
    toBed.patient_name = fromBed.patient_name;
    toBed.patient_last_name = fromBed.patient_last_name;
    toBed.patient_phone = fromBed.patient_phone;
    toBed.patient_age = fromBed.patient_age;
    toBed.patient_gender = fromBed.patient_gender;
    toBed.admission_notes = `${fromBed.admission_notes || ""} | Transferred: ${reason || "Clinical unit change"}`;
    toBed.room_charges_so_far = (fromBed.room_charges_so_far || 0) + toBed.daily_rate;

    // Free original bed
    fromBed.status = "Available";
    fromBed.allocation_id = null;
    fromBed.admission_id = null;
    fromBed.allocated_at = null;
    fromBed.admission_date = null;
    fromBed.expected_discharge_date = null;
    fromBed.patient_id = null;
    fromBed.patient_name = null;
    fromBed.patient_last_name = null;
    fromBed.patient_phone = null;
    fromBed.patient_age = null;
    fromBed.patient_gender = null;
    fromBed.admission_notes = null;
    fromBed.room_charges_so_far = null;

    beds[fromIndex] = fromBed;
    beds[toIndex] = toBed;
    this.save(beds);

    return toBed;
  }

  /**
   * Release Bed (Discharge) with Discharged Directory Archival
   */
  static releaseBed(bedId: number, reason?: string, roomChargesTotal?: number): BedRecord {
    const beds = this.load();
    const bedIndex = beds.findIndex((b) => b.id === bedId);
    if (bedIndex === -1) throw new Error("Bed not found");

    const bed = beds[bedIndex];
    if (bed.patient_id && bed.patient_name) {
      const admDate = bed.admission_date ? new Date(bed.admission_date) : new Date();
      const discDate = new Date();
      const diffDays = Math.max(1, Math.round((discDate.getTime() - admDate.getTime()) / 86400000));

      const dischargedRec: DischargedPatientRecord = {
        id: `DISC-${Math.floor(1000 + Math.random() * 9000)}`,
        patientId: bed.patient_id,
        patientName: `${bed.patient_name} ${bed.patient_last_name || ""}`.trim(),
        mrn: bed.patient_id.replace(/\D/g, "") || String(100000 + bedId),
        ward: bed.ward,
        roomNo: bed.room_no,
        bedNo: bed.bed_no,
        admissionDate: bed.admission_date || new Date().toISOString(),
        dischargeDate: new Date().toISOString(),
        lengthOfStayDays: diffDays,
        dischargeReason: reason || "Clinically stable. Cleared for discharge by Attending Physician.",
        roomChargesTotal: roomChargesTotal || (bed.room_charges_so_far || bed.daily_rate * diffDays),
        attendingDoctor: "Dr. M. Anderson",
      };

      const dischargedList = this.getDischargedPatients();
      dischargedList.unshift(dischargedRec);
      this.saveDischarged(dischargedList);
    }

    bed.status = "Available";
    bed.allocation_id = null;
    bed.admission_id = null;
    bed.allocated_at = null;
    bed.admission_date = null;
    bed.expected_discharge_date = null;
    bed.patient_id = null;
    bed.patient_name = null;
    bed.patient_last_name = null;
    bed.patient_phone = null;
    bed.patient_age = null;
    bed.patient_gender = null;
    bed.admission_notes = null;
    bed.room_charges_so_far = null;

    beds[bedIndex] = bed;
    this.save(beds);
    return bed;
  }

  /**
   * Update Bed Details / Maintenance
   */
  static updateBed(bedId: number, data: Partial<BedRecord>): BedRecord {
    const beds = this.load();
    const bedIndex = beds.findIndex((b) => b.id === bedId);
    if (bedIndex === -1) throw new Error("Bed not found");

    beds[bedIndex] = { ...beds[bedIndex], ...data };
    this.save(beds);
    return beds[bedIndex];
  }

  /**
   * Bulk Create Beds
   */
  static createBedsBulk(data: {
    ward: string;
    room_no: string;
    from_bed: string;
    to_bed: string;
    bed_type: "General" | "Semi-Private" | "Private" | "ICU";
    daily_rate: number;
  }): BedRecord[] {
    const beds = this.load();
    const created: BedRecord[] = [];
    const fromNum = parseInt(data.from_bed.replace(/\D/g, "")) || 1;
    const toNum = parseInt(data.to_bed.replace(/\D/g, "")) || fromNum;

    for (let i = fromNum; i <= toNum; i++) {
      const newBed: BedRecord = {
        id: beds.length + created.length + 1,
        ward: data.ward,
        room_no: data.room_no,
        bed_no: `${data.room_no}-${i}`,
        bed_type: data.bed_type,
        status: "Available",
        daily_rate: data.daily_rate,
        allocation_id: null,
        admission_id: null,
        allocated_at: null,
        admission_date: null,
        expected_discharge_date: null,
        patient_id: null,
        patient_name: null,
        patient_last_name: null,
        patient_phone: null,
        patient_age: null,
        patient_gender: null,
        admission_notes: null,
        room_charges_so_far: null,
      };
      created.push(newBed);
    }

    const updated = [...beds, ...created];
    this.save(updated);
    return created;
  }
}
