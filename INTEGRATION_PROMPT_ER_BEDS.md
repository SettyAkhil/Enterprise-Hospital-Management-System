# Integration Prompt for Emergency Room & Bed Management Modules

Copy and paste the prompt below into your AI assistant or follow the manual step-by-step instructions to integrate the latest Emergency Room and Bed Management modules.

---

```markdown
## Task: Integrate Emergency Room & Bed Management Modules

I have extracted the `emergency-bed-management-latest.zip` archive into the project root. Please ensure all files are in place and wired correctly into the application:

### 1. File Placement Verification
Ensure the following files exist in `src/`:
- `src/pages/ErPage.tsx`
- `src/pages/BedManagementPage.tsx`
- `src/styles/er-bed.css`
- `src/services/erDb.ts`
- `src/lib/api.ts`
- `src/lib/constants.ts`
- `src/lib/cn.ts`
- `src/lib/format.ts`
- `src/components/PrescriptionUploadModal.tsx`
- `src/components/StatCard.tsx`
- `src/components/ui/` (Button.tsx, Input.tsx, Label.tsx, Modal.tsx, Select.tsx, Table.tsx, Tabs.tsx, Textarea.tsx, index.ts)
- `src/types.ts`

### 2. Import Stylesheet in `src/index.css`
Add `@import './styles/er-bed.css';` right after `@import 'tailwindcss';`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
@import 'tailwindcss';
@import './styles/er-bed.css';
```

### 3. Wire Components in `src/App.tsx`
1. Import the pages at top of `src/App.tsx`:
```tsx
import ErPage from "./pages/ErPage";
import BedManagementPage from "./pages/BedManagementPage";
```

2. Add `"emergency"` and `"beds"` to `type Module` union:
```tsx
type Module =
  | "dashboard" | "patients" | "appointments" | "emergency"
  ...
  | "beds";
```

3. Ensure Navigation item in `NAV`:
```tsx
  {
    key: "emergency", label: "Emergency", Icon: Icon.Emergency, badge: 8,
    children: [
      { key: "emergency", label: "ED Track Board" },
      { key: "triage", label: "Triage" },
    ]
  },
  {
    key: "inpatient", label: "Inpatient", Icon: Icon.Bed,
    children: [
      { key: "inpatient", label: "Bed Board" },
      { key: "beds", label: "Bed Management" },
      { key: "admissions", label: "Admissions" },
      { key: "readmission", label: "Readmission" },
      { key: "icu", label: "ICU" },
      { key: "discharge", label: "Discharge" },
    ]
  },
```

4. Render modules inside `<main>`:
```tsx
  {module === "emergency" && <ErPage setNotice={setNotice} />}
  {module === "inpatient" && <Inpatient />}
  {module === "beds" && <BedManagementPage setNotice={setNotice} />}
```

### 4. Dependencies
Ensure `react-icons` is installed (`npm install react-icons`).

### 5. Build and Verify
Run `npm run build` to confirm 0 compilation errors and launch with `npm run dev`.
```

---

## 🛠️ Step-by-Step Manual Integration Guide

1. **Extract Zip**: Extract `emergency-bed-management-latest.zip` into your project root folder so that the `src/` files merge with your existing `src/` folder.
2. **Include CSS**: Open [`src/index.css`](src/index.css) and add `@import './styles/er-bed.css';`.
3. **Connect in App.tsx**:
   - Add imports for `ErPage` and `BedManagementPage`.
   - Add `{module === "emergency" && <ErPage setNotice={setNotice} />}`.
   - Add `{module === "beds" && <BedManagementPage setNotice={setNotice} />}` under Inpatient.
4. **Run Server**:
   ```bash
   npm run dev
   ```
5. **Open Portal**: Navigate to `http://localhost:8443/` and click **Emergency ➔ ED Track Board** or **Inpatient ➔ Bed Management**.
