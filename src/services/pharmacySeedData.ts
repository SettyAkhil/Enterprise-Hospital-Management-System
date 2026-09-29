/**
 * Clean baseline hospital state for live production / fresh demo use.
 * All stores are initialized as clean empty records.
 */

export function seedPharmacyHospitalData(_force: boolean = false) {
  if (typeof window === "undefined") return

  const MEDICINES_KEY = "hospai_pharm_medicines_v4"
  const BATCHES_KEY = "hospai_pharm_batches_v4"
  const SUPPLIERS_KEY = "hospai_pharm_suppliers_v4"
  const CATEGORIES_KEY = "hospai_pharm_categories_v4"
  const POS_KEY = "hospai_pharm_pos_v4"
  const PRESCRIPTIONS_KEY = "hospai_pharm_rx_v4"
  const BILLS_KEY = "hospai_pharm_bills_v4"
  const RETURNS_KEY = "hospai_pharm_returns_v4"
  const SUPPLIER_RETURNS_KEY = "hospai_pharm_supp_returns_v4"
  const TRANSFERS_KEY = "hospai_pharm_transfers_v4"
  const STOCK_TXS_KEY = "hospai_pharm_stock_txs_v4"
  const AUDIT_LOGS_KEY = "hospai_pharm_audit_logs_v4"
  const USERS_KEY = "hospai_pharm_users_v4"
  const DISMISSED_NOTIFICATIONS_KEY = "hospai_pharm_dismissed_notifs_v4"
  const READ_NOTIFICATIONS_KEY = "hospai_pharm_read_notifs_v4"
  const NOTIFICATIONS_KEY = "hospai_pharm_notifications_v4"

  // Empty collections for completely fresh demo
  window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify([]))
  window.localStorage.setItem(SUPPLIERS_KEY, JSON.stringify([]))
  window.localStorage.setItem(MEDICINES_KEY, JSON.stringify([]))
  window.localStorage.setItem(BATCHES_KEY, JSON.stringify([]))
  window.localStorage.setItem(PRESCRIPTIONS_KEY, JSON.stringify([]))
  window.localStorage.setItem(BILLS_KEY, JSON.stringify([]))
  window.localStorage.setItem(RETURNS_KEY, JSON.stringify([]))
  window.localStorage.setItem(SUPPLIER_RETURNS_KEY, JSON.stringify([]))
  window.localStorage.setItem(TRANSFERS_KEY, JSON.stringify([]))
  window.localStorage.setItem(POS_KEY, JSON.stringify([]))
  window.localStorage.setItem(STOCK_TXS_KEY, JSON.stringify([]))
  window.localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify([]))
  window.localStorage.setItem(USERS_KEY, JSON.stringify([]))

  // Clear notification trackers
  window.localStorage.removeItem(DISMISSED_NOTIFICATIONS_KEY)
  window.localStorage.removeItem(READ_NOTIFICATIONS_KEY)
  window.localStorage.removeItem(NOTIFICATIONS_KEY)

  // Dispatch live update events across the whole app
  window.dispatchEvent(new Event("storage"))
  window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
}

