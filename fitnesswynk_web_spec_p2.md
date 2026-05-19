# FitnessWynk Web SaaS — Frontend Specification (Part 2 of 2)
> Continues from Part 1. Covers screens 4–8 and the full state management architecture.

---

## 10. SCREEN — ATTENDANCE (`/attendance`)

### 10.1 Header
- Title: "Today's Attendance"
- Subtitle: Today's date formatted as `"Monday, 18 May 2026"`

### 10.2 Summary Counter
```
┌──────────────────────────────────────────┐
│  Present: 8 / 24 Active Members          │
│  [=======>          ] (progress bar)     │
└──────────────────────────────────────────┘
```
- Progress bar: filled portion `background: var(--color-primary)`, track `background: var(--color-surface-variant)`, `height: 8px`, `border-radius: var(--radius-full)`.
- The counter updates **instantly** on toggle (optimistic UI via React Context).

### 10.3 Data Logic
```ts
const todayMidnight = new Date().setHours(0, 0, 0, 0);
const activeMembers  = members
  .filter(m => m.expiryDate > Date.now())
  .sort((a, b) => a.name.localeCompare(b.name)); // A-Z sort
const todayAttendance = attendance.filter(a => a.date === todayMidnight);
const isPresent = (memberId: string) => todayAttendance.some(a => a.memberId === memberId);
```

### 10.4 Member List
Each row (full-width, clickable):
```
┌─────────────────────────────────────────────────┐
│  [Name bold]                    [ ] Checkbox    │
│  [Plan · Batch, gray small]                     │
└─────────────────────────────────────────────────┘
```
- Row click OR checkbox click = toggle presence.
- If checked: row background `var(--color-active-bg)`, checkbox filled yellow.
- Transition: `background-color var(--transition-fast)`.
- Divider between rows: `1px solid var(--color-border)`.

### 10.5 Toggle Action (replaces `markAttendance` ViewModel action)
```ts
function markAttendance(memberId: string, memberName: string, isPresent: boolean) {
  if (isPresent) {
    dispatch({ type: 'ADD_ATTENDANCE', payload: {
      id: uuid(), memberId, memberName, date: todayMidnight, isPresent: true
    }});
  } else {
    dispatch({ type: 'REMOVE_ATTENDANCE', payload: { memberId, date: todayMidnight }});
  }
}
```

### 10.6 Empty State (no active members)
```
[CheckSquare icon, 64px, disabled color]
"No active members"
"All members have expired plans."
```

---

## 11. SCREEN — RENEWALS (`/renewals`)

### 11.1 Filter Logic
```ts
const expiringMembers = members
  .filter(m => {
    const now = Date.now();
    const sevenDays = 7 * 86_400_000;
    return m.expiryDate < now || (m.expiryDate - now < sevenDays);
  })
  .sort((a, b) => a.expiryDate - b.expiryDate); // Earliest first
```

### 11.2 Header Stats
```
┌──────────────┬──────────────┐
│  Expired     │  Expiring    │
│  [count, red]│  [count, org]│
└──────────────┴──────────────┘
```

### 11.3 Member Cards (each expiring/expired member)
```
┌────────────────────────────────────────────────────────┐
│  [Name bold]                                           │
│  [Expired 5 days ago  OR  Expires in 3 days] [Badge]   │
│  [Plan · Batch]                                        │
│                                                        │
│  [WhatsApp]  [Quick Renew]                             │
└────────────────────────────────────────────────────────┘
```
- Expired card: `background: var(--color-expired-bg)`, left border `4px solid var(--color-error)`.
- Expiring card: `background: var(--color-warning-bg)`, left border `4px solid var(--color-warning-text)`.
- `WhatsApp` button: `variant="whatsapp"`, icon `MessageCircle`, generates pre-filled `wa.me` link.

WhatsApp reminder template:
```
"Hi {name}! 👋 Your gym membership expires in {N} days. 
Let me know if you want to renew via UPI or Cash. Thanks! - FitnessWynk"
```
For expired:
```
"Hi {name}! 👋 Your gym membership expired {N} days ago. 
Please renew to continue your fitness journey! - FitnessWynk"
```
- `Quick Renew` button: `variant="primary"`, small. Opens `<RenewMemberModal />`.

