import React, { useState, useEffect } from "react";
import { PharmacyDatabase, AppCategory, AppMedicine, AppSupplier, AppBatch, AppPurchaseOrder, PurchaseOrderItem, POStatus, AppGRN, AppGRNItem, AppStockTransaction, AppPrescription, AppPharmacyBill, AppPharmacyBillItem, AppPharmacyReturn, AppStockTransfer, ReturnStatus } from "../services/pharmacyDb";
import { AuditDatabase } from "../services/auditDb";
import { RoleDatabase } from "../services/roleDb";

const Icons = {
  PharmacyBg: () => (
    <div className="w-12 h-12 bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
    </div>
  ),
  EmptyBox: () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mx-auto mb-4"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
  ),
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
};

interface PharmacyProps {
  activeModule?: string;
  onNavigate?: (module: string) => void;
}

// Sections are matched by key, never by label text -- substring matching on labels
// silently routed two different pages to the same panel.
type Section =
  | "dashboard" | "dispensing" | "rx" | "ocr" | "returns"
  | "medicine" | "category"
  | "suppliers" | "po" | "grn"
  | "ledger" | "transfers" | "expiry"
  | "analytics";

const MODULE_TO_SECTION: Record<string, Section> = {
  pharmacy: "dashboard",
  pharmacy_dispensing: "dispensing",
  pharmacy_rx: "rx",
  pharmacy_ocr: "ocr",
  pharmacy_returns: "returns",
  pharmacy_medicine: "medicine",
  pharmacy_category: "category",
  pharmacy_suppliers: "suppliers",
  pharmacy_po: "po",
  pharmacy_grn: "grn",
  pharmacy_ledger: "ledger",
  pharmacy_transfers: "transfers",
  pharmacy_expiry: "expiry",
  pharmacy_analytics: "analytics",
};

const SECTION_META: Record<Section, { title: string; subtitle: string }> = {
  dashboard: { title: "Pharmacy Dashboard", subtitle: "Stock position, queue load and today's revenue at a glance." },
  dispensing: { title: "Dispensing & Billing", subtitle: "FEFO point of sale -- batch splits and billing in one pass." },
  rx: { title: "Prescription Queue", subtitle: "Incoming prescriptions waiting on a pharmacist." },
  ocr: { title: "OCR Verification", subtitle: "Map scanned prescription text onto the drug master." },
  returns: { title: "Returns", subtitle: "Take unused medicine back from wards and outpatients." },
  medicine: { title: "Medicine Master", subtitle: "The drug catalogue every other pharmacy screen reads from." },
  category: { title: "Category Master", subtitle: "Therapeutic groupings used for reporting and stock value." },
  suppliers: { title: "Suppliers", subtitle: "Vendors you raise purchase orders against." },
  po: { title: "Purchase Orders", subtitle: "Stock requested from suppliers, awaiting receipt." },
  grn: { title: "GRN Receiving", subtitle: "Book delivered stock into batches against a purchase order." },
  ledger: { title: "Inventory Ledger", subtitle: "Every movement in and out of pharmacy stock." },
  transfers: { title: "Stock Transfers", subtitle: "Move stock from the main pharmacy to ward and ICU stores." },
  expiry: { title: "Expiry Management", subtitle: "Shelf life by batch, and write-offs for expired stock." },
  analytics: { title: "Analytics & Reports", subtitle: "Consumption, movement and revenue across the pharmacy." },
};