export function seedTestPrescriptionForSelling() {
  if (typeof window === "undefined") return

  const MEDICINES_KEY = "hospai_pharm_medicines_v4"
  const BATCHES_KEY = "hospai_pharm_batches_v4"
  const PRESCRIPTIONS_KEY = "hospai_pharm_rx_v4"

  const med1 = {
    id: "MED-MONTROKIND-01",
    brandName: "MONTROKIND-LC TAB",
    medicineName: "MONTROKIND-LC TAB",
    genericName: "Montelukast + Levocetirizine",
    strength: "10mg + 5mg",
    dosageForm: "TABLETS",
    manufacturer: "Mankind Pharma",
    mnfCode: "MAN",
    hsnCode: "3004 039",
    scheduleType: "H",
    taxPercentage: 5,
    activeStatus: "Active" as const,
    reorderLevel: 10,
    unit: "Tablet",
    barcode: "8901001001",
    storageCondition: "Room Temperature",
    controlledSubstanceFlag: false,
    createdAt: new Date().toISOString(),
  }

  const batch1 = {
    id: "BAT-MONTROKIND-01",
    medicineId: "MED-MONTROKIND-01",
    batchNumber: "B95Z050",
    expiryDate: "2028-03-31",
    manufacturingDate: "2025-03-01",
    quantity: 50,
    availableQuantity: 50,
    mrp: 16.69,
    purchasePrice: 11.5,
    location: "Bin 1",
    grnId: "GRN-2026-001",
    createdAt: new Date().toISOString(),
  }

  const med2 = {
    id: "MED-PANTOCID-01",
    brandName: "PANTOCID 40 MG TABLETS",
    medicineName: "PANTOCID 40 MG TABLETS",
    genericName: "Pantoprazole Gastro-Resistant",
    strength: "40 MG",
    dosageForm: "TABLETS",
    manufacturer: "Sun Pharma",
    mnfCode: "SUN",
    hsnCode: "3004 049",
    scheduleType: "H",
    taxPercentage: 5,
    activeStatus: "Active" as const,
    reorderLevel: 10,
    unit: "Tablet",
    barcode: "8902002002",
    storageCondition: "Room Temperature",
    controlledSubstanceFlag: false,
    createdAt: new Date().toISOString(),
  }

  const batch2 = {
    id: "BAT-PANTOCID-01",
    medicineId: "MED-PANTOCID-01",
    batchNumber: "SIH0896A",
    expiryDate: "2029-05-31",
    manufacturingDate: "2025-05-01",
    quantity: 50,
    availableQuantity: 50,
    mrp: 12.44,
    purchasePrice: 8.2,
    location: "Bin 2",
    grnId: "GRN-2026-002",
    createdAt: new Date().toISOString(),
  }

  const rx = {
    id: "RX-OPD-112320",
    patientId: "PAT-112320",
    patientName: "Mr. G KUMAR",
    uhid: "UMR112320",
    age: 42,
    gender: "Male",
    doctorId: "DOC-CB-01",
    doctorName: "Dr. CHAITANYA BANDARU",
    department: "General Medicine",
    diagnosis: "Acute Bronchitis & Acidity",
    date: new Date().toISOString(),
    sourceType: "OPD" as const,
    priority: "Normal" as const,
    status: "Pending" as const,
    dispensingStatus: "Waiting" as const,
    items: [
      {
        id: "RXI-001",
        medicineId: "MED-MONTROKIND-01",
        medicineName: "MONTROKIND-LC TAB",
        genericName: "Montelukast + Levocetirizine",
        strength: "10mg + 5mg",
        dosage: "1 Tab",
        frequency: "1-0-1",
        duration: "3 Days",
        quantity: 6,
        substitutionAllowed: false,
      },
      {
        id: "RXI-002",
        medicineId: "MED-PANTOCID-01",
        medicineName: "PANTOCID 40 MG TABLETS",
        genericName: "Pantoprazole Gastro-Resistant",
        strength: "40 MG",
        dosage: "1 Tab Before Food",
        frequency: "1-0-0",
        duration: "3 Days",
        quantity: 3,
        substitutionAllowed: false,
      },
    ],
    createdAt: new Date().toISOString(),
  }

  try {
    const existingMeds = JSON.parse(window.localStorage.getItem(MEDICINES_KEY) || "[]")
    const filteredMeds = existingMeds.filter((m: any) => m.id !== med1.id && m.id !== med2.id)
    filteredMeds.push(med1, med2)
    window.localStorage.setItem(MEDICINES_KEY, JSON.stringify(filteredMeds))

    const existingBatches = JSON.parse(window.localStorage.getItem(BATCHES_KEY) || "[]")
    const filteredBatches = existingBatches.filter((b: any) => b.id !== batch1.id && b.id !== batch2.id)
    filteredBatches.push(batch1, batch2)
    window.localStorage.setItem(BATCHES_KEY, JSON.stringify(filteredBatches))

    const existingRx = JSON.parse(window.localStorage.getItem(PRESCRIPTIONS_KEY) || "[]")
    const filteredRx = existingRx.filter((r: any) => r.id !== rx.id)
    filteredRx.unshift(rx)
    window.localStorage.setItem(PRESCRIPTIONS_KEY, JSON.stringify(filteredRx))

    window.dispatchEvent(new Event("storage"))
    window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
  } catch (e) {
    console.error("Failed to seed test prescription:", e)
  }
}

