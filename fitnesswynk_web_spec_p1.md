# FitnessWynk Web SaaS — Frontend Specification (Part 1 of 2)
> Source of truth for any AI agent building the front-end. No backend required yet — all data lives in React Context (in-memory) seeded with mock data.

---

## 1. TECHNOLOGY STACK

| Concern | Choice | Reason |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | File-based routing, easy migration to backend API routes later, SSR-ready |
| Language | **TypeScript** | Same type-safety you had with Kotlin data classes |
| Styling | **Vanilla CSS + CSS Modules** | Full control, no utility-class bloat |
| Icons | **Lucide React** | Matches Android Material icon set closely |
| State | **React Context + useReducer** | Replaces ViewModel + StateFlow, no external libs needed for v1 |
| Date Formatting | **date-fns** | Replaces `SimpleDateFormat` from Android |
| Fonts | **Google Fonts** — Outfit (headings), Inter (body) |  |

**DO NOT use** Tailwind, shadcn, MUI, or any component library. Build the UI kit from scratch using the design tokens below.

---

## 2. DESIGN TOKENS (globals.css)

```css
:root {
  /* Brand */
  --color-primary:        #FFDE21;  /* GymYellow */
  --color-primary-light:  #FFF9C4;  /* Light yellow tint for selected states */
  --color-on-primary:     #000000;  /* Black text on yellow */

  /* Surfaces */
  --color-bg:             #F5F5F5;  /* App background (GymGray) */
  --color-surface:        #FFFFFF;  /* Cards */
  --color-surface-variant:#F0F0F0;  /* Alternate row bg */
  --color-border:         rgba(0,0,0,0.08);

  /* Text */
  --color-text-primary:   #000000;
  --color-text-secondary: #555555;
  --color-text-disabled:  #999999;

  /* Semantic */
  --color-active-bg:      #E8F5E9;
  --color-active-text:    #2E7D32;
  --color-expired-bg:     #FFEBEE;
  --color-expired-text:   #C62828;
  --color-warning-bg:     #FFF3E0;
  --color-warning-text:   #E65100;
  --color-whatsapp:       #25D366;
  --color-error:          #D32F2F;
  --color-due-bg:         #FFF3E0;
  --color-due-text:       #E65100;

  /* Dark accent (for secondary buttons) */
  --color-dark:           #333333;
  --color-on-dark:        #FFDE21;  /* Yellow text on dark bg */

  /* Elevation */
  --shadow-sm:   0 1px 3px rgba(0,0,0,0.08);
  --shadow-md:   0 4px 12px rgba(0,0,0,0.10);
  --shadow-lg:   0 8px 24px rgba(0,0,0,0.12);

  /* Radius */
  --radius-sm:   6px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-full: 999px;

  /* Typography */
  --font-heading: 'Outfit', sans-serif;
  --font-body:    'Inter', sans-serif;

  /* Spacing scale */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-5: 20px; --space-6: 24px;
  --space-8: 32px; --space-10: 40px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-std:  250ms ease;
}
```

---

## 3. TYPOGRAPHY SCALE

```css
/* Headings use Outfit */
.text-display  { font-family: var(--font-heading); font-size: 48px; font-weight: 800; line-height: 1.1; }
.text-h1       { font-family: var(--font-heading); font-size: 32px; font-weight: 700; }
.text-h2       { font-family: var(--font-heading); font-size: 24px; font-weight: 700; }
.text-h3       { font-family: var(--font-heading); font-size: 20px; font-weight: 600; }

/* Stat numbers */
.text-stat     { font-family: var(--font-heading); font-size: 36px; font-weight: 800; line-height: 1; }

/* Body uses Inter */
.text-body-lg  { font-family: var(--font-body); font-size: 16px; }
.text-body     { font-family: var(--font-body); font-size: 14px; }
.text-sm       { font-family: var(--font-body); font-size: 12px; }
.text-label    { font-family: var(--font-body); font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
```

---

## 4. DATA MODELS (TypeScript interfaces replacing Kotlin data classes)

