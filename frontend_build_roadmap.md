# FitnessWynk Web SaaS - Frontend Build Roadmap

> **Target AI**: This document is an actionable roadmap strictly for frontend development. It serves as the master guide for any AI agent (like Gemini) to systematically build the Next.js React application.

---

## 0. Project Context & Rules
- **Stack**: Next.js 14 (App Router) + TypeScript. Root project is at `E:\other\Guddy\GuddySAS`.
- **Styling**: Vanilla CSS + CSS Modules. **DO NOT** use Tailwind, MUI, Shadcn, or any component library.
- **State**: React Context API + `useReducer` for all global state (no external state libs for v1).
- **Icons**: `lucide-react`. **Fonts**: Outfit (headings) + Inter (body) via Google Fonts.
- **Design Tokens**: All CSS variables in `src/app/globals.css`. Use them, never hardcode values.
- **Client Directive**: Every component with `onClick`, `useState`, `useEffect`, or any browser hook MUST have `'use client'` as its very first line.
- **Admin PIN**: `913291` — gates all delete and edit confirmations.
- **Backend**: None. All data is mock data in React Context.

---

## ✅ COMPLETED

### Phase 1: Foundation
- [x] `src/app/globals.css` — All CSS tokens (colors, spacing, typography, radius, shadows).
- [x] `src/types/index.ts` — All TS interfaces: `Member`, `Payment`, `Attendance`, `Expense`, `Enquiry`, `Announcement`, `GymSettings`.
- [x] `src/data/mockData.ts` — Seed data (5 members, 2 payments, 2 expenses, 2 enquiries, settings).
- [x] `src/context/AppContext.tsx` — Full `useReducer` AppContext with all `AppAction` types.
- [x] `src/lib/actions.ts` — `addMember`, `processPaymentAndRenewal` helpers.
- [x] `src/lib/dateUtils.ts` — `isExpired`, `daysRemaining`, `isExpiringSoon`, `calcEndDate`, `getTodayMidnight`.

### Phase 2: UI Kit (Components)
- [x] `Button.tsx` — Variants: `primary`, `dark`, `ghost`, `danger`, `whatsapp`.
- [x] `Badge.tsx` — Statuses: `active`, `expired`, `warning`, `converted`, `due`.
- [x] `StatCard.tsx` — Hover-lift animation, icon support, dynamic `bgColor`.
- [x] `Input.tsx` — Floating label, error state.
- [x] `Select.tsx` — Custom chevron icon, floating label.
- [x] `FilterChip.tsx` — Selected/unselected toggle.
- [x] `Modal.tsx` — Overlay with blur, slide-up animation, header/body/footer slots.

### Phase 3: Shell & Navigation
- [x] `Sidebar.tsx` — 260px dark sidebar, active-route highlight, responsive (icon-only tablet, drawer mobile).
- [x] `TopBar.tsx` — Sticky header with hamburger (mobile), page title, action slot.
- [x] `AppShell.tsx` — Wires Sidebar + TopBar, auto-derives page title from route.
- [x] `layout.tsx` — Root layout wrapping `AppProvider` + `AppShell`.

### Phase 4: Screens (Partial)
- [x] `src/app/page.tsx` — **Dashboard**: Stats grid, Quick Actions, Alert Banner, Recent Payments, Action Required list.
- [x] `src/app/members/page.tsx` — **Members Directory**: Search, filter chips, Plan Stats row, responsive table/cards.
- [x] `src/app/members/[id]/page.tsx` — **Member Detail**: Profile panel, Subscription Details, Payment History tab (Attendance tab stub).

---

## 🔴 GAPS vs Spec — Action Items

### Missing Modals (referenced in screens but not yet built)
| Modal | Used In | Spec Section |
|---|---|---|
| `AddMemberModal` | Dashboard, Members | Spec P1 §8.6 |
| `EditMemberModal` | Member Detail | Spec P1 §9 |
| `ConfirmPinModal` | Delete Member, Edit Member | Spec P1 §9 (PIN: `913291`) |
| `RenewMemberModal` | Member Detail, Renewals | Spec P2 §11.4 |
| `LogPaymentModal` | Dashboard, Finances | Spec P2 §12.2 |
| `PaymentDetailModal` | Member Detail, Finances | Spec P2 §12.2 |
| `AddExpenseModal` | Finances | Spec P2 §12.3 |
| `AddEnquiryModal` | Enquiries | Spec P2 §13.4 |

