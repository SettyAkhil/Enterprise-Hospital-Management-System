import "./index.css";
import { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import Layout from "./components/Layout";
import GlobalSearch from "./components/GlobalSearch";
import Dashboard from "./pages/Dashboard";
import Dispensing from "./pages/Dispensing";
import PrescriptionQueue from "./pages/PrescriptionQueue";
import MedicineMaster from "./pages/MedicineMaster";
import Suppliers from "./pages/Suppliers";
import PurchaseOrders from "./pages/PurchaseOrders";
import InvoiceOCR from "./pages/InvoiceOCR";
import InventoryLedger from "./pages/InventoryLedger";
import ExpiryLowStock from "./pages/ExpiryLowStock";
import SalesReturns from "./pages/SalesReturns";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import AuditLog from "./pages/AuditLog";
import SupplierReturns from "./pages/SupplierReturns";

const pages: Record<string, React.ComponentType<{ onNavigate: (page: string) => void }>> = {
  dashboard: Dashboard,
  dispensing: Dispensing,
  prescriptions: PrescriptionQueue,
  medicines: MedicineMaster,
  suppliers: Suppliers,
  "purchase-orders": PurchaseOrders,
  grn: InvoiceOCR,
  "inventory-ledger": InventoryLedger,
  "expiry-low-stock": ExpiryLowStock,
  "sales-returns": SalesReturns,
  "supplier-returns": SupplierReturns,
  reports: Reports,
  notifications: Notifications,
  "audit-log": AuditLog,
};

interface PharmacyAppProps {
  /** Page to show, derived from the HMS sidebar selection. */
  page: string;
  /** Reports in-page navigation back to the host so the sidebar stays in sync. */
  onNavigate: (page: string) => void;
}

export default function PharmacyApp({ page, onNavigate }: PharmacyAppProps) {
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    document.addEventListener("keydown", handler);

    const handleToast = (e: any) => {
      const notif = e.detail;
      if (notif.type === 'critical') {
        toast.error(notif.message, { duration: 5000, style: { minWidth: '300px' } });
      } else if (notif.type === 'warning') {
        toast(notif.message, { icon: '⚠️', duration: 4000 });
      } else {
        toast.success(notif.message, { duration: 3000 });
      }
    };
    window.addEventListener("hospai_pharmacy_toast", handleToast);

    return () => {
      document.removeEventListener("keydown", handler);
      window.removeEventListener("hospai_pharmacy_toast", handleToast);
    };
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
      <Toaster position="top-right" />
    </>
  );
}