```ts
// Member (from Member.kt)
interface Member {
  id: string;            // UUID
  name: string;
  phoneNumber: string;   // Raw 10-digit, e.g. "9876543210"
  planName: string;      // "Monthly Cardio"
  batch: string;         // "6-7 AM"
  startDate: number;     // epoch ms
  expiryDate: number;    // epoch ms — CRITICAL for color coding
  durationLabel: string; // "1 Month", "3 Months"
  notes: string;
  dueAmount: number;     // 0 = fully paid
}

// Payment (from Payment.kt)
interface Payment {
  id: string;
  memberId: string;
  memberName: string;    // Denormalized
  amount: number;        // INR integer
  paymentMode: 'Cash' | 'UPI';
  planName: string;
  batch: string;
  startDate: number;
  endDate: number;
  notes: string;
  timestamp: number;     // epoch ms
}

// Attendance (from Attendance.kt)
interface Attendance {
  id: string;
  memberId: string;
  memberName: string;
  date: number;          // Midnight epoch ms (day-normalized)
  isPresent: boolean;
}

// Expense (from Expense data class)
interface Expense {
  id: string;
  title: string;         // "Rent", "Equipment"
  amount: number;
  date: number;          // epoch ms
  notes: string;
  category: string;      // "General" default
}

// Enquiry (from Enquiry data class)
interface Enquiry {
  id: string;
  name: string;
  phoneNumber: string;
  planOfInterest: string;
  notes: string;
  isConverted: boolean;
  timestamp: number;
}

// Announcement
interface Announcement {
  id: string;
  title: string;
  message: string;
  targetGroup: 'All' | 'Active' | 'Expired';
}

// GymSettings (from GymSettings data class)
interface GymSettings {
  gymName: string;           // "FitnessWynk Gym"
  upiId: string;
  qrCodeUrl: string;
  availablePlans: string[];  // ["Monthly Cardio", "Yearly", ...]
  batches: string[];         // ["6-7 AM", "7-8 AM", ...]
  durations: string[];       // ["1 Month", "3 Months", "1 Year"]
}
```

### 4.1 Key Business Logic (replicate exactly from Android)
- **isExpired**: `Date.now() > member.expiryDate`
- **daysRemaining**: `Math.floor((member.expiryDate - Date.now()) / 86_400_000)`
- **expiringSoon**: `member.expiryDate > Date.now() && member.expiryDate < Date.now() + 7 * 86_400_000`
- **endDate from duration**: Parse `"1 Month"`, `"45 Days"`, `"1 Year"` and add to startDate using `date-fns addMonths/addDays/addYears`.
- **WhatsApp URL**: `` `https://wa.me/91${member.phoneNumber}?text=${encodeURIComponent(msg)}` ``
- **todayMidnight**: `new Date().setHours(0,0,0,0)` — used for attendance filtering.
- **Admin PIN**: `"913291"` (used for delete and edit confirmations).

---

## 5. APP LAYOUT

### 5.1 Shell Layout (`app/layout.tsx`)
```
┌──────────────────────────────────────────────────────┐
│  SIDEBAR (260px fixed)  │  MAIN CONTENT (flex-1)     │
│                         │                            │
│  [FW Logo / Gym Name]   │  [Top Bar: Page Title +    │
│                         │   optional actions]        │
│  [Nav Items — 8 total]  │                            │
│                         │  [Page Content]            │
│  [Settings at bottom]   │                            │
└──────────────────────────────────────────────────────┘
```
- On mobile (< 768px): Sidebar collapses. A **hamburger** icon in the top bar opens a full-screen overlay drawer.
- On tablet (768–1024px): Sidebar shows only icons (60px wide). Hover tooltip shows label.
- On desktop (> 1024px): Full sidebar with icon + label.

### 5.2 Sidebar Nav Items (in order)
| Label | Icon | Route |
|---|---|---|
| Dashboard | `LayoutDashboard` | `/` |
| Members | `Users` | `/members` |
| Attendance | `CheckSquare` | `/attendance` |
| Renewals | `AlertTriangle` | `/renewals` |
| Finances | `Wallet` | `/finances` |
| Enquiries | `PhoneCall` | `/enquiries` |
| Marketing | `Megaphone` | `/marketing` |
| Settings | `Settings` | `/settings` |

