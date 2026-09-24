import PharmacyApp from "./PharmacyModule/PharmacyApp"

// The pharmacy screens are reached from the main HMS sidebar, which lists every
// one of them as a child of "Pharmacy" (see the NAV array in App.tsx). This maps
// those module keys onto the module's own page ids.
//
// Before this existed the module ignored `activeModule` entirely and always
// opened its dashboard behind a second, nested sidebar -- so picking
// "Stock Transfers" in the main nav highlighted it there and then showed the
// dashboard, and the real navigation lived in a duplicate sidebar inside it.
const MODULE_TO_PAGE: Record<string, string> = {
  pharmacy: "dashboard",
  pharmacy_dispensing: "dispensing",
  pharmacy_rx: "prescriptions",
  pharmacy_ocr: "ocr",
  pharmacy_returns: "sales-returns",
  pharmacy_supplier_returns: "supplier-returns",
  pharmacy_medicine: "medicines",
  pharmacy_category: "categories",
  pharmacy_suppliers: "suppliers",
  pharmacy_po: "purchase-orders",
  pharmacy_grn: "grn",
  pharmacy_ledger: "inventory-ledger",
  pharmacy_expiry: "expiry-low-stock",
  pharmacy_analytics: "reports",
  pharmacy_notifications: "notifications",
  pharmacy_users: "users",
  pharmacy_audit: "audit-log",
  pharmacy_settings: "settings",
}

const PAGE_TO_MODULE: Record<string, string> = Object.fromEntries(
  Object.entries(MODULE_TO_PAGE).map(([module, page]) => [page, module]),
)

interface PharmacyProps {
  activeModule?: string
  onNavigate?: (module: string) => void
}

export default function Pharmacy({ activeModule, onNavigate }: PharmacyProps) {
  const page = MODULE_TO_PAGE[activeModule ?? "pharmacy"] ?? "dashboard"

  // In-page navigation (a dashboard tile, a "View all" link, the Ctrl+K search)
  // is reported back as a module key, so the main sidebar highlight follows
  // along instead of drifting out of sync with what is on screen.
  const handleNavigate = (nextPage: string) => {
    const nextModule = PAGE_TO_MODULE[nextPage]
    if (nextModule && onNavigate) onNavigate(nextModule)
  }

  return (
    <div className="w-full h-full overflow-hidden bg-[#F4F6F9]">
      <style>{`
        /* Pharmacy Sidebar Theme Overrides */
        aside { background-color: #064E3B !important; border-color: #022C22 !important; }
        .nav-item.active { background-color: #0F766E !important; color: #FFFFFF !important; }
        .nav-item.active > svg { color: #5EEAD4 !important; }
        .nav-item.sub.active { background-color: rgba(15,118,110,0.3) !important; color: #5EEAD4 !important; border-left: 2px solid #5EEAD4 !important; padding-left: 34px !important; }
        .nav-item:hover { background-color: rgba(255,255,255,0.08) !important; }
        .badge { background-color: #022C22 !important; color: #34D399 !important; }
        
        /* Overriding collapsed state active background */
        aside .bg-\\[\\#1B4FD8\\] { background-color: #0F766E !important; box-shadow: 0 4px 6px -1px rgba(15, 118, 110, 0.5) !important; ring-color: rgba(20, 184, 166, 0.4) !important; }
      `}</style>
      <PharmacyApp page={page} onNavigate={handleNavigate} />
    </div>
  )
}