### Missing Page Routes
| Page | Route | Spec Section |
|---|---|---|
| Attendance | `/attendance` | Spec P2 §10 |
| Renewals | `/renewals` | Spec P2 §11 |
| Finances | `/finances` | Spec P2 §12 |
| Enquiries | `/enquiries` | Spec P2 §13 |
| Marketing | `/marketing` | Spec P2 §14 |
| Settings | `/settings` | Spec P2 §15 |

### Missing Utilities
- [ ] `src/lib/whatsapp.ts` — `buildWhatsAppLink(phone, message)` and `buildCallLink(phone)` helpers.

### Mock Data Gaps (vs spec requirement)
- [ ] Expand to 10 members (currently only 5): need more with varied plans, batches, dues, expiry states.
- [ ] Expand to 10 payments across 2 months (currently 2).
- [ ] Expand to 5 expenses (currently 2).
- [ ] Add 3 enquiries (1 converted) — currently 2.

---

## 🔵 PHASE 5: Missing Modals & Utilities

**Goal**: Wire up all the placeholder `{/* TODO */}` buttons in existing screens with real modals.

### Step 1 — `src/lib/whatsapp.ts`
```ts
export const buildWhatsAppLink = (phone, message) => `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
export const buildCallLink = (phone) => `tel:+91${phone}`;
```

### Step 2 — `src/components/modals/ConfirmPinModal.tsx`
- Input field for PIN. On submit: compare against `"913291"`. Show error if wrong.
- Props: `isOpen`, `onClose`, `onConfirm`, `title`, `description`.

### Step 3 — `src/components/modals/AddMemberModal.tsx` (Spec P1 §8.6)
- **Section 1**: Name (required), Phone (10 digits, required).
- **Section 2**: Plan (Select), Duration (Select), Batch (Select), Start Date (date input), End Date (auto-calculated read-only using `calcEndDate`).
- **Section 3**: Payment Status chips — `Fully Paid | Partial | Unpaid`. Conditional amount fields based on selection.
- **Section 4**: Notes (textarea).
- On submit: calls `addMember()` action.

### Step 4 — `src/components/modals/EditMemberModal.tsx` (Spec P1 §9)
- Fields: Name, Phone, Plan (dropdown), Batch (dropdown), Notes, Start Date, Expiry Date, Mark Fully Paid checkbox (if dueAmount > 0).
- Save gated by `ConfirmPinModal` (PIN: `913291`).
- On confirm: dispatches `UPDATE_MEMBER`.

### Step 5 — `src/components/modals/RenewMemberModal.tsx` (Spec P2 §11.4)
- Fields: `Amount (₹)`, `Cash / UPI` toggle chips, `New Start Date`, `New End Date` (auto-calculated).
- On confirm: calls `processPaymentAndRenewal()` action.

### Step 6 — `src/components/modals/LogPaymentModal.tsx` (Spec P2 §12.2)
- Member search (live-search dropdown, max 5 results). Selecting auto-fills Plan + Batch.
- Fields: Amount (₹), Cash/UPI chips, Plan (Select), Batch (Select), Duration (Select), Start Date, End Date (read-only auto-calc), Notes.
- On confirm: calls `processPaymentAndRenewal()`.

### Step 7 — `src/components/modals/PaymentDetailModal.tsx` (Spec P2 §12.2)
- Read-only view: Member, Amount, Mode, Date, Plan, Batch, Notes.

### Step 8 — `src/components/modals/AddExpenseModal.tsx` (Spec P2 §12.3)
- Fields: Title (required), Amount (required), Notes (optional). Date defaults to today.

### Step 9 — `src/components/modals/AddEnquiryModal.tsx` (Spec P2 §13.4)
- Fields: Name (required), Phone (10 digits, required), Interested Plan (Select), Notes.

### Step 10 — Wire modals into existing screens
- Dashboard `Add Member` → `AddMemberModal`.
- Dashboard `Log Payment` → `LogPaymentModal`.
- Member Detail `Edit` → `EditMemberModal` + `ConfirmPinModal`.
- Member Detail `Delete` → `ConfirmPinModal` → dispatch `DELETE_MEMBER`.
- Member Detail `Renew` → `RenewMemberModal`.

---

## 🔵 PHASE 6: Remaining Page Screens

### Attendance (`src/app/attendance/page.tsx`) — Spec P2 §10
- Header: "Today's Attendance", today's date subtitle.
- Summary Counter: "Present: X / Y Active Members" + Yellow progress bar.
- Member list (A-Z, active only): Full-row click/checkbox toggle. Checked row = green bg.
- Empty state if no active members.
- Toggle action: dispatches `ADD_ATTENDANCE` or `REMOVE_ATTENDANCE`.

### Renewals (`src/app/renewals/page.tsx`) — Spec P2 §11
- Filter: members where `expiryDate < now` OR `expiryDate < now + 7 days`, sorted earliest first.
- Header stats: two cards — Expired count (red) and Expiring count (orange).
- Member cards: Red/orange color-coded left-border. Each shows name, expiry status, plan/batch.
- Per-card actions: `WhatsApp` (pre-filled renewal template), `Quick Renew` (opens RenewMemberModal).

### Finances (`src/app/finances/page.tsx`) — Spec P2 §12
- **Payments Tab**:
  - Stats Row: This Month (yellow bg), Last Month, Total All Time.
  - Search by member name (debounced). Month dropdown filter. Total chip when filtered.
  - Payment list rows. Click row → `PaymentDetailModal`.
  - "Log Payment" sticky button.
- **Expenses Tab**:
  - Stats Row: Total All Time, This Month (green bg), Last Month (orange bg).
  - Search by title/notes. Expense cards with inline confirm-delete ("Sure? Tap again").
  - "Add Expense" button → `AddExpenseModal`.

### Enquiries (`src/app/enquiries/page.tsx`) — Spec P2 §13
- Header: "Enquiries & Leads", Add Enquiry button.
- Cards per enquiry: Checkbox for "Mark as Converted" (green bg when converted), Name, Phone, Plan of interest, Notes, timestamp, Call + WhatsApp buttons.
- WhatsApp template: `"Hello {name}, thank you for your enquiry at FitnessWynk! How can we help you join? - FitnessWynk"`.
- Empty state if no enquiries.
- Delete: inline confirm or `ConfirmPinModal`.

### Marketing (`src/app/marketing/page.tsx`) — Spec P2 §14
- Audience chips: `All Active Members` | `Expired Members`.
- Message textarea (pre-loaded templates based on audience).
- Info banner: "We cannot auto-send. This copies text and opens WhatsApp."
- Action: `navigator.clipboard.writeText(message)` + toast "Message copied! ✓" + `window.open("https://wa.me", "_blank")`.

### Settings (`src/app/settings/page.tsx`) — Spec P2 §15
- **Gym Profile Card**: Gym Name input, UPI ID input, QR Code file upload with 250×250 preview. Save button → `UPDATE_SETTINGS`.
- **Manage Plans Card**: `[New Plan input] [Add]` row. List of current plans with `× Remove` buttons.
- **Manage Batches Card**: Same pattern. Example: `"6-7 AM"`, `"5-6 PM"`.
- **Manage Durations Card**: Same pattern. Example: `"1 Month"`, `"1 Year"`.
- **Danger Zone Card**: "Reset to Default" button (danger outlined) restoring hardcoded defaults.
- **Version Footer**: `"FitnessWynk Admin v1.0.0"` centered, disabled color.

---

## 🔵 PHASE 7: Mock Data Expansion & Business Logic Polish

### Expand Mock Data
- Grow `mockMembers` to 10 with varied states: Active, Expired, Expiring (2 days), Expiring (6 days), with dues.
- Grow `mockPayments` to 10 across two calendar months.
- Grow `mockExpenses` to 5 entries.
- Ensure `mockEnquiries` has 3 entries (1 converted).

### Business Logic Fixes
- Verify `calcEndDate` handles all 5 duration formats: `"45 Days"`, `"3 Months"`, `"6 Months"`, `"1 Year"`, `"2 Weeks"`.
- Verify `isSameMonth` is correctly used for finances stats.
- Ensure `processPaymentAndRenewal` also updates `dueAmount` to 0 on full payment.

---

## 🔵 PHASE 8: Responsiveness & Polish

- Verify breakpoints on all pages: mobile (<640px), tablet (640–1024px), desktop (>1024px).
- Add skeleton loader state for initial page loads.
- Add Toast notification system for success messages (copy, save, add actions).
- Verify keyboard navigation on all modals (Escape to close, Tab order).

---

## Instructions for AI Agent Execution

When instructed to build:
1. Always reference the Phase and Step number.
2. Build pages and modals together when referenced in the same screen.
3. Every interactive component file must start with `'use client'`.
4. Never hardcode colors — always use CSS variables.
5. Keep all logic entirely client-side using the `AppContext` architecture.