Active route: sidebar item gets `background: var(--color-primary-light)`, left border `4px solid var(--color-primary)`.

---

## 6. SHARED COMPONENT SPECS

### 6.1 `<StatCard />`
**Props**: `label`, `value`, `icon`, `bgColor`, `onClick`, `trend?`
```
┌─────────────────────────────┐
│  [value — .text-stat]       │
│  [label — .text-label]      │
│                    [icon]   │
└─────────────────────────────┘
```
- Hover: `transform: translateY(-2px)`, `box-shadow: var(--shadow-md)`
- Cursor: pointer (navigates to relevant section)
- Transition: `var(--transition-std)`

### 6.2 `<Badge />`
**Props**: `status: 'active' | 'expired' | 'warning' | 'converted' | 'due'`
```
ACTIVE    → bg: --color-active-bg,   text: --color-active-text,  "ACTIVE"
EXPIRED   → bg: --color-expired-bg,  text: --color-expired-text, "EXPIRED"
WARNING   → bg: --color-warning-bg,  text: --color-warning-text, "EXPIRING"
CONVERTED → bg: #E8F5E9, text: #2E7D32, "CONVERTED ✓"
DUE       → bg: --color-due-bg, text: --color-due-text, "DUE ₹X"
```
Styling: `border-radius: var(--radius-full)`, `padding: 2px 10px`, `font-size: 11px`, `font-weight: 700`, `letter-spacing: 0.05em`.

### 6.3 `<Button />`
**Variants**:
- `primary`: `background: var(--color-primary)`, `color: var(--color-on-primary)`, bold, `border-radius: var(--radius-md)`
- `dark`: `background: var(--color-dark)`, `color: var(--color-on-dark)`
- `ghost`: transparent, border `1px solid var(--color-border)`, on hover bg `var(--color-surface-variant)`
- `danger`: `background: var(--color-error)`, `color: white`
- `whatsapp`: `background: var(--color-whatsapp)`, `color: white`
All buttons: `height: 44px`, icon+text layout with `8px gap`, hover `opacity: 0.9 + translateY(-1px)`, active `scale(0.98)`.

### 6.4 `<Modal />`
- Full-screen overlay with `backdrop-filter: blur(4px)`, `background: rgba(0,0,0,0.4)`
- Modal panel: `max-width: 560px`, centered, `border-radius: var(--radius-lg)`, scrollable content
- Header: title + X close button
- Footer: Cancel (ghost) + Confirm (primary or dark) buttons
- Animation: slide-up + fade-in on open, reverse on close

### 6.5 `<Input />` / `<Select />`
- Height: `48px`, full-width by default
- Border: `1.5px solid var(--color-border)`, on focus `1.5px solid var(--color-primary)`
- Label: floats above on focus (CSS animation), color `var(--color-text-secondary)`
- Error state: border `var(--color-error)`, helper text below in red

### 6.6 `<FilterChip />`
- Default: `background: var(--color-surface-variant)`, `border: 1px solid var(--color-border)`
- Selected: `background: var(--color-primary)`, `color: var(--color-on-primary)`, `border-color: transparent`
- `border-radius: var(--radius-full)`, `height: 32px`, `padding: 0 12px`

---

## 7. SCREEN — DASHBOARD (`/`)

### 7.1 Data Computed (replaces DashboardScreen.kt computed values)
```ts
const activeMembersCount  = members.filter(m => !isExpired(m)).length;
const presentTodayCount   = attendance.filter(a => a.date === todayMidnight).length;
const expiringSoonCount   = members.filter(m => isExpiringSoon(m)).length;
const monthlyCollection   = payments
  .filter(p => isSameMonth(p.timestamp, Date.now()))
  .reduce((sum, p) => sum + p.amount, 0);
```

### 7.2 Layout
```
┌── Stats Grid (2×2) ──────────────────────────────────┐
│  [Active Members]     │  [Present Today]             │
│  [Expiring (7d)]      │  [Monthly Collection]        │
├── Quick Actions ─────────────────────────────────────┤
│  [Attendance] [Add Member] [Log Payment] [Enquiries] │
├── Alert Banner (conditional) ────────────────────────┤
│  ⚠ X memberships expiring soon — [Check Now]         │
├── Two Columns ───────────────────────────────────────┤
│  Recent Payments (last 5)  │  Action Required        │
│  [Name, Mode, ₹Amount]     │  [Expiry alert cards]   │
└──────────────────────────────────────────────────────┘
```