export default function Pharmacy({ activeModule, onNavigate }: PharmacyProps = {}) {
  const [section, setSection] = useState<Section>("dashboard");

  useEffect(() => {
    if (activeModule && MODULE_TO_SECTION[activeModule]) {
      setSection(MODULE_TO_SECTION[activeModule]);
    }
  }, [activeModule]);
  
  // Data State
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [medicines, setMedicines] = useState<AppMedicine[]>([]);
  const [suppliers, setSuppliers] = useState<AppSupplier[]>([]);
  const [batches, setBatches] = useState<AppBatch[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<AppPurchaseOrder[]>([]);
  const [grns, setGrns] = useState<AppGRN[]>([]);
  const [stockTxs, setStockTxs] = useState<AppStockTransaction[]>([]);
  const [prescriptions, setPrescriptions] = useState<AppPrescription[]>([]);
  const [bills, setBills] = useState<AppPharmacyBill[]>([]);
  const [returns, setReturns] = useState<AppPharmacyReturn[]>([]);
  const [transfers, setTransfers] = useState<AppStockTransfer[]>([]);

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AppCategory | null>(null);
  const [categorySearch, setCategorySearch] = useState("");

  // Supplier Modal State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<AppSupplier | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");

  // Medicine Modal State
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<AppMedicine | null>(null);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [medicineCategoryFilter, setMedicineCategoryFilter] = useState("all");
  const [medicineStockFilter, setMedicineStockFilter] = useState<"all" | "low" | "out">("all");

  // PO Modal State
  const [showPOModal, setShowPOModal] = useState(false);
  const [editingPO, setEditingPO] = useState<AppPurchaseOrder | null>(null);
  const [poSearch, setPoSearch] = useState("");
  const [selectedMedForPO, setSelectedMedForPO] = useState("");

  // GRN Modal State
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [editingGRN, setEditingGRN] = useState<AppGRN | null>(null);
  const [grnSearch, setGrnSearch] = useState("");
  const [selectedPOForGRN, setSelectedPOForGRN] = useState("");

  // Prescription Modal State
  const [showRxVerificationModal, setShowRxVerificationModal] = useState(false);
  const [verifyingRx, setVerifyingRx] = useState<AppPrescription | null>(null);

  // Dispensing State
  const [selectedRxForDispense, setSelectedRxForDispense] = useState("");
  const [dispenseBillType, setDispenseBillType] = useState<"Cash" | "Insurance" | "Corporate" | "IP_Ward">("Cash");

  // Returns State
  const [returnBillId, setReturnBillId] = useState("");
  const [returnItems, setReturnItems] = useState<{medId: string, batchNo: string, qty: number, reason: string}[]>([]);

  // Expiry Management State
  const [expiryFilter, setExpiryFilter] = useState<"all" | "expired" | "30" | "90">("all");
  const [expirySearch, setExpirySearch] = useState("");

  // OCR Verification State
  const [ocrSearch, setOcrSearch] = useState("");

  // Transfers State
  const [transferDest, setTransferDest] = useState("ICU Store");
  const [transferMed, setTransferMed] = useState("");
  const [transferQty, setTransferQty] = useState(1);

  useEffect(() => {
    setCategories(PharmacyDatabase.getCategories());
    setMedicines(PharmacyDatabase.getMedicines());
    setSuppliers(PharmacyDatabase.getSuppliers());
    setBatches(PharmacyDatabase.getBatches());
    setPurchaseOrders(PharmacyDatabase.getPurchaseOrders());
    setGrns(PharmacyDatabase.getGRNs());
    setStockTxs(PharmacyDatabase.getStockTransactions());
    setPrescriptions(PharmacyDatabase.getPrescriptions());
    setBills(PharmacyDatabase.getBills());
    setReturns(PharmacyDatabase.getReturns());
    setTransfers(PharmacyDatabase.getTransfers());
  }, []);

  // Shortcut buttons move the sidebar too, so its highlight keeps matching the panel on screen.
  const goToModule = (module: string) => {
    setSection(MODULE_TO_SECTION[module] || section);
    onNavigate?.(module);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    
    let updatedCategories;
    if (categories.find(c => c.id === editingCategory.id)) {
      updatedCategories = categories.map(c => c.id === editingCategory.id ? editingCategory : c);
      AuditDatabase.logEvent("Medicine Updated", "Pharmacy", `Updated Category: ${editingCategory.categoryName}`, "Success");
    } else {
      updatedCategories = [...categories, editingCategory];
      AuditDatabase.logEvent("Medicine Created", "Pharmacy", `Created Category: ${editingCategory.categoryName}`, "Success");
    }
    
    PharmacyDatabase.saveCategories(updatedCategories);
    setCategories(updatedCategories);
    setShowCategoryModal(false);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    
    let updatedSuppliers;
    if (suppliers.find(s => s.id === editingSupplier.id)) {
      updatedSuppliers = suppliers.map(s => s.id === editingSupplier.id ? editingSupplier : s);
      AuditDatabase.logEvent("Supplier Updated", "Pharmacy", `Updated Supplier: ${editingSupplier.supplierName}`, "Success");
    } else {
      updatedSuppliers = [...suppliers, editingSupplier];
      AuditDatabase.logEvent("Supplier Created", "Pharmacy", `Created Supplier: ${editingSupplier.supplierName}`, "Success");
    }
    
    PharmacyDatabase.saveSuppliers(updatedSuppliers);
    setSuppliers(updatedSuppliers);
    setShowSupplierModal(false);
  };

  const handleSaveMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedicine) return;
    
    let updatedMedicines;
    if (medicines.find(m => m.id === editingMedicine.id)) {
      updatedMedicines = medicines.map(m => m.id === editingMedicine.id ? editingMedicine : m);
      AuditDatabase.logEvent("Medicine Updated", "Pharmacy", `Updated Medicine: ${editingMedicine.brandName}`, "Success");
    } else {
      updatedMedicines = [...medicines, editingMedicine];
      AuditDatabase.logEvent("Medicine Created", "Pharmacy", `Created Medicine: ${editingMedicine.brandName}`, "Success");
    }
    
    PharmacyDatabase.saveMedicines(updatedMedicines);
    setMedicines(updatedMedicines);
    setShowMedicineModal(false);
  };

  const handleSavePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPO) return;
    if (editingPO.items.length === 0) {
       alert("Please add at least one medicine to the Purchase Order.");
       return;
    }
    
    let updatedPOs;
    if (purchaseOrders.find(p => p.id === editingPO.id)) {
      updatedPOs = purchaseOrders.map(p => p.id === editingPO.id ? editingPO : p);
      AuditDatabase.logEvent(`Purchase Order ${editingPO.status}`, "Pharmacy", `PO Updated: ${editingPO.id}`, "Success");
    } else {
      updatedPOs = [...purchaseOrders, editingPO];
      AuditDatabase.logEvent(`Purchase Order Created`, "Pharmacy", `PO Created: ${editingPO.id}`, "Success");
    }
    
    PharmacyDatabase.savePurchaseOrders(updatedPOs);
    setPurchaseOrders(updatedPOs);
    setShowPOModal(false);
  };

  const addMedToPO = () => {
    if (!selectedMedForPO || !editingPO) return;
    const med = medicines.find(m => m.id === selectedMedForPO);
    if (!med) return;
    
    // Check if already in PO
    if (editingPO.items.find(i => i.medicineId === med.id)) return;
    
    const newItem: PurchaseOrderItem = {
       medicineId: med.id,
       quantity: 100,
       purchasePrice: 0,
       taxPercentage: med.taxPercentage,
       discount: 0,
       totalAmount: 0
    };
    
    setEditingPO({...editingPO, items: [...editingPO.items, newItem]});
    setSelectedMedForPO("");
  };

  const updatePOItem = (index: number, field: keyof PurchaseOrderItem, value: number) => {
    if (!editingPO) return;
    const newItems = [...editingPO.items];
    const item = { ...newItems[index] };
    
    // TypeScript safe assignment since we know we are passing valid keys and numbers
    (item as any)[field] = value;
    
    // Recalculate total for this item: (Qty * Price) - Discount + Tax
    const baseAmount = item.quantity * item.purchasePrice;
    const afterDiscount = baseAmount - item.discount;
    item.totalAmount = afterDiscount + (afterDiscount * (item.taxPercentage / 100));
    
    newItems[index] = item;
    
    // Recalculate total order value
    const totalOrderValue = newItems.reduce((acc, curr) => acc + curr.totalAmount, 0);
    
    setEditingPO({...editingPO, items: newItems, totalOrderValue});
  };

  const removePOItem = (index: number) => {
    if (!editingPO) return;
    const newItems = [...editingPO.items];
    newItems.splice(index, 1);
    const totalOrderValue = newItems.reduce((acc, curr) => acc + curr.totalAmount, 0);
    setEditingPO({...editingPO, items: newItems, totalOrderValue});
  };

  const startGRNFromPO = (poId: string) => {
     const po = purchaseOrders.find(p => p.id === poId);
     if (!po) return;
     
     const grnItems: AppGRNItem[] = po.items.map(i => ({
        medicineId: i.medicineId,
        orderedQty: i.quantity,
        receivedQty: i.quantity, // Default to fully received
        batchNumber: "",
        manufacturingDate: "",
        expiryDate: "",
        purchasePrice: i.purchasePrice,
        sellingPrice: 0 // Needs manual input based on hospital pricing strategy
     }));

     setEditingGRN({
       id: "GRN_" + Date.now(),
       purchaseOrderId: po.id,
       supplierId: po.supplierId,
       invoiceNumber: "",
       grnDate: new Date().toISOString().split("T")[0],
       items: grnItems,
       receivedBy: "U_ADMIN",
       createdAt: new Date().toISOString()
     });
     setSelectedPOForGRN("");
     setShowGRNModal(true);
  };

  const updateGRNItem = (index: number, field: keyof AppGRNItem, value: any) => {
     if (!editingGRN) return;
     const newItems = [...editingGRN.items];
     (newItems[index] as any)[field] = value;
     setEditingGRN({...editingGRN, items: newItems});
  };

  const verifyAndReceiveGRN = (e: React.FormEvent) => {
     e.preventDefault();
     if (!editingGRN) return;

     // 1. Validation
     if (!editingGRN.invoiceNumber) { alert("Invoice Number is required."); return; }
     for (const item of editingGRN.items) {
        if (!item.batchNumber) { alert("Batch number is required for all items."); return; }
        if (!item.expiryDate) { alert("Expiry date is required for all items."); return; }
        if (item.receivedQty <= 0) { alert("Received quantity must be greater than 0."); return; }
     }

     const po = purchaseOrders.find(p => p.id === editingGRN.purchaseOrderId);
     if (!po) return;

     // 2. Create GRN
     const updatedGRNs = [...grns, editingGRN];
     
     // 3. Create Batches & Stock Ledger Entries
     const newBatches = [...batches];
     const newStockTxs = [...stockTxs];

     editingGRN.items.forEach(item => {
        const batchId = `BCH_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        newBatches.push({
           id: batchId,
           medicineId: item.medicineId,
           batchNumber: item.batchNumber,
           expiryDate: item.expiryDate,
           manufacturingDate: item.manufacturingDate,
           initialQuantity: item.receivedQty,
           availableQuantity: item.receivedQty, // FEFO Base
           purchasePrice: item.purchasePrice,
           sellingPrice: item.sellingPrice,
           supplierId: editingGRN.supplierId,
           invoiceNumber: editingGRN.invoiceNumber,
           createdAt: new Date().toISOString()
        });

        newStockTxs.push({
           id: "TX_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
           date: new Date().toISOString(),
           medicineId: item.medicineId,
           batchId: batchId,
           quantity: item.receivedQty,
           transactionType: "PURCHASE_RECEIVED",
           userId: editingGRN.receivedBy,
           reason: `Received via GRN ${editingGRN.id}`
        });
     });

     // 4. Update PO Status
     let allFullyReceived = true;
     editingGRN.items.forEach(item => {
        if (item.receivedQty < item.orderedQty) allFullyReceived = false;
     });

     const updatedPOs = purchaseOrders.map(p => {
        if (p.id === po.id) {
           return { ...p, status: (allFullyReceived ? "Received" : "Partially Received") as POStatus };
        }
        return p;
     });

     // 5. Save everything and log
     PharmacyDatabase.saveGRNs(updatedGRNs);
     PharmacyDatabase.saveBatches(newBatches);
     PharmacyDatabase.saveStockTransactions(newStockTxs);
     PharmacyDatabase.savePurchaseOrders(updatedPOs);
     
     setGrns(updatedGRNs);
     setBatches(newBatches);
     setStockTxs(newStockTxs);
     setPurchaseOrders(updatedPOs);

     AuditDatabase.logEvent("GRN Created", "Pharmacy", `GRN ${editingGRN.id} Verified for PO ${po.id}`, "Success");
     AuditDatabase.logEvent("Stock Added", "Pharmacy", `Stock Increased via GRN ${editingGRN.id}`, "Success");

     setShowGRNModal(false);
  };

  const simulateIncomingPrescription = () => {
      const isEmergency = Math.random() > 0.7;
      const newRx: AppPrescription = {
         id: "RX_" + Date.now(),
         patientId: "PAT_" + Math.floor(Math.random() * 10000),
         patientName: "John Doe",
         uhid: "UHID_9999",
         doctorId: "DOC_1",
         doctorName: "Dr. Smith",
         department: "General Medicine",
         date: new Date().toISOString(),
         sourceType: "OCR",
         priority: isEmergency ? "Emergency" : "Normal",
         status: "Verification Pending",
         dispensingStatus: "Waiting",
         items: [
            {
               id: "ITM_" + Date.now(),
               medicineName: "Amoxy 500mg", // Simulating dirty OCR text
               dosage: "1-0-1",
               duration: "5 days",
               quantity: 10,
               substitutionAllowed: true
            }
         ],
         createdAt: new Date().toISOString()
      };
      const updated = [newRx, ...prescriptions];
      PharmacyDatabase.savePrescriptions(updated);
      setPrescriptions(updated);
      AuditDatabase.logEvent("Prescription Received", "Pharmacy", `Digital Rx ${newRx.id} arrived via OCR.`, "Success");
  };

  const handleVerifyPrescription = (e: React.FormEvent) => {
      e.preventDefault();
      if (!verifyingRx) return;
      
      const updated = prescriptions.map(p => {
         if (p.id === verifyingRx.id) {
            return {
               ...verifyingRx,
               status: "Verified",
               dispensingStatus: "Preparing",
               verifiedBy: "Pharmacist",
               verifiedDate: new Date().toISOString()
            } as AppPrescription;
         }
         return p;
      });
      PharmacyDatabase.savePrescriptions(updated);
      setPrescriptions(updated);
      AuditDatabase.logEvent("Prescription Verified", "Pharmacy", `Rx ${verifyingRx.id} verified and sent to Dispensing Queue.`, "Success");
      setShowRxVerificationModal(false);
  };

  const handleDispenseAndBill = (rxId: string) => {
     const rx = prescriptions.find(p => p.id === rxId);
     if (!rx) return;

     const newBatches = [...batches];
     const newStockTxs = [...stockTxs];
     const billItems: AppPharmacyBillItem[] = [];
     let totalAmount = 0;

     // 1. Process each item through FEFO
     for (const item of rx.items) {
        if (!item.medicineId) {
           alert(`Error: ${item.medicineName} has no verified Medicine ID.`);
           return;
        }

        const med = medicines.find(m => m.id === item.medicineId);
        if (med?.controlledSubstanceFlag) {
            const pin = window.prompt(`[Controlled Substance Warning]\n\n${med.brandName} is a scheduled/controlled substance.\nRequires Supervisor/Secondary Pharmacist PIN to authorize dispensing:\n\n(Enter any PIN to simulate approval)`);
            if (!pin || pin.trim() === "") {
                alert("Dispensing Aborted: Secondary approval failed for controlled substance.");
                return;
            }
        }

        const fefoResult = PharmacyDatabase.executeFEFOSplit(item.medicineId, item.quantity, newBatches);
        
        if (!fefoResult.success) {
           alert(`Insufficient stock to fulfill ${item.quantity} units of ${item.medicineName}.`);
           return;
        }

        // Apply the updated batches from the FEFO engine
        // We clear and push because assigning directly to newBatches would lose reference
        newBatches.length = 0;
        newBatches.push(...fefoResult.remainingBatches);

        // Record the splits
        for (const split of fefoResult.splits) {
           const med = medicines.find(m => m.id === item.medicineId);
           const price = split.batch.sellingPrice || 0;
           const tax = med ? med.taxPercentage : 0;
           
           const lineBase = price * split.usedQty;
           const lineTax = lineBase * (tax / 100);
           const lineTotal = lineBase + lineTax;

           billItems.push({
              medicineId: item.medicineId,
              medicineName: med ? med.brandName : "Unknown",
              batchNumber: split.batch.batchNumber,
              expiryDate: split.batch.expiryDate,
              quantity: split.usedQty,
              unitPrice: price,
              discount: 0,
              tax: tax,
              totalPrice: lineTotal
           });

           totalAmount += lineTotal;

           newStockTxs.push({
              id: "TX_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
              date: new Date().toISOString(),
              medicineId: item.medicineId,
              batchId: split.batch.id,
              quantity: -split.usedQty, // Negative for dispensing
              transactionType: "DISPENSED",
              userId: "Pharmacist", // Should be actual logged in user
              reason: `Dispensed for Rx ${rx.id}`,
              patientId: rx.patientId,
              prescriptionId: rx.id
           });
        }
     }

     // 2. Create the Bill
     const newBill: AppPharmacyBill = {
        id: "BILL_" + Date.now(),
        billNumber: "INV-" + Math.floor(Math.random() * 1000000),
        patientId: rx.patientId,
        patientName: rx.patientName,
        uhid: rx.uhid,
        doctorName: rx.doctorName,
        department: rx.department,
        billType: dispenseBillType,
        paymentStatus: dispenseBillType === "IP_Ward" ? "Pending" : "Paid",
        prescriptionId: rx.id,
        items: billItems,
        subTotal: totalAmount, // Simplification for UI
        discount: 0,
        tax: 0, // In reality, tax should be aggregated
        totalAmount: totalAmount,
        createdBy: "Pharmacist",
        createdAt: new Date().toISOString()
     };

     // 3. Mark Prescription Dispensed
     const updatedPrescriptions = prescriptions.map(p => 
        p.id === rx.id ? { ...p, status: "Dispensed", dispensingStatus: "Dispensed" } as AppPrescription : p
     );

     // 4. Update all stores
     const updatedBills = [newBill, ...bills];
     
     PharmacyDatabase.saveBatches(newBatches);
     PharmacyDatabase.saveStockTransactions(newStockTxs);
     PharmacyDatabase.saveBills(updatedBills);
     PharmacyDatabase.savePrescriptions(updatedPrescriptions);

     setBatches(newBatches);
     setStockTxs(newStockTxs);
     setBills(updatedBills);
     setPrescriptions(updatedPrescriptions);
     setSelectedRxForDispense("");

     AuditDatabase.logEvent("Medicine Dispensed", "Pharmacy", `Bill ${newBill.billNumber} created via FEFO for Rx ${rx.id}`, "Success");
     alert(`Success! Bill ${newBill.billNumber} generated for $${totalAmount.toFixed(2)}.`);
  };

  const handleProcessReturn = () => {
    if (!returnBillId) return;
    const billTxs = stockTxs.filter(tx => tx.billId === returnBillId || tx.prescriptionId === returnBillId);
    if (billTxs.length === 0) {
      alert("Bill or Transaction not found for return.");
      return;
    }

    const newReturns = [...returns];
    const newStockTxs = [...stockTxs];
    const newBatches = [...batches];

    // Simplification: just pick the first item from the transaction and return 1 unit for demo
    const tx = billTxs[0];
    const batch = newBatches.find(b => b.id === tx.batchId);
    if (!batch) return;

    batch.availableQuantity += 1;

    const returnObj: AppPharmacyReturn = {
      id: "RET_" + Date.now(),
      returnNumber: "RET-INV-" + Math.floor(Math.random() * 100000),
      patientUhid: "UHID-RET",
      originalBillId: returnBillId,
      medicineId: tx.medicineId,
      batchNumber: batch.batchNumber,
      returnQuantity: 1,
      returnReason: "Patient returned unused medication",
      approvedBy: "Pharmacist",
      status: "Completed",
      createdAt: new Date().toISOString()
    };
    newReturns.push(returnObj);

    newStockTxs.push({
        id: "TX_" + Date.now(),
        date: new Date().toISOString(),
        medicineId: tx.medicineId,
        batchId: tx.batchId,
        quantity: 1, // Positive for return
        transactionType: "RETURNED",
        userId: "Pharmacist",
        reason: `Returned against Bill ${returnBillId}`
    });

    PharmacyDatabase.saveBatches(newBatches);
    PharmacyDatabase.saveReturns(newReturns);
    PharmacyDatabase.saveStockTransactions(newStockTxs);

    setBatches(newBatches);
    setReturns(newReturns);
    setStockTxs(newStockTxs);
    AuditDatabase.logEvent("Medicine Returned", "Pharmacy", `Return processed for ${returnBillId}`, "Success");
    alert("Return processed successfully. Stock added back to inventory.");
    setReturnBillId("");
  };

  const handleStockTransfer = () => {
    if (!transferMed || transferQty <= 0) return;
    
    const fefoResult = PharmacyDatabase.executeFEFOSplit(transferMed, transferQty, batches, "Main Pharmacy");
    if (!fefoResult.success) {
      alert("Insufficient stock in Main Pharmacy to fulfill transfer.");
      return;
    }

    const newTransfers = [...transfers];
    const newStockTxs = [...stockTxs];
    const newBatches = [...fefoResult.remainingBatches];

    for (const split of fefoResult.splits) {
       // Transfer OUT from Main
       newStockTxs.push({
          id: "TX_" + Date.now() + "O",
          date: new Date().toISOString(),
          medicineId: transferMed,
          batchId: split.batch.id,
          quantity: -split.usedQty,
          transactionType: "TRANSFER_OUT",
          userId: "Pharmacist",
          reason: `Transfer to ${transferDest}`
       });

       // Create new batch record for Destination
       const destBatchId = `BCH_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
       newBatches.push({
           ...split.batch,
           id: destBatchId,
           initialQuantity: split.usedQty,
           availableQuantity: split.usedQty,
           location: transferDest
       });

       // Transfer IN to Destination
       newStockTxs.push({
          id: "TX_" + Date.now() + "I",
          date: new Date().toISOString(),
          medicineId: transferMed,
          batchId: destBatchId,
          quantity: split.usedQty,
          transactionType: "TRANSFER_IN",
          userId: "Pharmacist",
          reason: `Received from Main Pharmacy`
       });

       newTransfers.push({
          id: "TRF_" + Date.now(),
          transferId: "TRF-" + Math.floor(Math.random() * 100000),
          fromLocation: "Main Pharmacy",
          toLocation: transferDest,
          medicineId: transferMed,
          batchId: split.batch.id,
          quantity: split.usedQty,
          requestedBy: "ICU Nurse",
          approvedBy: "Pharmacist",
          status: "Transferred",
          createdAt: new Date().toISOString()
       });
    }

    PharmacyDatabase.saveBatches(newBatches);
    PharmacyDatabase.saveStockTransactions(newStockTxs);
    PharmacyDatabase.saveTransfers(newTransfers);

    setBatches(newBatches);
    setStockTxs(newStockTxs);
    setTransfers(newTransfers);
    AuditDatabase.logEvent("Stock Transferred", "Pharmacy", `Transferred ${transferQty} to ${transferDest}`, "Success");
    alert(`Transferred ${transferQty} units to ${transferDest}.`);
    setTransferQty(1);
  };

  const handleMarkExpired = (batchId: string) => {
    const newBatches = [...batches];
    const bIndex = newBatches.findIndex(b => b.id === batchId);
    if (bIndex === -1) return;
    
    const batch = newBatches[bIndex];
    if (batch.availableQuantity <= 0) return;

    const qty = batch.availableQuantity;
    batch.availableQuantity = 0;

    const newStockTxs = [...stockTxs];
    newStockTxs.push({
        id: "TX_" + Date.now(),
        date: new Date().toISOString(),
        medicineId: batch.medicineId,
        batchId: batch.id,
        quantity: -qty,
        transactionType: "EXPIRED",
        userId: "Pharmacist",
        reason: "Marked as Expired"
    });

    PharmacyDatabase.saveBatches(newBatches);
    PharmacyDatabase.saveStockTransactions(newStockTxs);
    setBatches(newBatches);
    setStockTxs(newStockTxs);
    AuditDatabase.logEvent("Batch Expired", "Pharmacy", `Batch ${batch.batchNumber} marked as expired. Qty: ${qty}`, "Success");
  };

  const filteredCategories = categories.filter(c => c.categoryName.toLowerCase().includes(categorySearch.toLowerCase()));
  const filteredSuppliers = suppliers.filter(s => s.supplierName.toLowerCase().includes(supplierSearch.toLowerCase()));
  const filteredMedicines = medicines
    .filter(m =>
      m.brandName.toLowerCase().includes(medicineSearch.toLowerCase()) ||
      m.genericName.toLowerCase().includes(medicineSearch.toLowerCase()) ||
      m.barcode.toLowerCase().includes(medicineSearch.toLowerCase())
    )
    .filter(m => medicineCategoryFilter === "all" || m.categoryId === medicineCategoryFilter)
    .filter(m => {
      if (medicineStockFilter === "all") return true;
      const onHand = batches.filter(b => b.medicineId === m.id).reduce((a, b) => a + b.availableQuantity, 0);
      return medicineStockFilter === "out" ? onHand === 0 : onHand <= m.reorderLevel;
    });

  const stockOnHand = (medicineId: string) =>
    batches.filter(b => b.medicineId === medicineId).reduce((a, b) => a + b.availableQuantity, 0);

  const stockValue = (medicineId: string) =>
    batches.filter(b => b.medicineId === medicineId).reduce((a, b) => a + b.availableQuantity * b.purchasePrice, 0);

  const lowStockMedicines = medicines.filter(m => {
    const onHand = stockOnHand(m.id);
    return onHand <= m.reorderLevel;
  });

  const daysToExpiry = (expiryDate: string) =>
    Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);

  const activeBatches = batches.filter(b => b.availableQuantity > 0);
  const nearExpiryCount = activeBatches.filter(b => {
    const d = daysToExpiry(b.expiryDate);
    return d >= 0 && d <= 90;
  }).length;
  const expiredCount = activeBatches.filter(b => daysToExpiry(b.expiryDate) < 0).length;

  const EmptyState = ({ title, message }: { title: string, message: string }) => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Icons.EmptyBox />
      <h3 className="text-[16px] font-extrabold text-gray-900 mb-1">{title}</h3>
      <p className="text-[13px] text-gray-500 font-medium max-w-sm">{message}</p>
    </div>
  );

  return (
    <div className="flex-1 bg-[#F4F7FB] flex flex-col h-full overflow-hidden text-gray-900 font-sans select-none">
      {/* Sleek Minimalist Light Header */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 border border-blue-200 text-[#1B4FD8] flex items-center justify-center font-bold text-lg rounded-none">
            💊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-[#94A3B8] font-semibold">Pharmacy</span>
              <span className="text-[#CBD5E1]">/</span>
              <h1 className="text-[15px] font-bold text-[#0F172A] leading-tight">{SECTION_META[section].title}</h1>
              {section === "dispensing" && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 font-bold uppercase tracking-wide">
                  FEFO Active
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-[#64748B] font-medium">{SECTION_META[section].subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => goToModule("pharmacy_dispensing")}
            className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12px] font-semibold px-3 py-1.5 rounded-none border border-blue-600 shadow-2xs transition-colors cursor-pointer"
          >
            ⚡ Quick Dispense
          </button>
          <button
            onClick={() => {
              setEditingPO({
                id: "PO_" + Date.now(),
                supplierId: suppliers[0]?.id || "",
                poDate: new Date().toISOString().split("T")[0],
                expectedDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
                status: "Draft",
                items: [],
                totalOrderValue: 0,
                createdAt: new Date().toISOString(),
                createdBy: "U_ADMIN"
              });
              setShowPOModal(true);
            }}
            className="bg-white hover:bg-gray-50 text-[#0F172A] text-[12px] font-semibold px-3 py-1.5 rounded-none border border-[#CBD5E1] shadow-2xs transition-colors cursor-pointer"
          >
            + New PO
          </button>
          <button
            onClick={() => {
              setEditingMedicine({
                id: "MED_" + Date.now(),
                medicineName: "",
                genericName: "",
                brandName: "",
                categoryId: categories[0]?.id || "",
                manufacturer: "",
                dosageForm: "Tablet",
                strength: "",
                unit: "Strip",
                barcode: "",
                taxPercentage: 0,
                reorderLevel: 50,
                storageCondition: "Room Temperature",
                scheduleType: "Schedule H",
                controlledSubstanceFlag: false,
                activeStatus: "Active",
                createdAt: new Date().toISOString()
              });
              setShowMedicineModal(true);
            }}
            className="bg-white hover:bg-gray-50 text-[#0F172A] text-[12px] font-semibold px-3 py-1.5 rounded-none border border-[#CBD5E1] shadow-2xs transition-colors cursor-pointer"
          >
            + Drug Master
          </button>
        </div>
      </div>

      {/* Main Full-Width Content Area */}
      <div className="flex-1 p-6 overflow-y-auto w-full">
        {section === "dashboard" && (
          <div className="flex flex-col gap-5 flex-1 max-w-6xl mx-auto">
            {/* Extended KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Medicines", value: medicines.length === 0 ? "0" : medicines.length, color: "text-blue-700" },
                { label: "Available Stock Qty", value: batches.reduce((a, b) => a + b.availableQuantity, 0), color: "text-indigo-700" },
                { label: "Pending Verification", value: prescriptions.filter(p => p.status === "Verification Pending" || p.status === "OCR Processing").length, color: "text-amber-600" },
                { label: "Ready For Dispensing", value: prescriptions.filter(p => p.dispensingStatus === "Ready" || p.status === "Ready For Dispensing").length, color: "text-green-600" },
                { label: "Today's Dispensed Items", value: stockTxs.filter(tx => tx.transactionType === "DISPENSED" && tx.date.startsWith(new Date().toISOString().split("T")[0])).length, color: "text-emerald-700" },
                { label: "Low Stock Alerts", value: lowStockMedicines.length, color: "text-red-600" },
                { label: "Near Expiry (90 Days)", value: nearExpiryCount, color: "text-orange-600" },
                { label: "IP/OP Revenue (Today)", value: `$${bills.filter(b => b.createdAt.startsWith(new Date().toISOString().split("T")[0])).reduce((a,b)=>a+b.totalAmount,0).toFixed(2)}`, color: "text-gray-900" }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-4 border border-[#CBD5E1] rounded-none shadow-xs">
                  <div className="text-[11px] font-bold text-[#64748B] mb-1 uppercase tracking-wider">{stat.label}</div>
                  <div className={`text-[22px] font-black ${stat.color}`}>{stat.value}</div>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
               <div className="bg-white border border-[#CBD5E1] rounded-none shadow-xs p-5">
                  <h3 className="text-[13px] font-bold text-gray-900 mb-4">Stock Value by Category</h3>
                  {(() => {
                    const rows = categories
                      .map(c => ({
                        name: c.categoryName,
                        value: medicines.filter(m => m.categoryId === c.id).reduce((a, m) => a + stockValue(m.id), 0)
                      }))
                      .filter(r => r.value > 0)
                      .sort((a, b) => b.value - a.value);
                    const total = rows.reduce((a, r) => a + r.value, 0);

                    if (rows.length === 0) {
                      return <EmptyState title="No Data" message="Receive stock through a GRN to value the shelves by category." />;
                    }

                    return (
                      <div className="space-y-3">
                        {rows.slice(0, 6).map(r => (
                          <div key={r.name}>
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="text-[12px] font-semibold text-gray-700">{r.name}</span>
                              <span className="text-[12px] font-bold text-gray-900">${r.value.toFixed(2)}</span>
                            </div>
                            <div className="h-2 bg-[#F1F5F9] rounded-none overflow-hidden">
                              <div className="h-full bg-[#1B4FD8]" style={{ width: `${Math.max(2, (r.value / rows[0].value) * 100)}%` }} />
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between items-baseline pt-2 border-t border-[#E2E8F0]">
                          <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Total Stock Value</span>
                          <span className="text-[14px] font-black text-gray-900">${total.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
               </div>

               <div className="bg-white border border-[#CBD5E1] rounded-none shadow-xs p-5">
                  <h3 className="text-[13px] font-bold text-gray-900 mb-4">Prescription Queue Status</h3>
                  {prescriptions.length === 0 ? (
                    <EmptyState title="Queue Empty" message="No active prescriptions today." />
                  ) : (
                    <div className="space-y-3">
                      {[
                        { label: "Awaiting verification", tone: "bg-amber-500", count: prescriptions.filter(p => p.status === "Verification Pending" || p.status === "OCR Processing").length },
                        { label: "Verified, ready to dispense", tone: "bg-blue-600", count: prescriptions.filter(p => p.status === "Verified" || p.status === "Approved").length },
                        { label: "Dispensed", tone: "bg-emerald-600", count: prescriptions.filter(p => p.status === "Dispensed").length },
                        { label: "Rejected / cancelled", tone: "bg-gray-400", count: prescriptions.filter(p => p.status === "Rejected" || p.status === "Cancelled").length }
                      ].map(row => (
                        <div key={row.label}>
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-[12px] font-semibold text-gray-700">{row.label}</span>
                            <span className="text-[12px] font-bold text-gray-900">{row.count}</span>
                          </div>
                          <div className="h-2 bg-[#F1F5F9] rounded-none overflow-hidden">
                            <div className={`h-full ${row.tone}`} style={{ width: `${prescriptions.length ? (row.count / prescriptions.length) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-baseline pt-2 border-t border-[#E2E8F0]">
                        <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Emergency priority</span>
                        <span className="text-[14px] font-black text-red-600">{prescriptions.filter(p => p.priority === "Emergency" && p.status !== "Dispensed").length}</span>
                      </div>
                    </div>
                  )}
               </div>
            </div>

            {/* Action lists -- each row is a jump into the section that resolves it */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
               <div className="bg-white border border-[#CBD5E1] rounded-none shadow-xs flex flex-col">
                  <div className="px-5 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
                    <h3 className="text-[13px] font-bold text-gray-900">Reorder Now</h3>
                    <button onClick={() => goToModule("pharmacy_po")} className="text-[11px] font-bold text-[#1B4FD8] hover:underline">Raise PO</button>
                  </div>
                  {lowStockMedicines.length === 0 ? (
                    <div className="px-5 py-8 text-center text-[12px] text-[#64748B] font-medium">Every medicine is above its reorder level.</div>
                  ) : (
                    <div className="divide-y divide-[#F1F5F9]">
                      {lowStockMedicines.slice(0, 6).map(m => {
                        const onHand = stockOnHand(m.id);
                        return (
                          <div key={m.id} className="px-5 py-2.5 flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="text-[12.5px] font-bold text-gray-900 truncate">{m.brandName}</div>
                              <div className="text-[11px] text-[#64748B] font-medium">Reorder level {m.reorderLevel}</div>
                            </div>
                            <span className={`text-[12px] font-black ${onHand === 0 ? "text-red-600" : "text-orange-500"}`}>
                              {onHand === 0 ? "Out of stock" : `${onHand} left`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
               </div>

               <div className="bg-white border border-[#CBD5E1] rounded-none shadow-xs flex flex-col">
                  <div className="px-5 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
                    <h3 className="text-[13px] font-bold text-gray-900">Expiring Soon</h3>
                    <button onClick={() => goToModule("pharmacy_expiry")} className="text-[11px] font-bold text-[#1B4FD8] hover:underline">Review batches</button>
                  </div>
                  {(() => {
                    const soon = activeBatches
                      .filter(b => daysToExpiry(b.expiryDate) <= 90)
                      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
                    if (soon.length === 0) {
                      return <div className="px-5 py-8 text-center text-[12px] text-[#64748B] font-medium">Nothing expires inside 90 days.</div>;
                    }
                    return (
                      <div className="divide-y divide-[#F1F5F9]">
                        {soon.slice(0, 6).map(b => {
                          const days = daysToExpiry(b.expiryDate);
                          const med = medicines.find(m => m.id === b.medicineId);
                          return (
                            <div key={b.id} className="px-5 py-2.5 flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="text-[12.5px] font-bold text-gray-900 truncate">{med?.brandName || "Unknown"}</div>
                                <div className="text-[11px] text-[#64748B] font-mono">{b.batchNumber} &middot; {b.availableQuantity} units</div>
                              </div>
                              <span className={`text-[12px] font-black ${days < 0 ? "text-red-600" : days <= 30 ? "text-orange-500" : "text-amber-600"}`}>
                                {days < 0 ? "Expired" : `${days}d`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
               </div>
            </div>
          </div>
        )}

        {section === "category" && (
          <div className="bg-white shadow-xs border border-[#CBD5E1] rounded-none flex flex-col flex-1 max-w-5xl mx-auto">
             <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC] rounded-t">
               <div className="relative w-72">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"><Icons.Search /></div>
                  <input value={categorySearch} onChange={e => setCategorySearch(e.target.value)} placeholder="Search categories..." className="w-full bg-white border border-[#CBD5E1] rounded-none pl-9 pr-4 py-1.5 text-[12px] focus:outline-none focus:border-[#1B4FD8] font-medium text-gray-900 shadow-sm" />
               </div>
               <button 
                  onClick={() => {
                    setEditingCategory({ id: "CAT_" + Date.now(), categoryName: "", description: "", status: "Active", createdAt: new Date().toISOString() });
                    setShowCategoryModal(true);
                  }}
                  className="bg-[#1B4FD8] hover:bg-[#1E3A8A] text-white px-4 py-1.5 text-[12px] font-bold rounded-none shadow-sm transition-colors flex items-center gap-2"
               >
                 <Icons.Plus /> Add Category
               </button>
             </div>
             <div className="flex-1 overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-[#E2E8F0] text-[11.5px] text-[#64748B] font-bold bg-white">
                     <th className="px-4 py-3 uppercase tracking-wider">Category Name</th>
                     <th className="px-4 py-3 uppercase tracking-wider">Description</th>
                     <th className="px-4 py-3 uppercase tracking-wider">Status</th>
                     <th className="px-4 py-3 text-right uppercase tracking-wider">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="text-[12.5px] text-gray-800 divide-y divide-[#F1F5F9]">
                   {filteredCategories.length === 0 ? (
                     <tr><td colSpan={4}><EmptyState title="No Categories" message="Create your first medicine category to start organizing inventory." /></td></tr>
                   ) : (
                     filteredCategories.map((c) => (
                       <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                         <td className="px-4 py-3 font-bold text-gray-900">{c.categoryName}</td>
                         <td className="px-4 py-3 text-[#64748B]">{c.description}</td>
                         <td className="px-4 py-3">
                           <span className={`px-2 py-0.5 text-[10px] font-bold rounded-none ${c.status === "Active" ? "bg-green-100 text-[#166534] border border-green-200" : "bg-gray-100 text-[#475569] border border-gray-200"}`}>
                             {c.status}
                           </span>
                         </td>
                         <td className="px-4 py-3 text-right">
                           <button onClick={() => { setEditingCategory({ ...c }); setShowCategoryModal(true); }} className="text-[#1B4FD8] hover:text-[#1E3A8A] font-bold">Edit</button>
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {section === "medicine" && (
          <div className="bg-white shadow-sm border border-gray-100 flex flex-col flex-1">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <div className="relative w-72">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icons.Search /></div>
                  <input value={medicineSearch} onChange={e => setMedicineSearch(e.target.value)} placeholder="Search brand, generic or barcode..." className="w-full bg-white border border-gray-200 pl-9 pr-4 py-2 text-[13px] focus:outline-none focus:border-indigo-500 font-medium text-gray-700 shadow-sm" />
               </div>
               <div className="flex items-center gap-2 ml-3">
                 <select
                   value={medicineCategoryFilter}
                   onChange={e => setMedicineCategoryFilter(e.target.value)}
                   className="bg-white border border-gray-200 px-3 py-2 text-[12.5px] font-semibold text-gray-700 focus:outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
                 >
                   <option value="all">All categories</option>
                   {categories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                 </select>
                 <select
                   value={medicineStockFilter}
                   onChange={e => setMedicineStockFilter(e.target.value as "all" | "low" | "out")}
                   className="bg-white border border-gray-200 px-3 py-2 text-[12.5px] font-semibold text-gray-700 focus:outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
                 >
                   <option value="all">Any stock level</option>
                   <option value="low">At or below reorder level</option>
                   <option value="out">Out of stock</option>
                 </select>
               </div>
               <button 
                 onClick={() => {
                   setEditingMedicine({ id: "MED_" + Date.now(), medicineName: "", genericName: "", brandName: "", categoryId: "", manufacturer: "", dosageForm: "Tablet", strength: "", unit: "Strip", barcode: "", taxPercentage: 0, reorderLevel: 50, storageCondition: "Room Temperature", scheduleType: "Schedule H", controlledSubstanceFlag: false, activeStatus: "Active", createdAt: new Date().toISOString() });
                   setShowMedicineModal(true);
                 }}
                 className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-[13px] font-bold inline-flex items-center gap-2 shadow-sm transition-colors"
               >
                 <Icons.Plus /> Add Medicine
               </button>
             </div>
             <div className="flex-1 overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-gray-100 text-[12px] text-gray-900 font-extrabold bg-gray-50">
                     <th className="px-6 py-4">Brand Name</th>
                     <th className="px-6 py-4">Generic Name</th>
                     <th className="px-6 py-4">Category</th>
                     <th className="px-6 py-4">Form & Strength</th>
                     <th className="px-6 py-4">Stock On Hand</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="text-[13px] text-gray-800 divide-y divide-gray-100">
                   {filteredMedicines.length === 0 ? (
                     <tr><td colSpan={7}><EmptyState title="No Medicines Found" message="Nothing matches the current search and filters." /></td></tr>
                   ) : (
                     filteredMedicines.map(m => {
                       const cat = categories.find(c => c.id === m.categoryId);
                       const onHand = stockOnHand(m.id);
                       return (
                         <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                           <td className="px-6 py-4">
                             <div className="font-bold text-gray-900">{m.brandName}</div>
                             {m.controlledSubstanceFlag && <div className="text-[10px] font-bold text-red-600 uppercase tracking-wide mt-1">Controlled</div>}
                           </td>
                           <td className="px-6 py-4 text-gray-500">{m.genericName}</td>
                           <td className="px-6 py-4 text-gray-500">{cat ? cat.categoryName : "—"}</td>
                           <td className="px-6 py-4 text-gray-500 font-mono text-[11.5px]">{m.dosageForm} · {m.strength}</td>
                           <td className="px-6 py-4">
                             <span className={`font-black ${onHand === 0 ? "text-red-600" : onHand <= m.reorderLevel ? "text-orange-500" : "text-gray-900"}`}>{onHand}</span>
                             <span className="text-[11px] text-gray-400 font-medium"> / {m.reorderLevel}</span>
                             {onHand === 0 && <div className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Out of stock</div>}
                             {onHand > 0 && onHand <= m.reorderLevel && <div className="text-[10px] font-bold text-orange-500 uppercase tracking-wide">Reorder</div>}
                           </td>
                           <td className="px-6 py-4">
                             <span className={`px-2.5 py-1 text-[11px] font-bold rounded-none ${m.activeStatus === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                               {m.activeStatus}
                             </span>
                           </td>
                           <td className="px-6 py-4 text-right">
                             <button onClick={() => { setEditingMedicine({ ...m }); setShowMedicineModal(true); }} className="text-indigo-600 hover:text-indigo-800 font-bold">Edit</button>
                           </td>
                         </tr>
                       );
                     })
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {section === "suppliers" && (
          <div className="bg-white shadow-sm border border-gray-100 flex flex-col flex-1">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <div className="relative w-72">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icons.Search /></div>
                  <input value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)} placeholder="Search suppliers..." className="w-full bg-white border border-gray-200 pl-9 pr-4 py-2 text-[13px] focus:outline-none focus:border-indigo-500 font-medium text-gray-700 shadow-sm" />
               </div>
               <button 
                 onClick={() => {
                   setEditingSupplier({ id: "SUP_" + Date.now(), supplierName: "", contactInformation: "", address: "", gstInformation: "", licenseDetails: "", paymentTerms: "30 Days", status: "Active", createdAt: new Date().toISOString() });
                   setShowSupplierModal(true);
                 }}
                 className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-[13px] font-bold inline-flex items-center gap-2 shadow-sm transition-colors"
               >
                 <Icons.Plus /> Add Supplier
               </button>
             </div>
             <div className="flex-1 overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-gray-100 text-[12px] text-gray-900 font-extrabold bg-gray-50">
                     <th className="px-6 py-4">Supplier Name</th>
                     <th className="px-6 py-4">Contact Info</th>
                     <th className="px-6 py-4">GST / License</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="text-[13px] text-gray-800 divide-y divide-gray-100">
                   {filteredSuppliers.length === 0 ? (
                     <tr><td colSpan={5}><EmptyState title="No Suppliers" message="Add pharmaceutical suppliers to manage purchase orders." /></td></tr>
                   ) : (
                     filteredSuppliers.map(s => (
                       <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                         <td className="px-6 py-4 font-bold text-gray-900">{s.supplierName}</td>
                         <td className="px-6 py-4 text-gray-500">{s.contactInformation}</td>
                         <td className="px-6 py-4 text-gray-500 text-[11.5px] font-mono">{s.gstInformation}<br/>{s.licenseDetails}</td>
                         <td className="px-6 py-4">
                           <span className={`px-2.5 py-1 text-[11px] font-bold rounded-none ${s.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                             {s.status}
                           </span>
                         </td>
                         <td className="px-6 py-4 text-right">
                           <button onClick={() => { setEditingSupplier({ ...s }); setShowSupplierModal(true); }} className="text-indigo-600 hover:text-indigo-800 font-bold">Edit</button>
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {section === "po" && (
          <div className="bg-white shadow-sm border border-gray-100 flex flex-col flex-1">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <div className="relative w-72">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icons.Search /></div>
                  <input value={poSearch} onChange={e => setPoSearch(e.target.value)} placeholder="Search POs..." className="w-full bg-white border border-gray-200 pl-9 pr-4 py-2 text-[13px] focus:outline-none focus:border-indigo-500 font-medium text-gray-700 shadow-sm" />
               </div>
               <button 
                 onClick={() => {
                   setEditingPO({ id: "PO_" + Date.now(), supplierId: "", poDate: new Date().toISOString().split("T")[0], expectedDeliveryDate: "", status: "Draft", items: [], totalOrderValue: 0, createdAt: new Date().toISOString(), createdBy: "U_ADMIN" });
                   setShowPOModal(true);
                 }}
                 className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-[13px] font-bold inline-flex items-center gap-2 shadow-sm transition-colors"
               >
                 <Icons.Plus /> Create Purchase Order
               </button>
             </div>
             <div className="flex-1 overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-gray-100 text-[12px] text-gray-900 font-extrabold bg-gray-50">
                     <th className="px-6 py-4">PO Number</th>
                     <th className="px-6 py-4">Supplier</th>
                     <th className="px-6 py-4">Date</th>
                     <th className="px-6 py-4">Total Value</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="text-[13px] text-gray-800 divide-y divide-gray-100">
                   {purchaseOrders.length === 0 ? (
                     <tr><td colSpan={6}><EmptyState title="No Purchase Orders" message="Create a purchase order to request stock from a supplier." /></td></tr>
                   ) : (
                     purchaseOrders.filter(p => p.id.toLowerCase().includes(poSearch.toLowerCase())).map(p => {
                       const sup = suppliers.find(s => s.id === p.supplierId);
                       return (
                         <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                           <td className="px-6 py-4 font-mono font-bold text-indigo-700">{p.id}</td>
                           <td className="px-6 py-4 font-bold text-gray-900">{sup ? sup.supplierName : "Unknown Supplier"}</td>
                           <td className="px-6 py-4 text-gray-500">{new Date(p.poDate).toLocaleDateString()}</td>
                           <td className="px-6 py-4 font-bold text-gray-900">${p.totalOrderValue.toFixed(2)}</td>
                           <td className="px-6 py-4">
                             <span className={`px-2.5 py-1 text-[11px] font-bold rounded-none ${p.status === "Received" ? "bg-green-100 text-green-700" : p.status === "Cancelled" ? "bg-red-100 text-red-700" : p.status === "Ordered" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                               {p.status}
                             </span>
                           </td>
                           <td className="px-6 py-4 text-right">
                             <button onClick={() => { setEditingPO({ ...p }); setShowPOModal(true); }} className="text-indigo-600 hover:text-indigo-800 font-bold">View / Edit</button>
                           </td>
                         </tr>
                       );
                     })
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {section === "grn" && (
          <div className="bg-white shadow-sm border border-gray-100 flex flex-col flex-1 p-6">
             <div className="max-w-xl mx-auto w-full text-center py-10">
               <div className="bg-indigo-50 w-20 h-20 rounded-none flex items-center justify-center text-indigo-600 mx-auto mb-6">
                 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
               </div>
               <h2 className="text-[20px] font-black text-gray-900 mb-2">Goods Receipt Note (GRN)</h2>
               <p className="text-[14px] text-gray-500 font-medium mb-8">Receive inventory from an approved purchase order and instantly convert it into tracked batch stock.</p>
               
               <div className="flex gap-2">
                 <select value={selectedPOForGRN} onChange={e => setSelectedPOForGRN(e.target.value)} className="flex-1 border-2 border-gray-200 px-4 py-3 text-[14px] font-bold text-gray-900 focus:outline-none focus:border-indigo-500 bg-white cursor-pointer shadow-sm">
                   <option value="">-- Select Ordered Purchase Order --</option>
                   {purchaseOrders.filter(p => p.status === "Ordered" || p.status === "Partially Received").map(p => {
                     const s = suppliers.find(sup => sup.id === p.supplierId);
                     return <option key={p.id} value={p.id}>{p.id} — {s?.supplierName} (${p.totalOrderValue.toFixed(2)})</option>
                   })}
                 </select>
                 <button onClick={() => startGRNFromPO(selectedPOForGRN)} disabled={!selectedPOForGRN} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 text-[14px] font-bold shadow-sm transition-colors">
                   Start Receiving
                 </button>
               </div>
             </div>
             
             <div className="mt-8 border-t border-gray-100 pt-8">
               <h3 className="text-[14px] font-extrabold text-gray-900 mb-4">Recent GRN History</h3>
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-gray-100 text-[12px] text-gray-900 font-extrabold bg-gray-50">
                     <th className="px-6 py-4">GRN Number</th>
                     <th className="px-6 py-4">PO Reference</th>
                     <th className="px-6 py-4">Invoice</th>
                     <th className="px-6 py-4">Date</th>
                     <th className="px-6 py-4">Items Rcvd</th>
                   </tr>
                 </thead>
                 <tbody className="text-[13px] text-gray-800 divide-y divide-gray-100">
                   {grns.length === 0 ? (
                     <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No GRN history available.</td></tr>
                   ) : (
                     grns.map(g => (
                       <tr key={g.id}>
                         <td className="px-6 py-4 font-mono font-bold text-indigo-700">{g.id}</td>
                         <td className="px-6 py-4 font-mono text-gray-500">{g.purchaseOrderId}</td>
                         <td className="px-6 py-4 font-bold">{g.invoiceNumber}</td>
                         <td className="px-6 py-4 text-gray-500">{new Date(g.grnDate).toLocaleDateString()}</td>
                         <td className="px-6 py-4 font-bold">{g.items.length}</td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {section === "ledger" && (
          <div className="bg-white shadow-sm border border-gray-100 flex flex-col flex-1">
             <div className="flex-1 overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-gray-100 text-[12px] text-gray-900 font-extrabold bg-gray-50">
                     <th className="px-6 py-4">Date</th>
                     <th className="px-6 py-4">Transaction Type</th>
                     <th className="px-6 py-4">Medicine</th>
                     <th className="px-6 py-4">Batch</th>
                     <th className="px-6 py-4">Qty Change</th>
                     <th className="px-6 py-4">Reason</th>
                   </tr>
                 </thead>
                 <tbody className="text-[13px] text-gray-800 divide-y divide-gray-100">
                   {stockTxs.length === 0 ? (
                     <tr><td colSpan={6}><EmptyState title="No Stock Transactions" message="Complete a GRN receiving process to see stock movement." /></td></tr>
                   ) : (
                     stockTxs.map(tx => {
                       const med = medicines.find(m => m.id === tx.medicineId);
                       const bch = batches.find(b => b.id === tx.batchId);
                       return (
                         <tr key={tx.id} className="hover:bg-gray-50">
                           <td className="px-6 py-4 text-gray-500">{new Date(tx.date).toLocaleString()}</td>
                           <td className="px-6 py-4">
                             <span className={`px-2.5 py-1 text-[11px] font-bold rounded-none ${tx.transactionType.includes("RECEIVED") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                               {tx.transactionType}
                             </span>
                           </td>
                           <td className="px-6 py-4 font-bold">{med?.brandName}</td>
                           <td className="px-6 py-4 font-mono text-[12px] text-gray-500">{bch?.batchNumber}</td>
                           <td className={`px-6 py-4 font-black ${tx.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                             {tx.quantity > 0 ? "+" : ""}{tx.quantity}
                           </td>
                           <td className="px-6 py-4 text-gray-500 text-[12px]">{tx.reason}</td>
                         </tr>
                       );
                     })
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {section === "rx" && (
          <div className="bg-white shadow-sm border border-gray-100 flex flex-col flex-1">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <span className="text-[12px] text-gray-500 font-medium">Emergency first, then urgent, then by arrival time.</span>
               <button onClick={simulateIncomingPrescription} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 text-[13px] font-bold shadow-sm transition-colors">
                 + Simulate Incoming Rx
               </button>
             </div>
             <div className="flex-1 overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-gray-100 text-[12px] text-gray-900 font-extrabold bg-gray-50">
                     <th className="px-6 py-4">Priority</th>
                     <th className="px-6 py-4">Rx ID</th>
                     <th className="px-6 py-4">Patient / UHID</th>
                     <th className="px-6 py-4">Doctor</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4 text-right">Action</th>
                   </tr>
                 </thead>
                 <tbody className="text-[13px] text-gray-800 divide-y divide-gray-100">
                   {prescriptions.length === 0 ? (
                     <tr><td colSpan={6}><EmptyState title="Queue Empty" message="No incoming prescriptions waiting for verification." /></td></tr>
                   ) : (
                     // Sort Emergency to the top, then Urgent, then Normal. Then sort by date.
                     [...prescriptions].sort((a, b) => {
                       const pMap: Record<string, number> = { "Emergency": 3, "Urgent": 2, "Normal": 1 };
                       if (pMap[a.priority] !== pMap[b.priority]) return pMap[b.priority] - pMap[a.priority];
                       return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                     }).map(rx => (
                       <tr key={rx.id} className="hover:bg-gray-50">
                         <td className="px-6 py-4">
                           {rx.priority === "Emergency" && <span className="bg-red-100 text-red-700 font-bold px-2 py-1 text-[11px] rounded-none uppercase tracking-wide flex items-center gap-1 w-max"><div className="w-1.5 h-1.5 rounded-none bg-red-600 animate-pulse"></div>Emergency</span>}
                           {rx.priority === "Urgent" && <span className="bg-orange-100 text-orange-700 font-bold px-2 py-1 text-[11px] rounded-none uppercase tracking-wide w-max block">Urgent</span>}
                           {rx.priority === "Normal" && <span className="text-gray-500 font-bold px-2 py-1 text-[11px] uppercase tracking-wide">Normal</span>}
                         </td>
                         <td className="px-6 py-4 font-mono font-bold text-indigo-700">{rx.id}</td>
                         <td className="px-6 py-4">
                           <div className="font-bold">{rx.patientName}</div>
                           <div className="text-[11px] text-gray-500 font-mono">{rx.uhid}</div>
                         </td>
                         <td className="px-6 py-4 text-gray-500">{rx.doctorName} ({rx.department})</td>
                         <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-[11px] font-bold rounded-none ${rx.status === 'Verification Pending' ? 'bg-yellow-100 text-yellow-700' : rx.status === 'Verified' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{rx.status}</span>
                         </td>
                         <td className="px-6 py-4 text-right">
                           {rx.status === "Verification Pending" || rx.status === "OCR Processing" || rx.status === "Sent To Pharmacy" ? (
                              <button onClick={() => { setVerifyingRx({...rx}); setShowRxVerificationModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-[12px] font-bold shadow-sm transition-colors">Verify OCR</button>
                           ) : (
                              <button className="text-gray-400 font-bold cursor-not-allowed text-[12px]">Verified</button>
                           )}
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {section === "dispensing" && (
          <div className="bg-white shadow-sm border border-gray-100 flex flex-col flex-1 p-6">
             <div className="max-w-2xl mx-auto w-full py-10">
               <div className="text-center mb-8">
                 <div className="bg-indigo-50 w-20 h-20 rounded-none flex items-center justify-center text-indigo-600 mx-auto mb-6">
                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                 </div>
                 <h2 className="text-[20px] font-black text-gray-900 mb-2">FEFO Dispensing & Billing POS</h2>
                 <p className="text-[14px] text-gray-500 font-medium">Select an approved prescription. The FEFO engine will automatically calculate stock availability and batch splits.</p>
               </div>
               
               <div className="bg-gray-50 border border-gray-200 p-6 rounded-none shadow-sm space-y-6">
                 <div>
                   <label className="block text-[12px] font-bold text-gray-700 mb-2 uppercase tracking-wider">Select Approved Prescription</label>
                   <select value={selectedRxForDispense} onChange={e => setSelectedRxForDispense(e.target.value)} className="w-full border-2 border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 focus:outline-none focus:border-indigo-500 bg-white cursor-pointer shadow-sm">
                     <option value="">-- Waiting for Selection --</option>
                     {prescriptions.filter(p => p.status === "Approved" || p.status === "Verified").map(p => (
                       <option key={p.id} value={p.id}>{p.id} — {p.patientName} (Dr. {p.doctorName})</option>
                     ))}
                   </select>
                 </div>

                 {selectedRxForDispense && (
                   <div className="pt-4 border-t border-gray-200">
                     <div className="flex items-center gap-4 mb-6">
                       <div className="flex-1">
                         <label className="block text-[12px] font-bold text-gray-700 mb-2 uppercase tracking-wider">Billing Type</label>
                         <select value={dispenseBillType} onChange={e => setDispenseBillType(e.target.value as any)} className="w-full border-2 border-gray-300 px-4 py-3 text-[14px] font-bold text-gray-900 focus:outline-none focus:border-indigo-500 bg-white cursor-pointer">
                           <option value="Cash">Outpatient (Cash / Immediate)</option>
                           <option value="Insurance">Outpatient (Insurance Claim)</option>
                           <option value="Corporate">Outpatient (Corporate Billing)</option>
                           <option value="IP_Ward">Inpatient (Add to Final Discharge Bill)</option>
                         </select>
                       </div>
                       <div className="pt-6">
                         <button onClick={() => handleDispenseAndBill(selectedRxForDispense)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 text-[14px] font-bold shadow-sm transition-colors whitespace-nowrap">
                           Run FEFO & Dispense
                         </button>
                       </div>
                     </div>
                     <div className="bg-yellow-50 border border-yellow-200 p-4 text-[12px] text-yellow-800 font-medium">
                        <strong>Warning:</strong> Clicking dispense will permanently deduct stock from the earliest expiring batches and generate official stock ledger logs.
                     </div>
                   </div>
                 )}
               </div>

               <div className="mt-12 border-t border-gray-100 pt-8">
                 <h3 className="text-[14px] font-extrabold text-gray-900 mb-4">Recent Pharmacy Bills</h3>
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="border-b border-gray-100 text-[12px] text-gray-900 font-extrabold bg-gray-50">
                       <th className="px-6 py-4">Bill No</th>
                       <th className="px-6 py-4">Patient</th>
                       <th className="px-6 py-4">Type</th>
                       <th className="px-6 py-4">Status</th>
                       <th className="px-6 py-4 text-right">Amount</th>
                     </tr>
                   </thead>
                   <tbody className="text-[13px] text-gray-800 divide-y divide-gray-100">
                     {bills.length === 0 ? (
                       <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No recent bills generated.</td></tr>
                     ) : (
                       bills.map(b => (
                         <tr key={b.id}>
                           <td className="px-6 py-4 font-mono font-bold text-indigo-700">{b.billNumber}</td>
                           <td className="px-6 py-4 font-bold">{b.patientName}</td>
                           <td className="px-6 py-4 text-gray-500">{b.billType}</td>
                           <td className="px-6 py-4">
                             <span className={`px-2 py-1 text-[11px] font-bold rounded-none ${b.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{b.paymentStatus}</span>
                           </td>
                           <td className="px-6 py-4 text-right font-black text-[14px] text-gray-900">${b.totalAmount.toFixed(2)}</td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
          </div>
        )}

        {section === "returns" && (
          <div className="bg-white shadow-sm border border-gray-100 flex flex-col flex-1 p-6">
             <div className="max-w-xl mx-auto w-full py-10">
               <p className="text-[14px] text-gray-500 font-medium mb-8">Returned stock goes back onto the shelf against its original batch.</p>
               
               <div className="flex gap-2">
                 <input type="text" value={returnBillId} onChange={e => setReturnBillId(e.target.value)} placeholder="Enter Original Rx ID or Bill ID" className="flex-1 border-2 border-gray-200 px-4 py-3 text-[14px] font-bold focus:outline-none focus:border-indigo-500" />
                 <button onClick={handleProcessReturn} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 text-[14px] font-bold shadow-sm transition-colors">
                   Process Return (1 Unit)
                 </button>
               </div>
             </div>

             <div className="mt-8 border-t border-gray-100 pt-8">
               <h3 className="text-[14px] font-extrabold text-gray-900 mb-4">Recent Returns</h3>
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-gray-100 text-[12px] text-gray-900 font-extrabold bg-gray-50">
                     <th className="px-6 py-4">Return No</th>
                     <th className="px-6 py-4">Original Bill</th>
                     <th className="px-6 py-4">Medicine</th>
                     <th className="px-6 py-4">Qty</th>
                     <th className="px-6 py-4">Status</th>
                   </tr>
                 </thead>
                 <tbody className="text-[13px] text-gray-800 divide-y divide-gray-100">
                   {returns.length === 0 ? (
                     <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No returns processed.</td></tr>
                   ) : (
                     returns.map(r => {
                        const med = medicines.find(m => m.id === r.medicineId);
                        return (
                         <tr key={r.id}>
                           <td className="px-6 py-4 font-mono font-bold text-indigo-700">{r.returnNumber}</td>
                           <td className="px-6 py-4 text-gray-500 font-mono">{r.originalBillId}</td>
                           <td className="px-6 py-4 font-bold">{med?.brandName}</td>
                           <td className="px-6 py-4 text-green-600 font-black">+{r.returnQuantity}</td>
                           <td className="px-6 py-4"><span className="bg-green-100 text-green-700 font-bold px-2 py-1 text-[11px] rounded-none uppercase tracking-wide">{r.status}</span></td>
                         </tr>
                       )
                     })
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {section === "transfers" && (
          <div className="bg-white shadow-sm border border-gray-100 flex flex-col flex-1 p-6">
             <div className="max-w-3xl mx-auto w-full py-10">
               <p className="text-[14px] text-gray-500 font-medium mb-8">Stock leaves the main pharmacy ledger and lands in the destination store.</p>
               
               <div className="bg-gray-50 p-6 border border-gray-200 grid grid-cols-4 gap-4 items-end">
                  <div className="col-span-2">
                     <label className="block text-[12px] font-bold text-gray-700 mb-2 uppercase tracking-wider">Medicine</label>
                     <select value={transferMed} onChange={e => setTransferMed(e.target.value)} className="w-full border-2 border-gray-300 px-3 py-2.5 text-[13px] font-bold">
                        <option value="">-- Select Medicine --</option>
                        {medicines.map(m => <option key={m.id} value={m.id}>{m.brandName}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="block text-[12px] font-bold text-gray-700 mb-2 uppercase tracking-wider">Destination</label>
                     <select value={transferDest} onChange={e => setTransferDest(e.target.value)} className="w-full border-2 border-gray-300 px-3 py-2.5 text-[13px] font-bold">
                        <option value="ICU Store">ICU Store</option>
                        <option value="Emergency Store">Emergency Store</option>
                        <option value="Ward A Pharmacy">Ward A Pharmacy</option>
                     </select>
                  </div>
                  <div className="flex gap-2">
                     <input type="number" min="1" value={transferQty} onChange={e => setTransferQty(parseInt(e.target.value)||0)} className="w-20 border-2 border-gray-300 px-3 py-2.5 text-[13px] font-bold text-center" />
                     <button onClick={handleStockTransfer} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-bold transition-colors">Transfer</button>
                  </div>
               </div>
             </div>

             <div className="mt-8 border-t border-gray-100 pt-8">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-gray-100 text-[12px] text-gray-900 font-extrabold bg-gray-50">
                     <th className="px-6 py-4">Transfer ID</th>
                     <th className="px-6 py-4">Medicine</th>
                     <th className="px-6 py-4">Route</th>
                     <th className="px-6 py-4">Qty</th>
                     <th className="px-6 py-4">Status</th>
                   </tr>
                 </thead>
                 <tbody className="text-[13px] text-gray-800 divide-y divide-gray-100">
                   {transfers.length === 0 ? (
                     <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No recent transfers.</td></tr>
                   ) : (
                     transfers.map(t => {
                        const med = medicines.find(m => m.id === t.medicineId);
                        return (
                         <tr key={t.id}>
                           <td className="px-6 py-4 font-mono font-bold text-indigo-700">{t.transferId}</td>
                           <td className="px-6 py-4 font-bold">{med?.brandName}</td>
                           <td className="px-6 py-4 text-gray-500 font-mono text-[11px]">{t.fromLocation} → {t.toLocation}</td>
                           <td className="px-6 py-4 font-black">{t.quantity}</td>
                           <td className="px-6 py-4"><span className="bg-blue-100 text-blue-700 font-bold px-2 py-1 text-[11px] rounded-none uppercase tracking-wide">{t.status}</span></td>
                         </tr>
                       )
                     })
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {section === "analytics" && (
          <div className="bg-gray-50 flex flex-col flex-1 p-6 overflow-y-auto">
             {/* Reports Area */}
             <div className="grid grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 shadow-sm p-5 rounded-none">
                   <h3 className="text-[13px] font-extrabold text-gray-900 mb-4 uppercase tracking-wider">Sales Revenue Summary</h3>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                         <span className="text-gray-500 text-[13px] font-bold">Total Cash Sales</span>
                         <span className="font-black text-[16px] text-green-700">${bills.filter(b=>b.billType==="Cash").reduce((sum,b)=>sum+b.totalAmount,0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                         <span className="text-gray-500 text-[13px] font-bold">Insurance Claims</span>
                         <span className="font-black text-[16px] text-blue-700">${bills.filter(b=>b.billType==="Insurance").reduce((sum,b)=>sum+b.totalAmount,0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                         <span className="text-gray-500 text-[13px] font-bold">Inpatient (IP) Ward Charges</span>
                         <span className="font-black text-[16px] text-indigo-700">${bills.filter(b=>b.billType==="IP_Ward").reduce((sum,b)=>sum+b.totalAmount,0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                         <span className="text-gray-900 text-[14px] font-black uppercase">Total Billed Revenue</span>
                         <span className="font-black text-[20px] text-gray-900">${bills.reduce((sum,b)=>sum+b.totalAmount,0).toFixed(2)}</span>
                      </div>
                   </div>
                </div>

                <div className="bg-white border border-gray-200 shadow-sm p-5 rounded-none">
                   <h3 className="text-[13px] font-extrabold text-gray-900 mb-4 uppercase tracking-wider">Inventory Health</h3>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                         <span className="text-gray-500 text-[13px] font-bold">Total Batches Tracking</span>
                         <span className="font-black text-[16px] text-gray-900">{batches.length}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                         <span className="text-gray-500 text-[13px] font-bold">Total Stock Transferred Internally</span>
                         <span className="font-black text-[16px] text-gray-900">{transfers.reduce((sum,t)=>sum+t.quantity,0)} units</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                         <span className="text-gray-500 text-[13px] font-bold">Total Stock Marked Expired</span>
                         <span className="font-black text-[16px] text-red-600">{Math.abs(stockTxs.filter(t=>t.transactionType==="EXPIRED").reduce((sum,t)=>sum+t.quantity,0))} units</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                         <span className="text-gray-500 text-[13px] font-bold">Total Prescriptions Received</span>
                         <span className="font-black text-[16px] text-gray-900">{prescriptions.length}</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {section === "ocr" && (
          <div className="bg-white shadow-sm border border-gray-100 flex flex-col flex-1">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <span className="text-[12px] text-gray-500 font-medium">Unmapped lines block dispensing.</span>
               <div className="flex items-center gap-2">
                 <div className="relative flex items-center">
                   <span className="absolute left-3 text-gray-400"><Icons.Search /></span>
                   <input
                     value={ocrSearch}
                     onChange={e => setOcrSearch(e.target.value)}
                     placeholder="Search Rx ID, patient or UHID"
                     className="w-[260px] border border-gray-300 pl-10 pr-3 py-2 text-[13px] font-medium focus:outline-none focus:border-indigo-500"
                   />
                 </div>
                 <button onClick={simulateIncomingPrescription} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 text-[13px] font-bold shadow-sm transition-colors">
                   + Simulate Scan
                 </button>
               </div>
             </div>

             <div className="flex-1 overflow-y-auto p-6">
               {(() => {
                 const q = ocrSearch.trim().toLowerCase();
                 const scans = prescriptions
                   .filter(rx => rx.sourceType === "OCR" || rx.sourceType === "UPLOADED_IMAGE")
                   .filter(rx => rx.status === "OCR Processing" || rx.status === "Verification Pending" || rx.status === "Sent To Pharmacy" || rx.status === "Received")
                   .filter(rx => !q || rx.id.toLowerCase().includes(q) || rx.patientName.toLowerCase().includes(q) || rx.uhid.toLowerCase().includes(q))
                   .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                 if (scans.length === 0) {
                   return <EmptyState title="Nothing To Verify" message="Every scanned prescription has been mapped to the drug master. New scans land here automatically." />;
                 }

                 return (
                   <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                     {scans.map(rx => {
                       const unresolved = rx.items.filter(it => !it.medicineId).length;
                       return (
                         <div key={rx.id} className="border border-gray-200 bg-white shadow-sm flex flex-col">
                           <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-start justify-between gap-3">
                             <div>
                               <div className="font-mono font-bold text-indigo-700 text-[13px]">{rx.id}</div>
                               <div className="text-[13px] font-bold text-gray-900">{rx.patientName} <span className="text-gray-400 font-mono text-[11px]">{rx.uhid}</span></div>
                               <div className="text-[11px] text-gray-500 font-medium">{rx.doctorName} &middot; {rx.department} &middot; {new Date(rx.createdAt).toLocaleString()}</div>
                             </div>
                             <div className="flex flex-col items-end gap-1">
                               <span className="bg-gray-900 text-white font-bold px-2 py-1 text-[10px] uppercase tracking-wide">{rx.sourceType === "OCR" ? "Scanned" : "Uploaded"}</span>
                               {rx.priority !== "Normal" && (
                                 <span className={`font-bold px-2 py-1 text-[10px] uppercase tracking-wide ${rx.priority === "Emergency" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>{rx.priority}</span>
                               )}
                             </div>
                           </div>

                           <div className="p-5 flex-1">
                             <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">OCR Text &rarr; Drug Master</div>
                             <div className="divide-y divide-gray-100 border border-gray-100">
                               {rx.items.map(it => {
                                 const med = it.medicineId ? medicines.find(m => m.id === it.medicineId) : undefined;
                                 return (
                                   <div key={it.id} className="flex items-center justify-between gap-3 px-3 py-2">
                                     <div className="min-w-0">
                                       <div className="font-mono text-[12px] text-gray-900 truncate">{it.medicineName}</div>
                                       <div className="text-[11px] text-gray-500 font-medium">{it.dosage} &middot; {it.duration} &middot; Qty {it.quantity}</div>
                                     </div>
                                     {med ? (
                                       <span className="bg-green-100 text-green-700 font-bold px-2 py-1 text-[11px] whitespace-nowrap">{med.brandName}</span>
                                     ) : (
                                       <span className="bg-amber-100 text-amber-700 font-bold px-2 py-1 text-[11px] uppercase tracking-wide whitespace-nowrap">Unmapped</span>
                                     )}
                                   </div>
                                 );
                               })}
                             </div>
                           </div>

                           <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
                             <span className={`text-[12px] font-bold ${unresolved > 0 ? "text-amber-600" : "text-green-600"}`}>
                               {unresolved > 0 ? `${unresolved} line(s) need mapping` : "All lines mapped"}
                             </span>
                             <button
                               onClick={() => { setVerifyingRx({ ...rx }); setShowRxVerificationModal(true); }}
                               className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-[12px] font-bold shadow-sm transition-colors"
                             >
                               Open Verification
                             </button>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 );
               })()}
             </div>
          </div>
        )}

        {section === "expiry" && (
          <div className="bg-white shadow-sm border border-gray-100 flex flex-col flex-1">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 gap-4 flex-wrap">
               <span className="text-[12px] text-gray-500 font-medium">Marking a batch expired writes it off against the ledger.</span>
               <div className="relative flex items-center">
                 <span className="absolute left-3 text-gray-400"><Icons.Search /></span>
                 <input
                   value={expirySearch}
                   onChange={e => setExpirySearch(e.target.value)}
                   placeholder="Search batch or medicine"
                   className="w-[260px] border border-gray-300 pl-10 pr-3 py-2 text-[13px] font-medium focus:outline-none focus:border-indigo-500"
                 />
               </div>
             </div>

             <div className="px-6 pt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
               {[
                 { key: "expired" as const, label: "Already Expired", value: expiredCount, color: "text-red-600" },
                 { key: "30" as const, label: "Expiring in 30 Days", value: activeBatches.filter(b => { const d = daysToExpiry(b.expiryDate); return d >= 0 && d <= 30; }).length, color: "text-orange-600" },
                 { key: "90" as const, label: "Expiring in 90 Days", value: nearExpiryCount, color: "text-amber-600" },
                 { key: "all" as const, label: "Active Batches", value: activeBatches.length, color: "text-gray-900" }
               ].map(card => (
                 <button
                   key={card.key}
                   type="button"
                   onClick={() => setExpiryFilter(card.key)}
                   className={`text-left p-4 border rounded-none shadow-xs transition-colors cursor-pointer ${expiryFilter === card.key ? "border-[#1B4FD8] bg-indigo-50/50" : "border-[#CBD5E1] bg-white hover:bg-gray-50"}`}
                 >
                   <div className="text-[11px] font-bold text-[#64748B] mb-1 uppercase tracking-wider">{card.label}</div>
                   <div className={`text-[22px] font-black ${card.color}`}>{card.value}</div>
                 </button>
               ))}
             </div>

             <div className="flex-1 overflow-x-auto p-6">
               <div className="border border-gray-200 shadow-sm">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="border-b border-gray-100 text-[11px] text-gray-500 font-bold bg-gray-50 uppercase tracking-wider">
                       <th className="px-6 py-3">Batch No</th>
                       <th className="px-6 py-3">Medicine</th>
                       <th className="px-6 py-3">Location</th>
                       <th className="px-6 py-3">Expiry Date</th>
                       <th className="px-6 py-3">Shelf Life</th>
                       <th className="px-6 py-3">Stock Left</th>
                       <th className="px-6 py-3">Value At Risk</th>
                       <th className="px-6 py-3 text-right">Action</th>
                     </tr>
                   </thead>
                   <tbody className="text-[13px] text-gray-800 divide-y divide-gray-100">
                     {(() => {
                       const q = expirySearch.trim().toLowerCase();
                       const rows = activeBatches
                         .filter(b => {
                           const d = daysToExpiry(b.expiryDate);
                           if (expiryFilter === "expired") return d < 0;
                           if (expiryFilter === "30") return d >= 0 && d <= 30;
                           if (expiryFilter === "90") return d >= 0 && d <= 90;
                           return true;
                         })
                         .filter(b => {
                           if (!q) return true;
                           const med = medicines.find(m => m.id === b.medicineId);
                           return b.batchNumber.toLowerCase().includes(q) || (med?.brandName || "").toLowerCase().includes(q) || (med?.genericName || "").toLowerCase().includes(q);
                         })
                         .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

                       if (rows.length === 0) {
                         return <tr><td colSpan={8}><EmptyState title="Nothing In This Bucket" message="No batches match the selected expiry window." /></td></tr>;
                       }

                       return rows.map(b => {
                         const days = daysToExpiry(b.expiryDate);
                         const med = medicines.find(m => m.id === b.medicineId);
                         const tone = days < 0 ? "text-red-600" : days <= 30 ? "text-orange-500" : days <= 90 ? "text-amber-600" : "text-gray-600";
                         return (
                           <tr key={b.id} className={days < 0 ? "bg-red-50" : "hover:bg-gray-50"}>
                             <td className="px-6 py-4 font-mono font-bold text-[12px]">{b.batchNumber}</td>
                             <td className="px-6 py-4">
                               <div className="font-bold">{med?.brandName || "Unknown"}</div>
                               <div className="text-[11px] text-gray-500 font-medium">{med?.genericName}</div>
                             </td>
                             <td className="px-6 py-4 text-gray-500">{b.location || "Main Pharmacy"}</td>
                             <td className={`px-6 py-4 font-black ${tone}`}>{new Date(b.expiryDate).toLocaleDateString()}</td>
                             <td className={`px-6 py-4 font-bold ${tone}`}>{days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}</td>
                             <td className="px-6 py-4 font-black">{b.availableQuantity}</td>
                             <td className="px-6 py-4 font-bold text-gray-700">${(b.availableQuantity * b.purchasePrice).toFixed(2)}</td>
                             <td className="px-6 py-4 text-right">
                               <button onClick={() => handleMarkExpired(b.id)} className="border border-red-200 bg-white text-red-600 hover:bg-red-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors">Mark Expired</button>
                             </td>
                           </tr>
                         );
                       });
                     })()}
                   </tbody>
                 </table>
               </div>
             </div>
          </div>
        )}

      </div>

      {/* --- MODALS --- */}
      {showCategoryModal && editingCategory && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white shadow-xl w-[450px] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-[16px] font-extrabold text-gray-900">
                {editingCategory.categoryName ? "Edit Category" : "Add New Category"}
              </h2>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-900 font-bold">✕</button>
            </div>
            <form id="catForm" onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Category Name</label>
                <input required value={editingCategory.categoryName} onChange={e => setEditingCategory({...editingCategory, categoryName: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="e.g. Antibiotics" />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Description</label>
                <textarea required value={editingCategory.description} onChange={e => setEditingCategory({...editingCategory, description: e.target.value})} rows={3} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="Brief description..." />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Status</label>
                <select value={editingCategory.status} onChange={e => setEditingCategory({...editingCategory, status: e.target.value as any})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all bg-white cursor-pointer">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => setShowCategoryModal(false)} type="button" className="px-5 py-2 text-[13px] font-bold text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
              <button form="catForm" type="submit" className="px-5 py-2 text-[13px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors">Save Category</button>
            </div>
          </div>
        </div>
      )}

      {showSupplierModal && editingSupplier && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white shadow-xl w-[600px] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-[16px] font-extrabold text-gray-900">
                {editingSupplier.supplierName ? "Edit Supplier" : "Add New Supplier"}
              </h2>
              <button onClick={() => setShowSupplierModal(false)} className="text-gray-400 hover:text-gray-900 font-bold">✕</button>
            </div>
            <form id="supForm" onSubmit={handleSaveSupplier} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Supplier Name</label>
                <input required value={editingSupplier.supplierName} onChange={e => setEditingSupplier({...editingSupplier, supplierName: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="e.g. PharmaCorp Ltd." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Contact Information</label>
                  <input required value={editingSupplier.contactInformation} onChange={e => setEditingSupplier({...editingSupplier, contactInformation: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="Phone / Email" />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Payment Terms</label>
                  <input value={editingSupplier.paymentTerms} onChange={e => setEditingSupplier({...editingSupplier, paymentTerms: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="e.g. 30 Days Credit" />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Address</label>
                <textarea required value={editingSupplier.address} onChange={e => setEditingSupplier({...editingSupplier, address: e.target.value})} rows={2} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="Full address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">GST Number</label>
                  <input required value={editingSupplier.gstInformation} onChange={e => setEditingSupplier({...editingSupplier, gstInformation: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="GSTIN" />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Drug License Details</label>
                  <input required value={editingSupplier.licenseDetails} onChange={e => setEditingSupplier({...editingSupplier, licenseDetails: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="DL Number" />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Status</label>
                <select value={editingSupplier.status} onChange={e => setEditingSupplier({...editingSupplier, status: e.target.value as any})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all bg-white cursor-pointer">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => setShowSupplierModal(false)} type="button" className="px-5 py-2 text-[13px] font-bold text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
              <button form="supForm" type="submit" className="px-5 py-2 text-[13px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors">Save Supplier</button>
            </div>
          </div>
        </div>
      )}

      {showMedicineModal && editingMedicine && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white shadow-xl w-[700px] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-[16px] font-extrabold text-gray-900">
                {editingMedicine.medicineName ? "Edit Medicine" : "Add New Medicine"}
              </h2>
              <button onClick={() => setShowMedicineModal(false)} className="text-gray-400 hover:text-gray-900 font-bold">✕</button>
            </div>
            <form id="medForm" onSubmit={handleSaveMedicine} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Brand Name</label>
                  <input required value={editingMedicine.brandName} onChange={e => setEditingMedicine({...editingMedicine, brandName: e.target.value, medicineName: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="e.g. Tylenol" />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Generic Name</label>
                  <input required value={editingMedicine.genericName} onChange={e => setEditingMedicine({...editingMedicine, genericName: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="e.g. Paracetamol" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Category</label>
                  <select required value={editingMedicine.categoryId} onChange={e => setEditingMedicine({...editingMedicine, categoryId: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all bg-white cursor-pointer">
                    <option value="" disabled>Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.categoryName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Manufacturer</label>
                  <input required value={editingMedicine.manufacturer} onChange={e => setEditingMedicine({...editingMedicine, manufacturer: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="e.g. Pfizer" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Dosage Form</label>
                  <select value={editingMedicine.dosageForm} onChange={e => setEditingMedicine({...editingMedicine, dosageForm: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all bg-white cursor-pointer">
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Injection">Injection</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Ointment">Ointment</option>
                    <option value="Drops">Drops</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Strength</label>
                  <input required value={editingMedicine.strength} onChange={e => setEditingMedicine({...editingMedicine, strength: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="e.g. 500mg" />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Unit (Packaging)</label>
                  <select value={editingMedicine.unit} onChange={e => setEditingMedicine({...editingMedicine, unit: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all bg-white cursor-pointer">
                    <option value="Strip">Strip</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Vial">Vial</option>
                    <option value="Box">Box</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Reorder Level (Qty)</label>
                  <input required type="number" min="0" value={editingMedicine.reorderLevel} onChange={e => setEditingMedicine({...editingMedicine, reorderLevel: parseInt(e.target.value)})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="50" />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Tax Percentage</label>
                  <input required type="number" min="0" max="100" value={editingMedicine.taxPercentage} onChange={e => setEditingMedicine({...editingMedicine, taxPercentage: parseFloat(e.target.value)})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="5%" />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Barcode</label>
                  <input value={editingMedicine.barcode} onChange={e => setEditingMedicine({...editingMedicine, barcode: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="Optional" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Storage Condition</label>
                  <input value={editingMedicine.storageCondition} onChange={e => setEditingMedicine({...editingMedicine, storageCondition: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="e.g. Room Temperature" />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Schedule Type</label>
                  <input value={editingMedicine.scheduleType} onChange={e => setEditingMedicine({...editingMedicine, scheduleType: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all" placeholder="e.g. Schedule H" />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={editingMedicine.controlledSubstanceFlag} onChange={e => setEditingMedicine({...editingMedicine, controlledSubstanceFlag: e.target.checked})} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-none" />
                  <div>
                    <span className="block text-[13px] font-bold text-red-600">Controlled Substance</span>
                    <span className="block text-[11px] text-gray-500 font-medium">Requires dual authentication for dispensing</span>
                  </div>
                </label>
                
                <div className="w-48">
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Status</label>
                  <select value={editingMedicine.activeStatus} onChange={e => setEditingMedicine({...editingMedicine, activeStatus: e.target.value as any})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-indigo-500 transition-all bg-white cursor-pointer">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

            </form>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => setShowMedicineModal(false)} type="button" className="px-5 py-2 text-[13px] font-bold text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
              <button form="medForm" type="submit" className="px-5 py-2 text-[13px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors">Save Medicine</button>
            </div>
          </div>
        </div>
      )}

      {showPOModal && editingPO && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white shadow-xl w-[900px] flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                 <h2 className="text-[16px] font-extrabold text-gray-900">
                   {editingPO.id.includes("PO_") && editingPO.items.length === 0 ? "Create Purchase Order" : `Purchase Order: ${editingPO.id}`}
                 </h2>
                 <p className="text-[12px] text-gray-500 font-medium">Build a drug order and submit it to a supplier.</p>
              </div>
              <button onClick={() => setShowPOModal(false)} className="text-gray-400 hover:text-gray-900 font-bold">✕</button>
            </div>
            
            <form id="poForm" onSubmit={handleSavePO} className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              {/* Header Info */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50/50 border border-gray-100 rounded-none">
                 <div className="col-span-2">
                   <label className="block text-[12px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Supplier</label>
                   <select required disabled={editingPO.status === "Received" || editingPO.status === "Ordered"} value={editingPO.supplierId} onChange={e => setEditingPO({...editingPO, supplierId: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13px] font-bold text-gray-900 focus:outline-none focus:border-indigo-500 bg-white cursor-pointer">
                     <option value="" disabled>Select Supplier</option>
                     {suppliers.map(s => (
                       <option key={s.id} value={s.id}>{s.supplierName}</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-[12px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Expected Delivery</label>
                   <input required disabled={editingPO.status === "Received" || editingPO.status === "Ordered"} type="date" value={editingPO.expectedDeliveryDate} onChange={e => setEditingPO({...editingPO, expectedDeliveryDate: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13px] font-bold text-gray-900 focus:outline-none focus:border-indigo-500" />
                 </div>
                 <div>
                   <label className="block text-[12px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Status</label>
                   <select value={editingPO.status} onChange={e => setEditingPO({...editingPO, status: e.target.value as POStatus})} className={`w-full border-2 border-gray-200 px-3 py-2 text-[13px] font-bold focus:outline-none focus:border-indigo-500 bg-white cursor-pointer ${editingPO.status === "Ordered" ? "text-indigo-700" : "text-gray-900"}`}>
                     <option value="Draft">Draft</option>
                     <option value="Submitted">Submitted</option>
                     <option value="Approved">Approved</option>
                     <option value="Ordered">Ordered</option>
                     <option value="Cancelled">Cancelled</option>
                     {/* Partially Received / Received are handled by GRN */}
                     <option value="Partially Received" disabled>Partially Received</option>
                     <option value="Received" disabled>Received</option>
                   </select>
                 </div>
              </div>

              {/* Items Section */}
              <div className="flex flex-col flex-1 border border-gray-200">
                 <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                    <span className="text-[13px] font-extrabold text-gray-900">Order Items</span>
                    {editingPO.status !== "Received" && editingPO.status !== "Ordered" && (
                      <div className="flex gap-2 items-center">
                         <select value={selectedMedForPO} onChange={e => setSelectedMedForPO(e.target.value)} className="w-64 border border-gray-300 px-2 py-1 text-[12px] font-medium focus:outline-none focus:border-indigo-500 bg-white cursor-pointer">
                           <option value="">-- Add Medicine to Order --</option>
                           {medicines.map(m => (
                             <option key={m.id} value={m.id}>{m.brandName} ({m.genericName})</option>
                           ))}
                         </select>
                         <button type="button" onClick={addMedToPO} className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-1 text-[12px] font-bold transition-colors">Add</button>
                      </div>
                    )}
                 </div>
                 
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                         <tr className="border-b border-gray-200 text-[11px] text-gray-500 font-bold bg-white uppercase tracking-wider">
                           <th className="px-4 py-3">Medicine</th>
                           <th className="px-4 py-3 w-24">Order Qty</th>
                           <th className="px-4 py-3 w-28">Pur. Price ($)</th>
                           <th className="px-4 py-3 w-24">Tax (%)</th>
                           <th className="px-4 py-3 w-24">Disc ($)</th>
                           <th className="px-4 py-3 w-28 text-right">Total ($)</th>
                           <th className="px-4 py-3 w-12"></th>
                         </tr>
                       </thead>
                       <tbody className="text-[13px] text-gray-900 divide-y divide-gray-100">
                         {editingPO.items.length === 0 ? (
                           <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-medium text-[13px]">No items added to this purchase order.</td></tr>
                         ) : (
                           editingPO.items.map((item, index) => {
                             const med = medicines.find(m => m.id === item.medicineId);
                             const isReadonly = editingPO.status === "Received" || editingPO.status === "Ordered";
                             return (
                               <tr key={index} className="bg-white">
                                 <td className="px-4 py-3 font-bold">{med ? med.brandName : "Unknown"}</td>
                                 <td className="px-4 py-3">
                                   <input disabled={isReadonly} type="number" min="1" value={item.quantity} onChange={e => updatePOItem(index, "quantity", parseInt(e.target.value) || 0)} className="w-full border border-gray-300 px-2 py-1 text-[13px] focus:outline-none focus:border-indigo-500" />
                                 </td>
                                 <td className="px-4 py-3">
                                   <input disabled={isReadonly} type="number" min="0" step="0.01" value={item.purchasePrice} onChange={e => updatePOItem(index, "purchasePrice", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 px-2 py-1 text-[13px] focus:outline-none focus:border-indigo-500" />
                                 </td>
                                 <td className="px-4 py-3">
                                   <input disabled={isReadonly} type="number" min="0" max="100" value={item.taxPercentage} onChange={e => updatePOItem(index, "taxPercentage", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 px-2 py-1 text-[13px] focus:outline-none focus:border-indigo-500 bg-gray-50" />
                                 </td>
                                 <td className="px-4 py-3">
                                   <input disabled={isReadonly} type="number" min="0" step="0.01" value={item.discount} onChange={e => updatePOItem(index, "discount", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 px-2 py-1 text-[13px] focus:outline-none focus:border-indigo-500" />
                                 </td>
                                 <td className="px-4 py-3 text-right font-mono font-bold text-indigo-700">
                                   ${item.totalAmount.toFixed(2)}
                                 </td>
                                 <td className="px-4 py-3 text-center">
                                   {!isReadonly && <button type="button" onClick={() => removePOItem(index)} className="text-red-500 hover:text-red-700 font-bold">✕</button>}
                                 </td>
                               </tr>
                             );
                           })
                         )}
                       </tbody>
                       <tfoot className="bg-gray-50 border-t border-gray-200">
                          <tr>
                            <td colSpan={5} className="px-4 py-3 text-right font-bold text-[13px] text-gray-600 uppercase tracking-wider">Total Order Value</td>
                            <td className="px-4 py-3 text-right font-black text-[15px] text-indigo-700">${editingPO.totalOrderValue.toFixed(2)}</td>
                            <td></td>
                          </tr>
                       </tfoot>
                    </table>
                 </div>
              </div>

            </form>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowPOModal(false)} type="button" className="px-5 py-2 text-[13px] font-bold text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
              <button form="poForm" type="submit" className="px-5 py-2 text-[13px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors">Save Purchase Order</button>
            </div>
          </div>
        </div>
      )}

      {showGRNModal && editingGRN && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white shadow-xl w-[1000px] flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                 <h2 className="text-[16px] font-extrabold text-gray-900">Verify & Receive GRN</h2>
                 <p className="text-[12px] text-gray-500 font-medium">Entering this data will permanently create batch records and increase inventory.</p>
              </div>
              <button onClick={() => setShowGRNModal(false)} className="text-gray-400 hover:text-gray-900 font-bold">✕</button>
            </div>
            
            <form id="grnForm" onSubmit={verifyAndReceiveGRN} className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              {/* Header Info */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-none">
                 <div>
                   <label className="block text-[12px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Purchase Order Ref</label>
                   <input disabled value={editingGRN.purchaseOrderId} className="w-full border-2 border-gray-200 px-3 py-2 text-[13px] font-bold text-gray-500 focus:outline-none bg-gray-100" />
                 </div>
                 <div>
                   <label className="block text-[12px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">GRN Date</label>
                   <input required type="date" value={editingGRN.grnDate} onChange={e => setEditingGRN({...editingGRN, grnDate: e.target.value})} className="w-full border-2 border-yellow-300 px-3 py-2 text-[13px] font-bold text-gray-900 focus:outline-none focus:border-indigo-500" />
                 </div>
                 <div>
                   <label className="block text-[12px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Supplier Invoice No.</label>
                   <input required value={editingGRN.invoiceNumber} onChange={e => setEditingGRN({...editingGRN, invoiceNumber: e.target.value})} className="w-full border-2 border-yellow-300 px-3 py-2 text-[13px] font-bold text-gray-900 focus:outline-none focus:border-indigo-500" placeholder="Required" />
                 </div>
              </div>

              {/* Items Section */}
              <div className="flex flex-col flex-1 border border-gray-200">
                 <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                    <span className="text-[13px] font-extrabold text-gray-900">Stock Verification (Batching)</span>
                 </div>
                 
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                         <tr className="border-b border-gray-200 text-[11px] text-gray-500 font-bold bg-white uppercase tracking-wider">
                           <th className="px-4 py-3">Medicine</th>
                           <th className="px-4 py-3 w-20">Ord</th>
                           <th className="px-4 py-3 w-24">Rcvd Qty</th>
                           <th className="px-4 py-3 w-32">Batch No</th>
                           <th className="px-4 py-3 w-36">Mfg Date</th>
                           <th className="px-4 py-3 w-36">Exp Date</th>
                           <th className="px-4 py-3 w-24">Sell Pr. ($)</th>
                         </tr>
                       </thead>
                       <tbody className="text-[13px] text-gray-900 divide-y divide-gray-100">
                         {editingGRN.items.map((item, index) => {
                           const med = medicines.find(m => m.id === item.medicineId);
                           return (
                             <tr key={index} className="bg-white">
                               <td className="px-4 py-3 font-bold text-[12px]">{med ? med.brandName : "Unknown"}</td>
                               <td className="px-4 py-3 text-gray-500 font-mono">{item.orderedQty}</td>
                               <td className="px-4 py-3">
                                 <input required type="number" min="0" max={item.orderedQty} value={item.receivedQty} onChange={e => updateGRNItem(index, "receivedQty", parseInt(e.target.value) || 0)} className="w-full border border-gray-300 px-2 py-1 text-[13px] focus:outline-none focus:border-indigo-500 font-bold text-green-700" />
                               </td>
                               <td className="px-4 py-3">
                                 <input required value={item.batchNumber} onChange={e => updateGRNItem(index, "batchNumber", e.target.value)} className="w-full border border-gray-300 px-2 py-1 text-[12px] focus:outline-none focus:border-indigo-500 font-mono uppercase" placeholder="BCH01" />
                               </td>
                               <td className="px-4 py-3">
                                 <input type="month" value={item.manufacturingDate} onChange={e => updateGRNItem(index, "manufacturingDate", e.target.value)} className="w-full border border-gray-300 px-2 py-1 text-[12px] focus:outline-none focus:border-indigo-500" />
                               </td>
                               <td className="px-4 py-3">
                                 <input required type="month" value={item.expiryDate} onChange={e => updateGRNItem(index, "expiryDate", e.target.value)} className="w-full border border-gray-300 px-2 py-1 text-[12px] focus:outline-none focus:border-indigo-500" />
                               </td>
                               <td className="px-4 py-3">
                                 <input required type="number" min="0" step="0.01" value={item.sellingPrice} onChange={e => updateGRNItem(index, "sellingPrice", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 px-2 py-1 text-[13px] focus:outline-none focus:border-indigo-500" placeholder="SRP" />
                               </td>
                             </tr>
                           );
                         })}
                       </tbody>
                    </table>
                 </div>
              </div>

            </form>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-between shrink-0">
              <p className="text-[11px] text-gray-500 max-w-sm">Saving this GRN will automatically lock the batch records, increase the global stock ledger, and mark the PO as Received.</p>
              <div className="flex gap-3">
                 <button onClick={() => setShowGRNModal(false)} type="button" className="px-5 py-2 text-[13px] font-bold text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
                 <button form="grnForm" type="submit" className="px-5 py-2 text-[13px] font-bold text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors">Verify & Receive Stock</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRxVerificationModal && verifyingRx && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white shadow-xl w-[900px] flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                 <h2 className="text-[16px] font-extrabold text-gray-900">Verify OCR Prescription</h2>
                 <p className="text-[12px] text-gray-500 font-medium">Map extracted text to Pharmacy Master Data and approve for dispensing.</p>
              </div>
              <button onClick={() => setShowRxVerificationModal(false)} className="text-gray-400 hover:text-gray-900 font-bold">✕</button>
            </div>
            
            <form id="rxVerifyForm" onSubmit={handleVerifyPrescription} className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
               <div className="bg-gray-50 border border-gray-200 p-4 rounded-none flex gap-6">
                 <div className="w-1/3 border-r border-gray-200 pr-4">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Patient Details</div>
                    <div className="font-bold text-gray-900 text-[14px]">{verifyingRx.patientName}</div>
                    <div className="font-mono text-gray-500 text-[12px]">{verifyingRx.uhid}</div>
                 </div>
                 <div className="w-1/3 border-r border-gray-200 pr-4">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Doctor Details</div>
                    <div className="font-bold text-gray-900 text-[14px]">{verifyingRx.doctorName}</div>
                    <div className="text-gray-500 text-[12px]">{verifyingRx.department}</div>
                 </div>
                 <div className="w-1/3">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Source Data</div>
                    <div className="font-bold text-gray-900 text-[14px]">{verifyingRx.sourceType}</div>
                    <div className="text-gray-500 text-[12px]">{new Date(verifyingRx.date).toLocaleDateString()}</div>
                 </div>
               </div>

               {/* Patient Safety Panel (Allergies) */}
               <div className="bg-[#FFF1F2] border border-[#FECDD3] p-4 rounded-none">
                 <div className="flex items-center gap-2 mb-2">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-[#E11D48]"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                   <span className="text-[12px] font-extrabold text-[#9F1239] uppercase tracking-wider">Patient Safety &amp; Allergy Alerts</span>
                 </div>
                 <div className="text-[13px] text-[#BE123C] font-semibold">
                   No Known Drug Allergies (NKDA) found in EMR for this patient.
                 </div>
               </div>

               <div>
                 <h3 className="text-[14px] font-extrabold text-gray-900 mb-4 border-b border-gray-100 pb-2">OCR Extracted Medicines</h3>
                 <div className="space-y-4">
                    {verifyingRx.items.map((item, index) => {
                       // Find a default match simulation
                       const isMatched = !!item.medicineId;
                       
                       return (
                         <div key={item.id} className="border border-gray-200 rounded-none bg-white p-4">
                            <div className="flex items-center justify-between mb-3">
                               <div>
                                 <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wider mr-2">OCR Text</span>
                                 <span className="font-mono font-bold text-[14px] text-gray-900">{item.medicineName}</span>
                               </div>
                               <div className="text-[12px] text-gray-500 font-bold">Qty: {item.quantity} ({item.dosage})</div>
                            </div>
                            
                            <div className="bg-gray-50 p-3 border border-gray-200">
                               <label className="block text-[12px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Map to Pharmacy Database (Substitution Allowed: {item.substitutionAllowed ? "Yes" : "No"})</label>
                               <select 
                                 required
                                 value={item.medicineId || ""} 
                                 onChange={(e) => {
                                    const newItems = [...verifyingRx.items];
                                    newItems[index].medicineId = e.target.value;
                                    setVerifyingRx({...verifyingRx, items: newItems});
                                 }}
                                 className="w-full border-2 border-gray-300 px-3 py-2 text-[13px] font-bold text-gray-900 focus:outline-none focus:border-indigo-500 bg-white cursor-pointer"
                               >
                                 <option value="" disabled>-- Select Verified Medicine Match --</option>
                                 {medicines.map(m => {
                                    // Simulated logic for UI display: show available stock to help pharmacist pick generic substitute
                                    const stock = batches.filter(b => b.medicineId === m.id).reduce((sum, b) => sum + b.availableQuantity, 0);
                                    return (
                                       <option key={m.id} value={m.id}>
                                         {m.brandName} ({m.genericName}) — Stock: {stock} units
                                       </option>
                                    );
                                 })}
                               </select>
                               {item.medicineId && (
                                  <div className="mt-2 flex items-center gap-1.5 text-green-700 text-[11px] font-bold uppercase tracking-wider">
                                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Match Confirmed
                                  </div>
                               )}
                            </div>
                         </div>
                       );
                    })}
                 </div>
               </div>

               <div>
                 <label className="block text-[12px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Pharmacist Notes</label>
                 <textarea value={verifyingRx.verificationNotes || ""} onChange={e => setVerifyingRx({...verifyingRx, verificationNotes: e.target.value})} className="w-full border-2 border-gray-200 px-3 py-2 text-[13px] focus:outline-none focus:border-indigo-500" placeholder="Enter notes regarding generic substitutions or adjustments..."></textarea>
               </div>
            </form>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowRxVerificationModal(false)} type="button" className="px-5 py-2 text-[13px] font-bold text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
              <button form="rxVerifyForm" type="submit" className="px-5 py-2 text-[13px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-2">
                 Verify & Send to Dispensing Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