### 11.4 Renew Member Modal (mirrors RenewMemberDialog.kt)
Fields:
- `Amount Collecting (₹)` (number input, required)
- `Cash / UPI` toggle chips
- `New Start Date` (date picker, default today)
- `New End Date` (date picker, default startDate + member's durationLabel)
- On confirm: calls `renewMember()` which updates member expiryDate + logs a payment.

---

## 12. SCREEN — FINANCES (`/finances`)

### 12.1 Tab Structure
Two tabs at top: `Payments` | `Expenses`

---

### 12.2 PAYMENTS TAB

**Stats Row**:
```
┌──────────────┬──────────────┬──────────────────────┐
│  This Month  │  Last Month  │  Total (All Time)     │
│  ₹{amount}   │  ₹{amount}   │  ₹{amount}            │
└──────────────┴──────────────┴──────────────────────┘
```
This Month: `background: var(--color-primary-light)`.
Last Month: `background: var(--color-surface-variant)`.
Total: `background: var(--color-surface-variant)`.

**Month filter logic**:
```ts
const currentMonthTotal = payments
  .filter(p => isSameMonth(new Date(p.timestamp), new Date()))
  .reduce((s, p) => s + p.amount, 0);
```

**Search + Filter**:
- `Search by Member` text input (debounced, filters `payment.memberName`).
- `Filter by Month` dropdown: dynamically built from distinct months in payment list, plus "All Time". Format: `"May 2026"`.
- If filter active AND results exist: show `"Total: ₹{filteredSum}"` chip next to filter.

**Payment List**:
```
[Member Name bold]                 [₹Amount bold, primary color]
[dd MMM, hh:mm a]  [Cash / UPI]
```
Click row → opens `<PaymentDetailModal />`:
```
Member    [name]
Amount    ₹[amount]
Mode      [Cash/UPI]
Date      [dd MMM yyyy, hh:mm a]
Plan      [planName]  (if not blank)
Batch     [batch]     (if not blank)
Notes     [notes]     (if not blank)
```

**"Log Payment" FAB** (center-bottom):
`<Button variant="primary" icon="Plus">Log Payment</Button>`
→ Opens `<LogPaymentModal />`

**Log Payment Modal** (mirrors LogPaymentDialog.kt exactly):
1. `Search Member Name` (text input with live-search dropdown showing matching members, max 5 results).
   - Selecting a member auto-fills Plan and Batch.
   - If typing a new name, it can be manual/non-member entry.
2. `Amount (₹)` (number input, required).
3. `Cash / UPI` toggle chips.
4. Divider: "Membership Details (Will Update)"
5. `Plan` (Select dropdown from settings.availablePlans)
6. `Batch` (Select dropdown from settings.batches)
7. `Duration` (Select dropdown from settings.durations)
8. `Start Date` (date picker, clickable), `End Date` (auto-calculated, read-only)
9. `Notes` (textarea, optional)
10. On confirm: calls `processPaymentAndRenewal()` — logs payment AND updates the linked member's expiry if memberId exists.

---

### 12.3 EXPENSES TAB

**Stats Row**:
```
┌──────────────┬──────────────┬──────────────────────┐
│ Total (All)  │  This Month  │  Last Month          │
│ ₹{X}k        │  ₹{X}k       │  ₹{X}k               │
└──────────────┴──────────────┴──────────────────────┘
```
All Time: `background: var(--color-surface-variant)`.
This Month: `background: var(--color-active-bg)`.
Last Month: `background: var(--color-warning-bg)`.

**Search**: text input, filters on `expense.title` and `expense.notes`.

**Expense List**:
```
[Title bold]                   [₹Amount, red bold]
[dd MMM, yyyy]  [notes truncated to 1 line]   [🗑 Delete]
```
Card style: `background: white`, `box-shadow: var(--shadow-sm)`.
Delete: shows inline confirm prompt (no separate modal — just change button to "Sure? Tap again" pattern).

**"Add Expense" FAB** (center-bottom):
→ Opens `<AddExpenseModal />`:
- `Title` (text input, e.g. "Rent", required)
- `Amount` (number input, digits only, required)
- `Notes` (text input, optional)
- Date defaults to today (non-editable for v1).

---

## 13. SCREEN — ENQUIRIES (`/enquiries`)

### 13.1 Header
- Title: "Enquiries & Leads"
- Right: `<Button variant="primary" icon="UserPlus">Add Enquiry</Button>`

### 13.2 Enquiry Cards
```
┌────────────────────────────────────────────────────────┐
│  [ ] (checkbox)  [Name bold]            [🗑 Delete]    │
│                  [Phone, gray]                         │
│                  [CONVERTED ✓ badge — if converted]    │
│                                                        │
│  Interested in: [planOfInterest, primary color]        │
│  Notes: [notes text, dark gray]                        │
│  [dd MMM, hh:mm a — light gray small]                  │
│                                                        │
│  [📞 Call]   [WhatsApp]                                │
└────────────────────────────────────────────────────────┘
```
- Converted card: `background: var(--color-active-bg)`.
- Checkbox toggles `isConverted`. Checked state = green checkmark, label "Mark as Converted".
- `Call` → `tel:` link. `WhatsApp` → `wa.me` link with template:
  ```
  "Hello {name}, thank you for your enquiry at FitnessWynk! 
  How can we help you join? - FitnessWynk"
  ```

### 13.3 Empty State
```
[PhoneOff icon]
"No enquiries yet"
"Add your first lead using the button above."
```

### 13.4 Add Enquiry Modal
- `Name` (text, required)
- `Phone` (number, 10 digits, required)
- `Interested Plan` (Select from `settings.availablePlans`)
- `Notes` (textarea, optional)

---

## 14. SCREEN — MARKETING (`/marketing`)

### 14.1 Layout
Single column, form-focused.

```
Section: "Broadcast Message"

[To:]  [All Active Members ●] [Expired Members]

[Message textarea — 5 rows, placeholder from TEMPLATES.md]

ℹ️ "We cannot auto-send to multiple people. This will copy 
    the text and open WhatsApp for you to forward to your 
    broadcast list."

[Share Icon  Copy & Open WhatsApp]
```

### 14.2 Recipient Chips
- `All Active Members` → template includes all-active context
- `Expired Members` → different template tone

### 14.3 Message Templates (pre-loaded from TEMPLATES.md)
**Expiry Warning (Auto-populated)**:
```
"Hi [Name]! 👋 Just a heads up that your gym membership expires 
in *3 days*. Let me know if you want to renew via UPI or Cash. 
Thanks! - FitnessWynk"
```
**Payment Confirmation**:
```
"Received ₹[Amount] for [Plan Name]. Thanks [Name]! 
Your membership is active until [Date]. 💪"
```
**General Announcement**:
```
"📢 *Gym Update*: [Message]"
```

### 14.4 Send Action
1. Copy message text to clipboard using `navigator.clipboard.writeText(message)`.
2. Show toast: "Message copied! ✓"
3. Open WhatsApp Web: `window.open("https://wa.me", "_blank")`.

---

## 15. SCREEN — SETTINGS (`/settings`)

### 15.1 Layout
Vertical scroll, grouped cards.

---

**Card: Gym Profile**
- `Payment QR Code` — File upload input, shows 250×250 image preview. On select, shows preview immediately. Label: "Upload QR Screenshot". Change button if already uploaded.
- `Save Profile` button (primary, full-width).

---

**Card: Manage Plans**
Row: `[New Plan Name input] [Add Button]`
List of plans below — each:
```
[Plan Name]    [× Remove]
```
- Background: `var(--color-surface-variant)`, `border-radius: var(--radius-sm)`, `padding: 8px 16px`.

---

**Card: Manage Batches**
Same pattern as Plans.
Example batches: `"6-7 AM"`, `"7-8 AM"`, `"5-6 PM"`.

---

**Card: Manage Durations**
Same pattern. Example durations: `"1 Month"`, `"3 Months"`, `"6 Months"`, `"1 Year"`, `"45 Days"`.

---

**Danger Zone Card**
- `Reset Plans & Batches to Default` button (danger, outlined).
- Restores `settings.availablePlans`, `.batches`, `.durations` to hardcoded defaults.

---

**Version Footer**: `"FitnessWynk Admin v1.0.0"` centered, `color: var(--color-text-disabled)`.

---

## 16. REACT CONTEXT STATE ARCHITECTURE

### 16.1 AppContext Shape
```ts
interface AppState {
  members:      Member[];
  attendance:   Attendance[];
  payments:     Payment[];
  expenses:     Expense[];
  enquiries:    Enquiry[];
  announcements: Announcement[];
  settings:     GymSettings;
}

type AppAction =
  | { type: 'ADD_MEMBER';       payload: Member }
  | { type: 'UPDATE_MEMBER';    payload: Member }
  | { type: 'DELETE_MEMBER';    payload: string }  // id
  | { type: 'ADD_ATTENDANCE';   payload: Attendance }
  | { type: 'REMOVE_ATTENDANCE'; payload: { memberId: string; date: number } }
  | { type: 'ADD_PAYMENT';      payload: Payment }
  | { type: 'ADD_EXPENSE';      payload: Expense }
  | { type: 'DELETE_EXPENSE';   payload: string }
  | { type: 'ADD_ENQUIRY';      payload: Enquiry }
  | { type: 'UPDATE_ENQUIRY';   payload: Enquiry }
  | { type: 'DELETE_ENQUIRY';   payload: string }
  | { type: 'UPDATE_SETTINGS';  payload: Partial<GymSettings> };
```

### 16.2 Provider Setup
```tsx
// app/context/AppContext.tsx
const AppContext = createContext<{ state: AppState; dispatch: Dispatch<AppAction> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
```

### 16.3 Seed / Mock Data (replaces PreviewData.kt + FakeData.kt)
Create `src/data/mockData.ts` with:
- 10 members (mix of Active, Expired, Expiring Soon, with dues)
- 10 payments across 2 months
- 5 expenses
- 3 enquiries (1 converted)
- `settings` with 3 plans, 4 batches, 5 durations

### 16.4 Action Helpers (replaces ViewModel actions)
```ts
// lib/actions.ts
export const addMember = (dispatch: Dispatch, data: AddMemberFormData) => {
  const member: Member = { id: crypto.randomUUID(), ...data };
  dispatch({ type: 'ADD_MEMBER', payload: member });
  if (data.initialPayment > 0) {
    const payment: Payment = { id: crypto.randomUUID(), memberId: member.id, ... };
    dispatch({ type: 'ADD_PAYMENT', payload: payment });
  }
};

export const processPaymentAndRenewal = (dispatch, state, data) => {
  const payment: Payment = { id: crypto.randomUUID(), ...data };
  dispatch({ type: 'ADD_PAYMENT', payload: payment });
  if (data.memberId) {
    const member = state.members.find(m => m.id === data.memberId);
    if (member) {
      dispatch({ type: 'UPDATE_MEMBER', payload: {
        ...member, planName: data.plan, batch: data.batch,
        startDate: data.startDate, expiryDate: data.endDate,
        durationLabel: data.duration
      }});
    }
  }
};
```

---

## 17. FILE STRUCTURE

```
fitnesswynk-web/
├── app/
│   ├── layout.tsx              # Root layout with sidebar + AppProvider
│   ├── page.tsx                # /  → Dashboard
│   ├── members/
│   │   ├── page.tsx            # /members
│   │   └── [id]/page.tsx       # /members/[id]
│   ├── attendance/page.tsx
│   ├── renewals/page.tsx
│   ├── finances/page.tsx
│   ├── enquiries/page.tsx
│   ├── marketing/page.tsx
│   └── settings/page.tsx
├── components/
│   ├── ui/
│   │   ├── StatCard.tsx + .module.css
│   │   ├── Badge.tsx + .module.css
│   │   ├── Button.tsx + .module.css
│   │   ├── Modal.tsx + .module.css
│   │   ├── Input.tsx + .module.css
│   │   ├── Select.tsx + .module.css
│   │   └── FilterChip.tsx + .module.css
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   └── modals/
│       ├── AddMemberModal.tsx
│       ├── EditMemberModal.tsx
│       ├── LogPaymentModal.tsx
│       ├── RenewMemberModal.tsx
│       ├── AddExpenseModal.tsx
│       ├── AddEnquiryModal.tsx
│       ├── PaymentDetailModal.tsx
│       └── ConfirmPinModal.tsx
├── context/
│   └── AppContext.tsx
├── lib/
│   ├── actions.ts              # All state mutation helpers
│   ├── dateUtils.ts            # calcEndDate, formatDate, isExpired, etc.
│   └── whatsapp.ts             # wa.me URL builders
├── data/
│   └── mockData.ts             # Seed data
└── styles/
    └── globals.css             # All design tokens + resets
```

---

## 18. RESPONSIVENESS BREAKPOINTS

| Breakpoint | Sidebar | Layout |
|---|---|---|
| `< 640px` (mobile) | Hidden, hamburger drawer | 1 column, bottom-nav |
| `640–1024px` (tablet) | Icon-only (60px) | 1 col + icon nav |
| `> 1024px` (desktop) | Full (260px) | 2-col where needed |

---

## 19. WHATSAPP LINK PATTERNS

All `wa.me` links follow the pattern:
```ts
export const buildWhatsAppLink = (phone: string, message: string): string =>
  `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
```

The `tel:` link for calling:
```ts
export const buildCallLink = (phone: string): string => `tel:+91${phone}`;
```

Both open in a new tab on desktop (`window.open(url, '_blank')`).

---

## 20. QUICK IMPLEMENTATION ORDER FOR AI AGENTS

1. Create Next.js project with TypeScript.
2. Add `globals.css` with all design tokens from Part 1 §2.
3. Install `lucide-react` and `date-fns`.
4. Create `AppContext.tsx` with `useReducer` and mock data.
5. Build `Sidebar.tsx` + `layout.tsx` shell.
6. Build UI kit: `Button`, `Badge`, `StatCard`, `Input`, `Select`, `Modal`, `FilterChip`.
7. Build `Dashboard` page using the grid layout from §7.
8. Build `Members` page + `AddMemberModal`.
9. Build `MemberDetail` page + `EditMemberModal` + `RenewMemberModal`.
10. Build `Attendance` page.
11. Build `Renewals` page.
12. Build `Finances` page (Payments tab first, then Expenses).
13. Build `Enquiries` page + `AddEnquiryModal`.
14. Build `Marketing` page.
15. Build `Settings` page.