### 7.3 Stat Cards (exact values)
| Card | Label | Value | BgColor |
|---|---|---|---|
| 1 | Active Members | `activeMembersCount` | `--color-surface` |
| 2 | Present Today | `presentTodayCount` | `--color-active-bg` |
| 3 | Expiring (7 Days) | `expiringSoonCount` | `--color-warning-bg` |
| 4 | This Month Collection | `₹${monthlyCollection}` | `--color-primary-light` |

### 7.4 Quick Action Buttons (2×2 grid)
| Button | Variant | Icon | Action |
|---|---|---|---|
| Attendance | primary | `CheckSquare` | Navigate to `/attendance` |
| Add Member | dark | `UserPlus` | Open AddMemberModal |
| Log Payment | dark | `CreditCard` | Open LogPaymentModal |
| Enquiries | ghost (cyan tint) | `PhoneCall` | Navigate to `/enquiries` |

### 7.5 Alert Banner
- Only renders if `expiringSoonCount > 0`
- Background: `var(--color-expired-bg)`, left border `4px solid var(--color-error)`
- Text: `"{N} memberships expiring soon"` in bold `var(--color-expired-text)`
- CTA: `"Check Now →"` button, ghost variant, navigates to `/renewals`

### 7.6 Recent Payments List (last 5 payments sorted by timestamp desc)
Each row:
```
[Member Name (bold)]          [₹Amount (bold, primary color)]
[dd MMM, hh:mm a]  [Mode]
```
Divider between rows. Entire section in a `<StatCard>`-style container with shadow.

---

## 8. SCREEN — MEMBERS (`/members`)

### 8.1 Header Bar
- Left: Page title "Members"
- Right: `<Button variant="primary" icon="UserPlus">Add Member</Button>`

### 8.2 Search + Filter Row
```
[🔍 Search Members...          ]
[Status ▾] [Plan ▾] [Batch ▾] [Duration ▾]  ← FilterChips, horizontal scroll
```
Search: debounced 300ms, filters `member.name` (case-insensitive).

Filter logic (mirrors Android exactly):
- Status: `All | Active | Expired`
- Plan: `All | <plan from settings.availablePlans>`
- Batch: `All | <batch from settings.batches>`
- Duration: `All | <duration from settings.durations>`

### 8.3 Plan Stats Row (horizontal scroll cards)
For each plan in `settings.availablePlans`:
```
┌──────────────────┐
│  Monthly Cardio  │  ← plan name, white text
│       12         │  ← count in yellow
└──────────────────┘
```
Background: `var(--color-dark)`, `border-radius: var(--radius-md)`.

### 8.4 Member List (Table on desktop, Cards on mobile)

**Desktop Table columns**: Name | Plan + Batch | Status | Days Left | Actions

**Mobile Card**:
```
┌──────────────────────────────────────┐
│  [Name (bold)]          [ACTIVE]     │
│  [Plan • Batch]                      │
└──────────────────────────────────────┘
```
- `ACTIVE` → `<Badge status="active" />`
- `EXPIRED` → `<Badge status="expired" />`
- `dueAmount > 0` → also show `<Badge status="due" value={dueAmount} />`
- Row hover: `background: var(--color-surface-variant)`, cursor pointer
- Click → navigate to `/members/[id]`

### 8.5 Empty State
```
  [UserX icon, 64px, color: --color-text-disabled]
  "No members found"
  "Try adjusting your filters or add a new member."
  [+ Add Member Button]
```

### 8.6 Add Member Modal (mirrors AddMemberDialog.kt exactly)

**Section 1 — Personal Details**
- `Name` (text input, required)
- `Phone` (number input, max 10 digits, required. Validate on submit: must be exactly 10 digits)

