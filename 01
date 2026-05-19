# FitnessWynk Web SaaS - Frontend Specification Document

## 1. Executive Summary
This document outlines the front-end architecture, technology stack, and UI/UX design specifications for transitioning **FitnessWynk Admin** from a native Android application to a modern web-based SaaS platform. The goal is to retain the "owner-first", high-speed manual workflow of the original app while delivering a premium, responsive web experience.

## 2. Technology Stack Recommendations
Based on the requirement for a scalable web SaaS and the provided technology constraints, the following stack is recommended:

*   **Core Framework**: **Next.js (React)** or **Vite + React**. Since this is a SaaS platform that might eventually need SEO for marketing pages and robust routing for the dashboard, Next.js is highly recommended. For a pure SPA, Vite + React is excellent.
*   **Language**: **JavaScript / TypeScript**. TypeScript is strongly recommended to maintain the type safety and robust data models (Member, Payment, etc.) that you enjoyed with Kotlin.
*   **Styling**: **Vanilla CSS (CSS Modules)**. We will build a custom, highly optimized design system using CSS variables to ensure strict adherence to the brand guidelines without relying on generic utility frameworks like Tailwind (unless later requested).
*   **State Management**: React Context API or Zustand. (Replaces `StateFlow` and `ViewModel` from the Android app).
*   **Icons**: Lucide React or Google Material Symbols (to match the Android feel).

## 3. Design System & Aesthetics
The web app must feel premium, dynamic, and tailor-made for fitness professionals. We will implement the improvements suggested in your `05-review-feedback.md` document.

### 3.1 Color Palette
*   **Primary (Brand)**: Gym Yellow (`#FFDE21`) - Used for primary actions, active tabs, and highlights.
*   **Background (App)**: Gym Gray (`#F5F5F5`) - Soft off-white for the main dashboard background to reduce eye strain.
*   **Surface (Cards)**: Pure White (`#FFFFFF`) - Clean surfaces for data cards with subtle drop shadows (glassmorphism accents).
*   **Text (Primary)**: Gym Black (`#000000`) and Gym Dark Gray (`#333333`).
*   **Status Colors**:
    *   *Active/Success*: Emerald Green (`#2E7D32`) / Light Green background (`#E8F5E9`)
    *   *Expired/Error*: Crimson Red (`#C62828`) / Light Red background (`#FFEBEE`)
    *   *Warning/Expiring*: Deep Orange (`#E65100`) / Light Orange background (`#FFF3E0`)
    *   *WhatsApp*: Brand Green (`#25D366`)

### 3.2 Typography
*   **Headings & Numbers**: **Outfit** or **Bebas Neue** - Bold, condensed fonts to give a high-energy "Fitness" vibe.
*   **Body & UI Text**: **Inter** or **Roboto** - Clean, highly legible sans-serif for tables, lists, and forms.

### 3.3 UI Characteristics
*   **Responsive Layout**: A persistent left-hand sidebar navigation on Desktop/Tablet, converting to a bottom tab bar or hamburger menu on Mobile.
*   **Micro-animations**: Smooth hover effects on cards and buttons, scale transformations when clicking elements, and skeleton loaders for data fetching.
*   **Premium Forms**: Floating labels, clear validation states, and custom dropdowns.

---

## 4. Global Architecture & Navigation
Instead of an Android Drawer, the Web SaaS will utilize a **Sidebar Layout** on desktop and a **Bottom Navigation / Hamburger** on mobile.

### Sidebar Menu Items:
1.  **Dashboard** (Home Icon)
2.  **Members** (Users Icon)
3.  **Attendance** (Check Circle Icon)
4.  **Renewals** (Alert/Clock Icon - combined with Expiry)
5.  **Finances** (Wallet Icon - combining Payments & Expenses)
6.  **Enquiries** (Phone/Lead Icon)
7.  **Marketing** (Megaphone Icon - Announcements)
8.  **Settings** (Gear Icon)

---

## 5. Screen-by-Screen Specifications

### 5.1 Dashboard (`/dashboard`)
*   **Layout**: CSS Grid.
*   **Top Section (Stats Grid)**: 4 prominent cards.
    *   *Active Members* (White background, black text)
    *   *Present Today* (White background, green accent)
    *   *Expiring (7d)* (Light orange background, dark orange text)
    *   *Monthly Collection* (Light yellow background, black text)
*   **Middle Section (Quick Actions)**: A horizontal row of prominent, colorful buttons to reduce friction.
    *   *Mark Attendance*, *Add Member*, *Log Payment*, *Add Enquiry*.
