/**
 * Dispatch of one consultation sheet to the two departments that own its halves.
 *
 * Medicines  -> PharmacyDatabase as a prescription in the existing pharmacy queue.
 * Lab tests  -> LabOrderDatabase as an order that reception must bill before the
 *               laboratory can see it.
 *
 * Kept out of the portal component so the ordering and the audit trail are the
 * same no matter which screen triggers a dispatch, and so a failure on one half
 * is reported rather than leaving the caller guessing which department received
 * what.
 */

import { db, DBOPEncounter } from "./db";
import { AuditDatabase } from "./auditDb";
import { LabOrderDatabase } from "./labOrdersDb";
import {
  ConsultationRecord,
  DoctorAccount,
  DoctorPortalDatabase,
} from "./doctorPortalDb";
import {
  AppPrescription,
  AppPrescriptionItem,
  PharmacyDatabase,
} from "./pharmacyDb";

export interface DispatchResult {
  prescriptionId?: string;
  labOrderId?: string;
  labTotal: number;
  medicineCount: number;
  labTestCount: number;
  errors: string[];
}

/** One-line digest of the sheet, so the pharmacist sees the clinical context at a glance. */
function buildPharmacySummary(record: ConsultationRecord, encounter: DBOPEncounter): string {
  const parts = [
    `${encounter.patientName} (${encounter.age}${encounter.sex?.[0] || ""}, UMR ${encounter.umr}, ${encounter.opNumber})`,
    record.diagnosis ? `Dx: ${record.diagnosis}` : "",
    `${record.medications.length} medicine(s) prescribed by ${record.doctorName}`,
    record.labTests.length ? `${record.labTests.length} investigation(s) routed to lab billing` : "",
    record.advice ? `Advice: ${record.advice}` : "",
  ];
  return parts.filter(Boolean).join(" · ");
}

export function dispatchConsultation(
  record: ConsultationRecord,
  doctor: DoctorAccount
): DispatchResult {
  const encounter = db.getEncounterById(record.encounterId);
  if (!encounter) {
    return {
      labTotal: 0,
      medicineCount: 0,
      labTestCount: 0,
      errors: ["The visit this consultation belongs to no longer exists."],
    };
  }

  const result: DispatchResult = {
    labTotal: 0,
    medicineCount: record.medications.length,
    labTestCount: record.labTests.length,
    errors: [],
  };

  // ── Medicines -> pharmacy ────────────────────────────────────────────────
  if (record.medications.length) {
    try {
      const items: AppPrescriptionItem[] = record.medications.map((med, index) => ({
        id: `RX-ITEM-${index + 1}`,
        medicineName: med.name,
        strength: med.strength,
        dosage: med.dosage || "1 dose",
        frequency: med.frequency,
        duration: med.duration,
        route: med.route,
        instructions: med.instructions,
        quantity: med.quantity > 0 ? med.quantity : 1,
        substitutionAllowed: true,
      }));

      const prescription: AppPrescription = {
        id: `RX-${Date.now().toString(36).toUpperCase()}`,
        patientId: encounter.umr,
        patientName: encounter.patientName,
        uhid: encounter.umr,
        age: encounter.age,
        gender: encounter.sex,
        visitId: encounter.opNumber,
        doctorId: doctor.id,
        doctorName: doctor.name,
        department: encounter.dept || doctor.specialty,
        diagnosis: record.diagnosis || encounter.diagnosis,
        date: new Date().toISOString().split("T")[0],
        // A sheet that came in as an image was digitised by the AI split, so the
        // pharmacist is looking at machine-read text and should verify it against
        // the original -- which is what the OCR source type means in that queue.
        sourceType: record.uploadedPrescription || record.whiteboardImage ? "OCR" : "DIGITAL",
        priority: record.labTests.some(t => t.urgency === "STAT") ? "Urgent" : "Normal",
        status: "Sent To Pharmacy",
        dispensingStatus: "Waiting",
        imageUrl: record.uploadedPrescription?.dataUrl || record.whiteboardImage,
        items,
        verificationNotes: buildPharmacySummary(record, encounter),
        createdAt: new Date().toISOString(),
      };

      PharmacyDatabase.savePrescriptions([prescription, ...PharmacyDatabase.getPrescriptions()]);
      result.prescriptionId = prescription.id;
    } catch (err) {
      result.errors.push(
        `Medicines could not be sent to pharmacy: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  // ── Investigations -> reception/billing, then the lab ────────────────────
  if (record.labTests.length) {
    try {
      const order = LabOrderDatabase.createOrder({
        consultationId: record.id,
        encounterId: encounter.id,
        umr: encounter.umr,
        patientName: encounter.patientName,
        age: encounter.age,
        sex: encounter.sex,
        phone: encounter.phone,
        opNumber: encounter.opNumber,
        doctorId: doctor.id,
        doctorName: doctor.name,
        department: encounter.dept || doctor.specialty,
        diagnosis: record.diagnosis || encounter.diagnosis,
        clinicalNotes: record.summary,
        tests: record.labTests,
      });
      result.labOrderId = order.id;
      result.labTotal = order.billing.total;
    } catch (err) {
      result.errors.push(
        `Investigations could not be sent for billing: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  // ── Close the loop on the visit itself ───────────────────────────────────
  try {
    db.updateEncounter(encounter.id, {
      diagnosis: record.diagnosis || encounter.diagnosis,
      assessment: record.summary || encounter.assessment,
      advice: record.advice || encounter.advice,
      prescription: record.medications.map(m => ({
        medicine: [m.name, m.strength].filter(Boolean).join(" "),
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions,
      })),
      investigations: record.labTests.map(t => t.name),
      // Investigations have to clear reception before the lab starts, so a sheet
      // with tests on it leaves the visit awaiting billing rather than complete.
      status: record.labTests.length ? "Awaiting Billing" : "Consultation Completed",
      furtherAction: record.labTests.length
        ? "Laboratory"
        : record.medications.length
          ? "Pharmacy"
          : "None",
      timestamps: {
        ...encounter.timestamps,
        consultationEnd: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    });
  } catch (err) {
    result.errors.push(
      `The visit record could not be updated: ${err instanceof Error ? err.message : "unknown error"}`
    );
  }

  DoctorPortalDatabase.updateConsultation(record.id, {
    dispatch: "Dispatched",
    dispatchedAt: new Date().toISOString(),
    prescriptionId: result.prescriptionId,
    labOrderId: result.labOrderId,
  });

  AuditDatabase.logEvent(
    "Consultation Dispatched",
    "Clinical",
    `${doctor.name} dispatched ${result.medicineCount} medicine(s) to pharmacy` +
      (result.labOrderId ? ` and ${result.labTestCount} investigation(s) to billing (${result.labOrderId})` : "") +
      ` for ${encounter.patientName} (${encounter.umr}).`,
    result.errors.length ? "Failed" : "Success",
    doctor.staffId,
    doctor.name
  );

  return result;
}