**Section 2 — Membership Details**
- `Plan` (Select dropdown from `settings.availablePlans`)
- `Duration` (Select dropdown from `settings.durations`)
- `Batch` (Select dropdown from `settings.batches`)
- `Starts On` (date picker, default today, read-only text field that opens native date picker on click)
- `Ends On (Auto)` (calculated from startDate + duration, read-only, never editable directly)

**Duration → EndDate calculation**:
```ts
function calcEndDate(startMs: number, duration: string): number {
  const [amt, unit] = duration.trim().split(' ');
  const n = parseInt(amt);
  const d = new Date(startMs);
  if (unit.toLowerCase().startsWith('day'))   return addDays(d, n).getTime();
  if (unit.toLowerCase().startsWith('week'))  return addWeeks(d, n).getTime();
  if (unit.toLowerCase().startsWith('year'))  return addYears(d, n).getTime();
  return addMonths(d, n).getTime(); // default months
}
```

**Section 3 — Payment Status**
- Toggle chips: `Fully Paid | Partial | Unpaid`
- If `Fully Paid`: show `Amount Paying Now (₹)` (number input)
- If `Partial`: show `Total Fee (₹)` + `Paying Now (₹)` side by side. Due = Total - Paid.
- If `Unpaid`: show `Total Due Amount (₹)` (number input)
- `Payment Date` (date picker, default today)

**Section 4 — Notes**
- `Comments / Notes` (textarea, max 3 lines, optional)

**Submit Validation**: Name must not be blank, phone must be 10 digits. On success, call `addMember()` action.

---

## 9. SCREEN — MEMBER DETAIL (`/members/[id]`)

### 9.1 Layout (desktop: 2 columns, mobile: stacked)

**Left Column — Profile Panel**
```
┌──────────────────────────────┐
│  [Avatar Circle 100px]       │
│  [Name — h2]                 │
│  [Phone — body, gray]        │
│  [Days remaining / EXPIRED]  │
│  [Call Button] [WhatsApp Btn]│
└──────────────────────────────┘
```
- Avatar circle: if expired → `var(--color-expired-bg)`, person icon `var(--color-expired-text)`. If active → `var(--color-primary-light)`, icon `var(--color-on-primary)`.
- "EXPIRED" text: large, bold, `var(--color-error)`.
- "X Days Remaining": bold, `var(--color-active-text)`.
- `Call` button: `variant="ghost"`, icon `Phone`, opens `tel:${phoneNumber}` link.
- `WhatsApp` button: `variant="whatsapp"`, icon `MessageCircle`, opens pre-filled `wa.me` link.

WhatsApp message template (exact from Android):
```
"Hello {name}, your membership at FitnessWynk expires on {dd MMM yyyy}. 
Please pay to renew! - FitnessWynk"
```

**Right Column — Data**

Card 1: **Subscription Details**
```
Plan          [value]
Batch         [value]
Status        [Badge]
Expires On    [dd MMM yyyy]
Duration      [value]
```
If `dueAmount > 0`:
```
Due Amount    ₹{dueAmount}   ← red bold text both sides
```
If notes is not blank:
```
Notes:
[notes text]
```
Primary CTA: `<Button variant="primary" fullWidth>Renew Membership</Button>`

Card 2: **History Tabs**
- Tab 1: `Payment History`
- Tab 2: `Attendance History` *(stub for now — show "Coming Soon" state)*

Payment History rows:
```
[Member Name]        [₹Amount bold, primary]
[dd MMM yyyy hh:mm] [Mode]
```
Click row → opens `<PaymentDetailModal />`.

**Delete Member** button at page bottom:
`<Button variant="danger" outlined icon="Trash2">Delete Member</Button>`
→ Opens `<ConfirmPinModal />` (PIN: `913291`).

**Edit** button in top-right of page header:
→ Opens `<EditMemberModal />` which mirrors `EditMemberDialog.kt`. Fields: Name, Phone, Plan (dropdown), Batch (dropdown), Notes, Start Date (date picker), Expiry Date (date picker), Mark Fully Paid checkbox if dueAmount > 0. Save requires PIN (`913291`).

---

*Continue in Part 2: Attendance, Renewals, Finances, Enquiries, Marketing, Settings, and State Management.*
