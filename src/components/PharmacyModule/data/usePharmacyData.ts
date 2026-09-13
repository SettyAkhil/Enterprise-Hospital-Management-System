import { useState } from "react";
import { PharmacyDatabase } from "../../../services/pharmacyDb";

export function usePharmacyData() {
  const [medicines, setMedicines] = useState(() => PharmacyDatabase.getMedicines());
  const [prescriptions, setPrescriptions] = useState(() => PharmacyDatabase.getPrescriptions());
  const [suppliers, setSuppliers] = useState(() => PharmacyDatabase.getSuppliers());
  const [purchaseOrders, setPurchaseOrders] = useState(() => PharmacyDatabase.getPurchaseOrders());
  const [categories, setCategories] = useState(() => PharmacyDatabase.getCategories());
  const [batches, setBatches] = useState(() => PharmacyDatabase.getBatches());
  const [bills, setBills] = useState(() => PharmacyDatabase.getBills());
  
  // New States
  const [users, setUsers] = useState(() => PharmacyDatabase.getUsers());
  const [notifications, setNotifications] = useState(() => PharmacyDatabase.getNotifications());
  const [auditLogs, setAuditLogs] = useState(() => PharmacyDatabase.getAuditLogs());
  const [stockTransfers, setStockTransfers] = useState(() => PharmacyDatabase.getTransfers());
  
  const mappedMedicines = medicines.map(m => {
    const mBatches = batches.filter(b => b.medicineId === m.id);
    const latestBatch = mBatches.length > 0 ? mBatches[mBatches.length - 1] : null;
    const mrp = latestBatch ? latestBatch.mrp : 0;
    return {
      id: m.id,
      name: m.brandName || m.medicineName,
      generic: m.genericName,
      strength: m.strength || "N/A",
      form: m.dosageForm || "N/A",
      manufacturer: m.manufacturer,
      stock: batches.reduce((sum, b) => sum + b.availableQuantity, 0),
      mrp: mrp,
      price: mrp * 0.8,
      gst: m.taxPercentage || 12,
      status: m.activeStatus === "Active" ? "active" : "inactive",
      sku: m.hsnCode || m.id,
      barcode: m.barcode || "89000000000",
      schedule: m.scheduleType || "H",
      prescription: m.controlledSubstanceFlag || false,
      category: m.categoryId || "General",
      reorderLevel: m.reorderLevel || 10
    };
  });

  const expiringMedicines = batches
    .filter(b => new Date(b.expiryDate).getTime() < new Date().getTime() + 90 * 24 * 60 * 60 * 1000)
    .map(b => {
      const m = medicines.find(m => m.id === b.medicineId);
      return {
        id: b.id,
        name: m ? m.medicineName : "Unknown",
        batch: b.batchNumber,
        expiry: b.expiryDate,
        stock: b.availableQuantity,
        status: new Date(b.expiryDate) < new Date() ? "expired" : "expiring"
      };
    });

  const last7Days = Array.from({length: 7}).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const salesData = last7Days.map(dateStr => {
    const dayBills = bills.filter(b => b.billDate.startsWith(dateStr));
    return {
      date: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
      revenue: dayBills.reduce((acc, b) => acc + (b.finalAmount || 0), 0),
      orders: dayBills.length
    };
  });

  const refresh = () => {
    setMedicines(PharmacyDatabase.getMedicines());
    setPrescriptions(PharmacyDatabase.getPrescriptions());
    setSuppliers(PharmacyDatabase.getSuppliers());
    setPurchaseOrders(PharmacyDatabase.getPurchaseOrders());
    setCategories(PharmacyDatabase.getCategories());
    setBatches(PharmacyDatabase.getBatches());
    setBills(PharmacyDatabase.getBills());
    setUsers(PharmacyDatabase.getUsers());
    setNotifications(PharmacyDatabase.getNotifications());
    setAuditLogs(PharmacyDatabase.getAuditLogs());
    setStockTransfers(PharmacyDatabase.getTransfers());
  };

  return {
    medicines: mappedMedicines,
    prescriptions: prescriptions.map(p => ({
      id: p.id,
      patient: p.patientName,
      age: p.age || 45,
      gender: p.gender || "Male",
      contact: p.patientId || "+91 9999999999",
      doctor: p.doctorName,
      department: p.department,
      regNo: "MCI/123",
      date: p.date,
      diagnosis: p.diagnosis || "N/A",
      items: p.items ? p.items.length : 0,
      priority: p.priority || "normal",
      status: p.status === "pending" ? "pending" : (p.status === "verified" ? "ready" : (p.status === "dispensed" ? "dispensed" : "rejected")),
      pharmacist: p.pharmacistName || null,
      time: "10:00 AM",
      rawItems: p.items || []
    })),
    suppliers: suppliers.map(s => ({ ...s, outstanding: 0, lastPurchase: "2026-09-12", totalPurchase: 0 })),
    purchaseOrders: purchaseOrders.map(p => ({ ...p, supplier: suppliers.find(s => s.id === p.supplierId)?.supplierName || "Unknown", items: p.items.length, total: p.totalOrderValue || 0 })),
    salesData,
    users,
    notifications,
    auditLogs,
    expiringMedicines,
    batches,
    bills,
    cartItems: [],
    stockTransfers,
    categories: categories.map(c => ({
      id: c.id,
      name: c.categoryName,
      description: c.description,
      medicines: medicines.filter(m => m.categoryId === c.id).length,
      status: c.status === "Active" ? "active" : "inactive"
    })),
    refresh
  };
}
