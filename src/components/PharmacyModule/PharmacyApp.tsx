import "./index.css";
import { useState, useEffect } from "react";
import Layout from "./components/Layout";
import GlobalSearch from "./components/GlobalSearch";
import Dashboard from "./pages/Dashboard";
import Dispensing from "./pages/Dispensing";
import PrescriptionQueue from "./pages/PrescriptionQueue";
import OCRVerification from "./pages/OCRVerification";
import MedicineMaster from "./pages/MedicineMaster";
import CategoryMaster from "./pages/CategoryMaster";
import Suppliers from "./pages/Suppliers";
import PurchaseOrders from "./pages/PurchaseOrders";
import GRN from "./pages/GRN";
import InventoryLedger from "./pages/InventoryLedger";
import StockTransfers from "./pages/StockTransfers";
import ExpiryLowStock from "./pages/ExpiryLowStock";
import SalesReturns from "./pages/SalesReturns";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import UserManagement from "./pages/UserManagement";
import AuditLog from "./pages/AuditLog";
import Settings from "./pages/Settings";

const pages: Record<string, React.ComponentType<{ onNavigate: (page: string) => void }>> = {
  dashboard: Dashboard,
  dispensing: Dispensing,
  prescriptions: PrescriptionQueue,
  ocr: OCRVerification,
  medicines: MedicineMaster,
  categories: CategoryMaster,
  suppliers: Suppliers,
  "purchase-orders": PurchaseOrders,
  grn: GRN,
  "inventory-ledger": InventoryLedger,
  "stock-transfers": StockTransfers,
  "expiry-low-stock": ExpiryLowStock,
  "sales-returns": SalesReturns,
  reports: Reports,
  notifications: Notifications,
  users: UserManagement,
  "audit-log": AuditLog,
  settings: Settings,
};

interface PharmacyAppProps {
  /** Page to show, derived from the HMS sidebar selection. */
  page: string;
  /** Reports in-page navigation back to the host so the sidebar stays in sync. */
  onNavigate: (page: string) => void;
}

export default function PharmacyApp({ page, onNavigate }: PharmacyAppProps) {
  const [showSearch, setShowSearch] = useState(false);

  // There is no separate pharmacy sign-in: the user is already authenticated by
  // the HMS shell, and module access is decided by RoleDatabase. The module's own
  // Login screen and its one-time `hospai_pharm_*` wipe are both gone -- that wipe
  // deleted the prescription queue the doctor portal dispatches into, so a
  // prescription sent from a consultation could vanish before the pharmacist
  // ever saw it.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const PageComponent = pages[page] ?? Dashboard;

  return (
    <>
      <Layout>
        <PageComponent onNavigate={onNavigate} />
      </Layout>
      {showSearch && (
        <GlobalSearch
          onClose={() => setShowSearch(false)}
          onNavigate={next => { onNavigate(next); setShowSearch(false); }}
        />
      )}
    </>
  );
}