*   **Bottom Section (Split View)**:
    *   *Left Column*: Recent Activity Feed (List of recent payments/check-ins).
    *   *Right Column*: Alerts Box (If expiring > 0, big red/orange call to action box).

### 5.2 Members Directory (`/members`)
*   **Layout**: Data Table (Desktop) / Card List (Mobile).
*   **Header**: Sticky search bar, "+ Add Member" primary button.
*   **Filters**: Horizontal scrolling pill-shaped buttons for (Status, Plan, Batch, Duration).
*   **List Item/Row Data**: Name, Phone, Plan, Batch, Status Badge (Active/Expired).
*   **Interactions**: Clicking a row opens a right-side sliding panel (or dedicated page) for Member Details.

### 5.3 Member Detail View (`/members/[id]`)
*   **Layout**: 2-Column layout on desktop.
*   **Left Column (Profile)**: Avatar placeholder, Name, Phone. Large "Call" and "WhatsApp" action buttons.
*   **Right Column (Data)**:
    *   *Subscription Card*: Plan, Batch, Status, Expiry Date. Large "Renew" button.
    *   *Dues*: Red highlighted section if `dueAmount > 0` with a "Clear Dues" button.
    *   *History Tabs*: Toggle between "Payment History" and "Attendance History".

### 5.4 Daily Attendance (`/attendance`)
*   **Layout**: Two-pane or distinct top-bottom.
*   **Top**: Large progress bar or counter "Present Today: X / Y Active".
*   **List**: Alphabetical list of active members.
*   **Interaction**: Fast one-click toggles (checkboxes or switches). Toggling immediately updates the counter and logs to the local state/DB.

### 5.5 Renewals & Expiry (`/renewals`)
*   **Layout**: List view filtered strictly by Expiry Date (Past or < 7 days future).
*   **Visuals**: Deep red backgrounds for expired, orange for expiring soon.
*   **Actions**: Each row has a distinct WhatsApp icon button. Clicking it generates the `wa.me` link with pre-filled text.

### 5.6 Finances (Payments & Expenses) (`/finances`)
*   **Layout**: Tabbed interface (`Payments` | `Expenses`).
*   **Payments Tab**:
    *   Stats: This Month, Last Month, Total All Time.
    *   List: Chronological list of payments. "Log Payment" FAB/Primary button.
*   **Expenses Tab**:
    *   Stats: This Month, Last Month.
    *   List: Chronological list of expenses. "Add Expense" FAB/Primary button.

### 5.7 Enquiries / Leads (`/enquiries`)
*   **Layout**: Kanban board or List view.
*   **Data**: Name, Phone, Interested Plan, Notes.
*   **Actions**: "Mark as Converted" checkbox, Call button, WhatsApp button.

### 5.8 Marketing / Announcements (`/marketing`)
*   **Layout**: Form-heavy layout.
*   **Fields**: Textarea for message. Chip selectors for audience (All, Active, Expired).
*   **Action**: Large "Copy & Open WhatsApp Web/App" button. *Note: Web constraints mean we cannot auto-send; the copy-paste flow is preserved.*

### 5.9 Settings (`/settings`)
*   **Layout**: Vertical list of configuration cards.
*   **Sections**:
    *   *Profile*: Gym Name, UPI ID, QR Code Upload (File input with image preview).
    *   *Config Arrays*: Dynamic lists with "Add" and "Delete" for Plans, Batches, and Durations.

---

## 6. Shared Components (Design System)
To build this, we will create the following highly reusable React components:

1.  **`StatCard`**: A premium card with hover-lift animation, supporting icons, titles, large values, and dynamic background colors.
2.  **`Badge`**: Small pill-shaped indicator for Status (Active/Expired) with predefined color schemes.
3.  **`ActionButton`**: A robust button component supporting variants (`primary`, `secondary`, `danger`, `outline`, `ghost`), loading states, and embedded icons.
4.  **`DataRow`**: A standardized list item layout used across Members, Payments, and Expiry screens to ensure alignment.
5.  **`Modal` & `SlideOver`**: For forms like "Add Member" or "Log Payment", ensuring the user doesn't lose context of the background page.
6.  **`FormElements`**: Custom styled `Input`, `Select` (dropdown), and `Checkbox` components with error state handling.

## 7. Next Steps for Development
1.  **Initialize Project**: Run `npx create-next-app` or `npm create vite@latest`.
2.  **Setup CSS Variables**: Define the color palette and typography in `globals.css`.
3.  **Build UI Kit**: Implement the shared components (Buttons, Cards, Inputs).
4.  **Mock State Management**: Set up React Context with the existing mock data from the Android app to allow immediate UI testing.
5.  **Assemble Pages**: Build out the screens starting with the Dashboard and Members list.
