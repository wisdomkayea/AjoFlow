# Kreddt Vendor — Frontend Design Guide

> Single source of truth for building every page of the **Kreddt Vendor Dashboard**.
> Derived from the existing screens: Dashboard, Customers (list / empty / detail), and Create Package (Add Products step).
> **Font:** Geist · **Primary color:** `#16A34A`
>
> ⚠️ **Every date, time, amount, count, name, ID and percentage in this document and in the reference screens is an illustrative placeholder.** None of it is fixed. See §1.1 (Dynamic Data Principle) and §14 (Standing Fix Directives).

---

## 1. Product Context

Kreddt lets **vendors** (merchants) sell products to **customers** on **installment plans** (e.g. "Pay Small Small"). Vendors track customers, products, installment plans, payments and wallet balance.

**Design personality:** trustworthy, fintech-clean, calm, data-first. Lots of white space, rounded cards, green for action and success, yellow/amber for money and caution accents.

**Currency:** Nigerian Naira (₦). **Timezone:** Africa/Lagos. **Date format:** `21 July 2026` (lists) or `Sep 30, 2026` (detail). Pick **one** per context and stay consistent (see §14).

---

## 1.1 Dynamic Data Principle (No Hard-Coded Values)

All values shown in mockups ("₦230,000.00", "21 July 2026", "07:00pm", "KRD-00999", "4 of 10 paid", "83.3%", "Page 1 of 10", "WenStudios", "Pay Small Small", "6-month weekly tenure", "#PLN-8942", product and customer names) are **sample data for layout only**. Implementation must never copy them into components.

| # | Rule | What it means in practice |
|---|---|---|
| D1 | **Single source of truth** | Every displayed value comes from API/store props. No literals in JSX/templates. Sample data lives only in fixtures/Storybook/test files, never in component code. |
| D2 | **Derive, don't duplicate** | Totals, balances, percentages, counts and rates are computed from underlying records (table below), not typed in or stored twice. |
| D3 | **Central formatters** | Money, dates, times, numbers, percentages and plurals go through shared helpers (`formatMoney`, `formatDate`, `formatTime`, `formatRelative`, `pluralize`). No manual string concatenation anywhere. |
| D4 | **Locale and currency from config** | Defaults: `en-NG`, `NGN` (₦), `Africa/Lagos`. Read from vendor/user settings so they can change later. Never hard-code the symbol, separator, date order or 12/24-hour clock. |
| D5 | **Store raw, format at the edge** | Dates as UTC ISO 8601; money as integer minor units (kobo) or decimal strings, never floats; percentages as numbers. Format only at render time in the user's timezone. |
| D6 | **Counts drive structure** | Number of progress segments = number of installments in the schedule (not always 10). Stepper steps, table columns, KPI cards, nav items, filter options and tabs come from config/data, not fixed markup. |
| D7 | **Dynamic copy** | Strings containing data are templates: "{n} Product(s) Selected", "{paid} of {total} paid", "Page {page} of {pages}", "Welcome, {businessName}", "{tenure}-{unit} {frequency} tenure". Handle singular/plural, zero and large numbers. |
| D8 | **Layout survives any data** | Test with: very long names, ₦0, ₦1,000,000,000+, negative values, null/missing fields, 0/1/many items, very long product lists. Use `tabular-nums`, `min-w-0`, `truncate` + tooltip; amounts never wrap; no fixed-width number containers. |
| D9 | **Standard null handling** | Missing value → placeholder from the central map: amount `-`, date `-`, name `Not Assigned`, plan `Not Set Up`, payments `No Payments`. Never show `undefined`, `NaN`, `null` or `₦NaN`. |
| D10 | **Live, not stale** | After any mutation (record payment, create plan) invalidate/refetch dependent data: KPIs, lists, balances, counts, progress. Relative times ("2 min ago") refresh on an interval. Wallet balance reflects the server value, never a client-side guess. |
| D11 | **Thresholds and options are config** | Collection-rate color bands, page size, installment frequencies, payment methods, statuses, categories, and plan presets (e.g. "Pay Small Small") come from the backend or a config file, not component constants. |
| D12 | **Identifiers come from the backend** | Plan IDs, receipt numbers, references (`KRD-xxxxx`), account masks (`020464***75`) are generated and masked server-side; the UI only displays them. |

### Derived values (compute these, never hard-code)

| Value | Formula |
|---|---|
| Plan outstanding ("left") | `plan.total − Σ verified payments on plan` |
| Plan paid % | `Σ verified payments ÷ plan.total × 100` |
| Plan target | `plan.total` (or the amount due to date, if the label says "Due to date"; the label must match the formula) |
| Installments paid ("4 of 10") | `count(paid schedule items)` of `count(schedule items)` |
| Next due | earliest unpaid schedule item: amount + date |
| Customer: Active Plans | `count(plans where status = active)` |
| Customer: Total Purchased | `Σ plan.total` across the customer's plans |
| Customer: Total Paid | `Σ verified payments` across the customer's plans |
| Customer: Outstanding Balance | `Total Purchased − Total Paid` (always **money**) |
| Dashboard: Total Billed | `Σ plan.total` across all vendor plans |
| Dashboard: Total Revenue | `Σ verified payments` across all vendor plans |
| Dashboard: Outstanding Balances | `Total Billed − Total Revenue` |
| Collection rate | `Total Revenue ÷ Total Billed × 100` (guard divide-by-zero → show `-`) |
| Package/cart total | `Σ (unit price × quantity)` of selected items, recomputed on every change |
| Pagination | `pages = ceil(totalCount ÷ pageSize)`; count pill = `totalCount` |
| "Showing N most recent" / "View all (N)" | N from the actual returned/total counts |

---

## 2. Design Tokens

### 2.1 Typography — Geist

```css
@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap");
/* Or in Next.js: import { GeistSans } from "geist/font/sans"; */

:root {
  --font-sans: "Geist";
  --font-mono: "Geist";
}
body { font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
```

> ⚠️ **Naira glyph (₦):** the current Customer Detail screen renders `Next due: ▯25,000` (missing glyph box). Always format money with `Intl.NumberFormat("en-NG")` and test `₦` on every build using Geist. Never hard-code `N` as a substitute (the Customers table and Create Package screen currently show `N120,000` / `N450,000`; use `₦`).

| Token | Size / Line height | Weight | Use |
|---|---|---|---|
| `display` | 32 / 40 | 700 | Wallet balance (₦230,000.00) |
| `h1` | 28 / 36 | 700 | Page/component headers (use `text-[28px] font-bold text-gray-900`) |
| `h2` | 24 / 32 | 600 | Section titles, entity names ("Jesse Leos") |
| `h3` | 18 / 28 | 600 | Card titles ("Recent Transactions", "All Customers") |
| `body-lg` | 16 / 24 | 400/500 | Table cell primary text, nav labels |
| `body` | 14 / 20 | 400/500 | Default UI text, inputs, buttons |
| `body-sm` | 13 / 20 | 500 | Dashboard transaction description text |
| `caption` | 12 / 16 | 400/500 | Helper text, timestamps, table headers (uppercase variant: 11–12px, `tracking-wide`, 600) |
| `caption-xs` | 11 / 16 | 400 | Dashboard transaction date/time/reference meta |
| `stat` | 24 / 28 | 700 | KPI numbers in stat cards (₦600,000 / ₦720,000 / ₦120,000 / 5) |

- Numbers in tables/KPIs: add `font-variant-numeric: tabular-nums;`.
- Page title + subtitle pattern: all component/page `h1` headers must use **`text-[28px] font-bold text-gray-900`**; subtitle in `gray-500` at `body-lg`.

### 2.2 Colors

**Primary (green)**

| Token | Hex | Use |
|---|---|---|
| `primary-50` | `#F0FDF4` | Selected row/card background (e.g. selected product), subtle highlights |
| `primary-100` | `#DCFCE7` | Badges ("ACTIVE", "PAID"), count pills, notification bell circle |
| `primary-200` | `#BBF7D0` | Borders on selected items, focus halo |
| `primary-500` | `#22C55E` | Bright CTA fill used on buttons ("Add Customers", "Set Up Plan", active nav pill) |
| **`primary-600`** | **`#16A34A`** | **Brand primary. Top bar, primary buttons, links ("View"), progress fill, focus ring** |
| `primary-700` | `#15803D` | Hover/pressed on primary |
| `primary-800` | `#166534` | Text on `primary-100` badges |

> Rule: **`#16A34A` is the brand color** (top bar, links, primary buttons, active states). `#22C55E` is only the brighter fill used in the design for large pill buttons and the active sidebar item; if you want to simplify, use `#16A34A` for both and `#15803D` for hover. Pick one approach app-wide and don't mix on the same screen.

**Neutrals (cool gray)**

| Token | Hex | Use |
|---|---|---|
| `gray-0` | `#FFFFFF` | Cards, sidebar, inputs |
| `gray-50` | `#F9FAFB` | Table header background, input background, hover rows |
| `gray-100` | `#F3F4F6` | **Page background** (content area) |
| `gray-200` | `#E5E7EB` | Borders, dividers, inactive progress segments |
| `gray-400` | `#9CA3AF` | Placeholder text, disabled |
| `gray-500` | `#6B7280` | Secondary text, nav icons (inactive), table headers |
| `gray-700` | `#374151` | Nav labels (inactive), body text |
| `gray-900` | `#111827` | Headings, primary text |

**Accents / semantic**

| Token | Hex | Use |
|---|---|---|
| `amber-100` | `#FEF3C7` | Icon circle backgrounds on stat cards, "Vendor" badge fill |
| `amber-400` | `#FACC15` | Collection-rate progress bar |
| `amber-700` | `#B45309` | "Vendor" badge text/border |
| `blue-500` | `#3B82F6` | Verified tick on avatar only |
| `red-600` | `#DC2626` | Errors, overdue, destructive |
| `red-50` | `#FEF2F2` | Error/overdue badge bg |
| `orange-50` | `#FFF7ED` | Pending / due-soon badge bg |
| `orange-600` | `#EA580C` | Pending / due-soon text |

**Semantic status mapping**

| Status | Badge bg | Badge text |
|---|---|---|
| Active / Paid / Completed | `primary-100` | `primary-800` |
| Pending / Due soon | `orange-50` | `orange-600` |
| Overdue / Failed | `red-50` | `red-600` |
| Not set up / Draft | `gray-100` | `gray-600` |

### 2.3 Tailwind config (recommended)

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist"],
        mono: ["Geist"],
      },
      colors: {
        primary: {
          50: "#F0FDF4", 100: "#DCFCE7", 200: "#BBF7D0",
          500: "#22C55E", 600: "#16A34A", 700: "#15803D", 800: "#166534",
          DEFAULT: "#16A34A",
        },
        surface: { page: "#F3F4F6", card: "#FFFFFF", muted: "#F9FAFB" },
        accent: { amber: "#FACC15", amberSoft: "#FEF3C7" },
      },
      borderRadius: { card: "16px", pill: "9999px", btn: "10px" },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.08)",
        pop: "0 12px 32px rgba(16,24,40,.12)",
      },
    },
  },
} satisfies Config;
```

### 2.4 Spacing, radius, elevation

- **Spacing scale:** 4-pt grid → `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
- **Page padding:** 32px (desktop), 16px (mobile).
- **Card padding:** 24–32px. **Gap between cards:** 16–24px.
- **Radius:** buttons/inputs `10px`; cards `16px` (large table card up to `24px`); pills/badges `9999px`; avatars full circle.
- **Elevation:** cards use very soft shadow (`shadow-card`) + 1px `gray-200` border. Popovers/dropdowns use `shadow-pop`. No heavy shadows.
- **Borders:** 1px `gray-200`. Row dividers inside tables: 1px `gray-200`.

---

## 3. App Shell (applies to every page)

```
┌───────────────┬───────────────────────────────────────────────┐
│  Sidebar 240  │  Top bar (64px, primary-600, title + actions) │
│  (white)      ├───────────────────────────────────────────────┤
│               │  Page content (bg gray-100, padding 32)       │
│               │                                               │
└───────────────┴───────────────────────────────────────────────┘
```

### 3.1 Sidebar (240px, white, right border `gray-200`)
- **Top:** Kreddt logo (green K-mark + "Kreddt" wordmark) with an amber **Vendor** pill beneath. Bottom border `gray-200`. Height aligns with top bar (64px) plus padding.
- **Nav items** (in order): Dashboard, Customers, Products, Installments, Payment, Settings, Help and Support.
  - Item height 48px, horizontal padding 16px, radius `12px`, icon 24px + 16px gap + label (`body-lg`, 500).
  - **Inactive:** icon & label `gray-500/700`, transparent bg.
  - **Hover:** `gray-50` bg.
  - **Active:** solid green bg (`primary-500`/`primary-600`), white icon + label, subtle inner shadow/border darker green. Icons switch to filled variant.
- **Divider** (1px `gray-200`) then **user block** pinned at the bottom: 40px avatar, name (`body-lg`, 500), email (`caption`, `gray-500`, truncate), logout icon-button at right.
- **Mobile (<1024px):** sidebar becomes an off-canvas drawer opened by a hamburger in the top bar.

### 3.2 Top bar (64px, `primary-600`)
- Left: page-section label in white (`h3`/20px, 600). Currently always "Dashboard"; **recommended:** show the current section name (Customers, Products…) or keep a constant app title, but be consistent.
- Right: notification bell inside a 48px circle (`primary-100` bg, green bell), then 48px avatar with blue verified tick. 16px gap.
- Sticky at the top; z-index above content.

### 3.3 Page header pattern (inside content)
```
<h1>Customers</h1>                         [ + Add Customers ]
<p>Everyone buying from you on installment</p>
```
- Title left, primary action right, aligned to title baseline. 24–32px below to the first card.
- **Detail pages** add a **breadcrumb** above the header (`Customers › Jesse Leos`, icon + `body`, current crumb in `gray-900` 600, previous in `gray-500`).
- **Wizard pages** use a circular back-arrow button (48px, white, `gray-200` border) left of the title.

---

## 4. Components

### 4.1 Buttons

| Variant | Style | Use |
|---|---|---|
| **Primary** | bg `primary-500/600`, white text, 600, h 48 (lg) / 40 (md) / 32 (sm), radius 10, optional leading `+` icon in a white-outlined circle | "Add Customers", "Record Payment", "Next" |
| **Primary-soft** | bg `primary-50/100`, text `primary-700` | "Create Installment Plan", "Back" |
| **Secondary** | white bg, 1px `gray-200` border, `gray-900` text | "Previous", "Next" pagination, "View More", "Filters" |
| **Tertiary / link** | no bg, `primary-600` text, 600, underline on hover | Table "View" action |
| **Destructive** | bg `red-600`, white text | Delete, cancel plan |
| **Icon button** | 40–48px circle, white or `primary-100` | Back arrow, bell, quantity `-` / `+` |

States: **hover** (one shade darker), **focus-visible** (2px ring `primary-600` with 2px offset), **disabled** (`gray-200` bg, `gray-400` text, no shadow), **loading** (spinner replaces icon, label stays, width fixed).

Inline compact "chip" action (used in table): **"Set Up Plan ●"** — pill, h 40, `primary-500`, white 600 text 14px, trailing white dot/toggle glyph.

### 4.2 Inputs & form controls
- Height 48px, radius 10px, bg `gray-50`, 1px `gray-200` border, text `body`, placeholder `gray-400`.
- **Search input:** leading magnifier icon (`gray-500`), full-width in toolbar, placeholder context-specific (see §14: Products screen currently says "Search name or phone" — change to "Search products").
- **Focus:** border `primary-600` + 3px ring `primary-200`.
- **Error:** border `red-600`, helper text `red-600` 12px below with icon.
- **Label:** `body` 500 `gray-700`, 6px above input. Required marker `*` in `red-600`.
- **Select/Sort dropdown:** same box with trailing chevron. Sort control pattern: `Sort by: <Green value> ⌄` (label gray-900, selected value `primary-600`).
- **Checkbox:** 20px, radius 6px; checked = `primary-500` fill + white tick. **Radio/Toggle** follow the same green.
- **Quantity stepper:** `[ - ]  1  [ + ]` — two 40px round `gray-100` buttons, number centered, min 1.
- **Phone input (NG):** prefix flag/`+234` select + number field; validate 11-digit local format (e.g. `08148877477`).
- **Money input:** `₦` prefix, thousands separators on blur, right-aligned digits optional.

### 4.3 Cards
- White, radius 16–24px, 1px `gray-200` or `shadow-card`, padding 24–32.
- **Card header:** title `h3` left; optional subtitle `caption gray-500`; right-side action (secondary button or link).

### 4.4 Stat / KPI card (Dashboard & Customer detail)
- Size: equal-width in a 4-column grid, height ≈ 112px, padding 24.
- Top row: label (`caption`, `gray-600`) left; **40px circular icon** right with `amber-100` bg and dark slate icon (bank, cash, hand-with-coin, check).
- Bottom: value `stat` (**24px / 28px, 700**). Money values use `₦` with smaller `₦` glyph optional.
- Grid: 4 cols ≥1280px, 2 cols 640–1279px, 1 col <640px.

### 4.5 Wallet hero banner (Dashboard)
- Full-width, height ≈ 110px, radius 20px, bg `primary-600` with a **subtle tone-on-tone organic/topographic pattern** (`primary-500`/`primary-700` at ~20% opacity).
- Left: 44px white circle with amber wallet icon, label "Kreddt Wallet" (white 80%, **14px / 20px, 500**), balance in `display` white 700 (**32px / 40px**) (`₦230,000.00`), with an **eye icon** toggle to mask the balance (`₦ ••••••`). Persist visibility preference in local storage.
- Future: add right-aligned "Withdraw" button (white bg, green text).

### 4.6 Data table (Customers list)
- Container: white card, radius 24, overflow hidden.
- **Toolbar row** (padding 24/32): title "All Customers" (`24px/28px`, 600) + **count pill** (`primary-100` bg, `primary-700` text, e.g. `16`), search input (compact fixed width at desktop), **Filters** secondary button with filter icon, **Sort by** dropdown.
- Desktop rule: keep title + search + filter + sort on one row (no wrap) at `xl` and above. Search field should be compact (`~280px`) so controls fit on one line.
- **Header row:** bg `gray-50`, height 56, text `body` `gray-500` 500, bottom border. (Fix typo: column "Acrion" → **"Action"**.)
- **Body rows:** min-height 72 (96 when two-line product cell), border-bottom `gray-200`, hover `gray-50`, text `body-lg` `gray-900`.
- **Columns:** Customer (avatar 48px + name 500) · Product (primary line; secondary line `gray-500` e.g. "iphone 12 pro +5") · Installment Plan · Outstanding · Last Payment · Action.
- **Empty values:** "Not Assigned", "Not Set Up", "-", "No Payments" in `gray-500`.
- **Action cell:** `Set Up Plan` chip when no plan, otherwise `View` link.
- **Footer:** "Page **1** of 10" left (`body`, number in 500) · `Previous` / `Next` secondary buttons right (h 48, radius 10). Disable `Previous` on page 1.
- Rows are clickable (whole row → detail) with `View` as the explicit affordance for accessibility.
- **Mobile:** collapse to stacked cards (avatar + name + status line + action).

### 4.7 Avatar
- Circle, sizes 32 / 40 / 48 / 64. Fallback: initials on `primary-100` with `primary-800` text. Verified tick: 14px blue badge at top-right (profile avatar only).

### 4.8 Badges / pills
- Height 24–28, padding 0 12, radius full, 12px/600 uppercase for status (`ACTIVE`, `PAID`), sentence case for count pills.
- Colors per **status mapping** in §2.2. "Vendor" badge: amber outline + `amber-100` fill + `amber-700` text.

### 4.9 Progress indicators
- **Collection rate bar:** 8–10px tall, radius full, track `gray-200`, fill `amber-400`; percentage pill (`primary-100`, `primary-700`, 600) on the right.
- **Collection Rate typography lock:** title = **14px / 20px, 600**; subtitle `₦600,000 paid out of ₦720,000 billed` = **12px / 16px, 400**.
- **Installment segmented bar (plan cards):** one segment **per installment** (e.g. 10), each ≈ 8px tall, radius full, 8px gap. Paid = `primary-600`, unpaid = `gray-200`. Caption row: `Paid: ₦100,000 (40%)` left, `Target: ₦250,000` right.

### 4.10 Plan card (Customer detail → Active payment plans)
```
[thumb 48] Samsung Galaxy A15 (128GB) [ACTIVE]                  ₦150,000 left
           ₦250,000 total • 6-month weekly tenure (Plan #PLN-8942)   4 of 10 paid
Paid: ₦100,000 (40%)      ▮▮▮▮▯▯▯▯▯▯                    Target: ₦250,000
─────────────────────────────────────────────────────────────────────
📅 Next due: ₦25,000 on Sep 30, 2026
View Policy (underlined link)
```
- Outer: bordered (`gray-200`) card, radius 16, padding 24, inside the white section card.
- Product thumbnail 48px radius 8; for packages (bundles) show the package image with the bundle name and the contained items in the title or tooltip.
- "left" amount right-aligned, `body-lg` 600. Secondary right line `gray-500`.
- Each plan must have a **unique Plan ID** (currently both plans show `#PLN-8942`).

### 4.11 Stepper (wizard, left rail)
Used by **Create Package** and should be reused for *Add Product*, *Create Installment Plan*, *Add Customer*.
- Vertical, ~320px wide column on the left, content card on the right (flex: 1).
- Each step: 40px circle + title (`body-lg` 600) + description (`body`, `gray-500`).
- **Completed:** green circle with white check; connector line `primary-600`.
- **Current:** green filled circle with white dot and 4px soft halo (`primary-100`), title and description in `primary-600`.
- **Upcoming:** `gray-100` circle with `gray-300` dot; text `gray-900`/`gray-500`.
- Footer buttons inside card, right-aligned: `Back` (primary-soft) + `Next →` (primary).
- Collapse to a horizontal 4-dot progress bar on mobile.

### 4.12 Selectable list item (Add Products)
- Row: checkbox · 56px rounded image · name (500) + price (`gray-500`) · quantity stepper.
- **Unselected:** white, 1px `gray-200`. **Selected:** `primary-50` bg, 1.5px `primary-500` border.
- Summary panel above the list: `gray-50` bg, "**2 Products Selected**" + "Product Total: ₦900,000" (recomputed live = Σ price × qty).
- Disable stepper on unselected rows until checked.

### 4.13 Transaction list row (Dashboard → Recent Transactions)
- Row separated by 1px `gray-200`, padding 20/0.
- Left: description = **13px / 20px, 500** (`gray-900`), under it meta line = **11px / 16px, 400** (`gray-500`): `26/07/2026 · 07:00pm · KRD-00999` (date · time · reference; make the reference monospace).
- Right: amount `body-lg` 600. Use **semantic color**: credits/incoming `primary-700` with `+`, payouts/outgoing `gray-900` with `−` (design currently uses black for all).
- Header: title + subtitle, `View More` secondary button right.

### 4.17 Dashboard pixel-lock (reference alignment)
Use these exact values for the Vendor dashboard hero + KPI + collection + recent transactions block:
- Wallet amount (`₦230,000.00`): **Geist 700, 32px, 40px line-height, 0 tracking**.
- KPI amount (`₦600,000` style): **Geist 700, 24px, 28px line-height, 0 tracking**.
- Collection title (`Collection Rate`): **Geist 600, 14px, 20px line-height, 0 tracking**.
- Collection subtitle (`₦600,000 paid out of ₦720,000 billed`): **Geist 400, 12px, 16px line-height, 0 tracking**.
- Transaction description (`Money transferred...`): **Geist 500, 13px, 20px line-height, 0 tracking**.
- Transaction meta (`26/07/2026 · 07:00pm · KRD-00999`): **Geist 400, 11px, 16px line-height, 0 tracking**.

### 4.18 Customers screens pixel-lock (reference alignment)
Use these exact values for the Customers list, Add Customer modal, success banner, and Customer detail pages:
- Page title (`Customers` on list page): **text-[28px] font-bold text-gray-900**.
- Customer name title on detail page: **Geist 500, 24px, 28px line-height, 0 tracking**.
- Page subtitle (`Everyone buying from you on installment`): **Geist 400, 14px, 20px line-height**.
- Section title (`All Customers`): **Geist 600, 18px, 28px line-height**.
- Customers toolbar search width: **~280px** desktop fixed width; keep one-row header composition at `xl+`.
- Table toolbar layout rule (must match Customers): at `xl+`, keep **title + count + search + filters + sort** on a single row; use `flex-nowrap`, search fixed to **~280px**, and keep controls compact (`h-10`, `rounded-[10px]`, `text-sm`).
- Count pill (`16`): **Geist 600, 12px, 16px line-height**.
- Table header labels: **Geist 500, 12px, 16px line-height**.
- Table body primary text (`Olivia Rhye`, product names): **Geist 500, 14px, 20px line-height**.
- Table body secondary text (`iphone 12 pro + 5`, `No Payments`): **Geist 400, 14px, 20px line-height**.
- List action link (`View`): **Geist 500, 14px, 20px line-height**, `primary-600`.
- `Set Up Plan` chip/button: **Geist 500, 14px, 20px line-height**, bg `primary-500`, radius `10px`.
- Pagination text (`Page 1 of 10`): **Geist 400, 14px, 20px line-height**.
- Empty-state title (`No Customers added yet`, `No active plan for ...`): **Geist 700, 40px, 48px line-height**.
- Empty-state helper text: **Geist 400, 14px, 20px line-height**.
- Modal title (`Add New Customer`, `Record Payment`): **Geist 600, 32px, 40px line-height**.
- Modal field labels: **Geist 500, 14px, 20px line-height**.
- Modal input text: **Geist 400, 14px, 20px line-height**.
- Success banner title (`Customer successfully created`): **Geist 600, 28px, 36px line-height**.
- Success banner description: **Geist 400, 14px, 20px line-height**.
- Customer detail stat values: **Geist 700, 24px, 28px line-height**.
- Active plan product title: **Geist 600, 14px, 20px line-height**.
- Active plan metadata row: **Geist 400, 12px, 16px line-height**.
- Recent payments table header: **Geist 600, 11px, 16px line-height**, uppercase tracking-wide.
- Recent payments table body: **Geist 400/500, 14px, 20px line-height**.
- Recent payments table must include a **Source** column with values **Manual** / **Auto**, sourced from backend payment `source`.

### 4.19 Products & Packages pixel-lock (reference alignment)
Use these exact values for products, package lists, and create/detail flows:
- Page title (`Products`, `Add Products`, `Create Package`): **text-[28px] font-bold text-gray-900**.
- List card title (`All Products`, `Packages`): **Geist 600, 18px, 28px line-height**.
- Tab labels (`All Products`, `Packages`): **Geist 500, 14px, 20px line-height**.
- Table header labels: **Geist 500, 12px, 16px line-height**.
- Table body primary text: **Geist 500, 14px, 20px line-height**.
- Table body secondary values (category, prices, status text): **Geist 400, 14px, 20px line-height**.
- Wizard right-panel section titles (`Product Information`, `Add Products`, `Set Package Price`, `Review Package`): **Geist 600, 32px, 40px line-height**.
- Wizard step titles (left rail): **Geist 500, 14px, 20px line-height**.
- Wizard step descriptions: **Geist 400, 12px, 16px line-height**.
- Success modal title (`Product Added`, `Package Created`): **Geist 600, 32px, 40px line-height**.
- Success modal subtitle: **Geist 400, 14px, 20px line-height**.
- Detail page entity title (`Samsung Galaxy A15`, `Sabi Package`): **text-[28px] font-bold text-gray-900**.
- Detail stat values: **Geist 700, 24px, 28px line-height**.

Packages definition and behavior:
- A **Package** is a grouped offer containing multiple products sold under one installment plan.
- Package list and package detail must be first-class screens (not hidden in product-only flows).
- Package price can match product total or apply a custom price/discount; display both total and customer savings.
- Package detail must show included products, aggregate stats, installment sales, and activity using the same component scale as product detail.

### 4.14 Empty state
- Centered in content area, vertical stack: 160px green illustration → `h2` ("No Customers added yet") → `body-lg gray-500` helper → primary CTA with `+`.
- Use the same pattern for every empty list (Products, Installments, Payments), changing illustration, copy and CTA.

### 4.15 Breadcrumbs
`Customers › Jesse Leos` — leading section icon, `body`, separators `›` `gray-400`. Each crumb except the last is a link.

### 4.16 Receipts / "View" link with icon
Trailing document icon after `View` (`primary-600`). Opens receipt drawer/modal (see §6.5).

---

## 5. Layout & Responsiveness

| Breakpoint | Width | Behavior |
|---|---|---|
| `sm` | ≥640 | Single column, drawer nav |
| `md` | ≥768 | 2-col KPI grid |
| `lg` | ≥1024 | Persistent sidebar (240px) |
| `xl` | ≥1280 | 4-col KPI grid, full tables |
| `2xl` | ≥1536 | Content max-width 1400px, centered |

- Content area: `max-w-[1400px]`, `mx-auto`, padding `32px` (≥lg) / `16px` (<lg).
- Tables scroll horizontally inside their card at <1024px or switch to card list <768px.
- Wizards: left rail hides below `lg` and becomes a horizontal step indicator.

---

## 6. Page Blueprints (for pages not yet designed)

Every page = **Page header** + **KPI row (optional)** + **primary card (table / form / detail)**.

### 6.1 Dashboard (exists)
Welcome header → wallet hero → 4 KPI cards → Collection Rate card → Recent Transactions.
Additions: date range filter (This month / 3 months / Custom) on the header right; "Upcoming dues" and "Overdue" cards; revenue-over-time line chart (bars/lines in `primary-600`, secondary series in `amber-400`).

### 6.2 Customers (exists)
List (table) · Empty · Detail. Pending: **Add Customer** flow, **Filters** panel, **Set Up Plan** flow.

- **Filters popover/drawer:** Plan status (Active / Completed / Overdue / Not set up), Product, Date range (last payment), Outstanding range. Footer: `Reset` (tertiary) + `Apply` (primary). Show applied filters as removable chips under the toolbar.
- **Add Customers (modal or full page):** fields — Full name*, Email, Phone*, Address, Optional ID/BVN reference, Avatar upload. Two buttons: `Cancel` / `Save customer`. On success → toast + navigate to detail.

### 6.3 Products
- **List:** header "Products" / "Items you sell on installment", actions: `Create Package` (primary-soft) + `Add Product` (primary). Toolbar: search, category filter, status filter, sort. View toggle **Grid / Table** (default grid).
- **Product card (grid):** image (4:3, radius 12), name 600, price `₦450,000`, stock chip, kebab menu (Edit, Duplicate, Archive). 4/3/2/1 columns by breakpoint.
- **Add/Edit Product (wizard or single form):** Name*, Category, Description, Price*, Images (drag-drop, up to 5), Stock quantity, SKU, Allowed installment plans (multi-select). Live preview card on the right.
- **Create Package (exists, 4 steps):** `Package Details` → `Add Products` → `Package Price` → `Review`.
  - *Package Details:* name, description, cover image.
  - *Package Price:* shows Product Total (read-only), Package Price input, auto-calculated discount % and savings chip; validate price > 0.
  - *Review:* summary card + product list + totals; `Create Package` primary. Success modal with "View package" / "Create another".
  - Replace the placeholder step descriptions ("Start collaborating with your team", "Share posts to your social accounts") with real copy: *"Set the bundle price"* and *"Review and publish"*.

### 6.4 Installments
- **List:** KPI row (Active, Completed, Overdue, Due this week). Table columns: Plan ID · Customer · Product/Package · Total · Paid (mini progress) · Next due · Status · Action.
- **Plan detail:** header with plan ID and status badge; schedule table (Installment #, Due date, Amount, Status, Paid on); segmented progress; activity timeline; actions `Record Payment`, `Edit Plan`, `Cancel Plan` (destructive, confirm modal).
- **Create / Set Up Installment Plan (wizard):** `Customer` → `Product or Package` → `Plan terms` (down payment, tenure, frequency weekly/monthly, start date, interest/markup) → `Schedule preview` → `Review & confirm`. Show a live **schedule preview** table on the right panel.
- Plan terms preset: "Pay Small Small" shown as a plan name chip.

### 6.5 Payments
- **List:** KPI row with 4 cards in this exact order: **Received Today**, **Received this Month**, **Total Payment Recoded**, **Total Customers**. Table: Date · Customer · Plan · Amount · Amount Recorded · **Source (Manual / Auto)** · Reference. Filters: method, status, date.
- **Record Payment (modal):** Customer* (search select) → Plan* (dependent select, shows balance) → Amount* (quick buttons: "Next installment ₦25,000", "Full balance") → Method* (Bank transfer, Cash, POS, Wallet) → Reference → Date → Receipt upload → `Record payment`.
- **Receipt (drawer, right, 480px):** header with status badge, amount large, details list (key/value rows), uploaded proof image, `Download PDF` + `Share` buttons.
- **Methods** displayed as `Bank Transfer (GTB #88392)` style: method + reference in parentheses.

#### Payments screen pixel-lock (reference alignment)
- Page title `Payments`: **text-[28px] font-bold text-gray-900**.
- Page subtitle `Record money received from a customer.`: **Geist 400, 14px, 20px**.
- KPI label text: **Geist 600, 14px, 20px**.
- KPI value text: **Geist 700, 32px, 40px**.
- Table heading `All Customers`: **Geist 600, 18px, 28px**.
- Payments table toolbar must follow the **same single-row composition as Customers** at `xl+`: title + count + search + filters + sort in one line with search at ~280px and no wrapping.
- Table header cells: **Geist 500, 12px, 16px**.
- Table body primary cell text: **Geist 500, 14px, 20px**.
- Table body secondary cell text: **Geist 400, 12px, 16px**.
- Payment source labels must be explicit text values: **Manual** (recorded by staff/vendor) and **Auto** (system reconciliation).
- Backend contract: every payment row must persist a `source` value on the Payment model (`MANUAL` or `AUTO`) so UI rendering does not rely on method-only inference.
- Backend contract: `reference` must be a real transaction reference token (for example `KRD-XXXX1234`), never a product name.
- Table row click target must include the full row and open **Payment Details**.
- Record transaction breadcrumb (`← Payments / Record a Transaction`): **Geist 600, 11px, 16px**, uppercase.
- Record card title `Record Customer Payment`: **Geist 700, 32px, 40px**.
- Record helper copy under title: **Geist 400, 12px, 16px**.
- Input labels in record card: **Geist 600, 12px, 16px** uppercase for field groups; customer label **14px / 20px**.
- Amount entry value: **Geist 700, 20px, 28px** with `₦` prefix.
- Info panel (`Balance`, `Next Payment`, `Payment Duration`) uses `primary-50` background and **14px / 20px** text.
- Success dialog title `Payment Recorded Successfully`: **Geist 700, 36px, 40px**.
- Success dialog body copy: **Geist 400, 13px, 20px**.

### 6.6 Wallet / Withdrawals (extension of Dashboard)
- Balance card, `Withdraw` primary, bank accounts list (add/remove), transaction history table with type filter (Credit / Withdrawal), downloadable statements.
- Withdraw modal: amount, destination bank (masked acct `020464***75`), PIN/OTP confirm.

### 6.7 Settings
Left sub-nav tabs (Profile · Business · Bank accounts · Team · Notifications · Security · Billing). Each tab: stacked cards of label/description on the left (1/3) and form controls on the right (2/3), `Save changes` primary at the card bottom right. Danger zone card at bottom (red outline).

### 6.8 Help and Support
Search bar hero → popular topics (grid of cards) → FAQ accordion → contact options (chat, email, phone) → "Submit a ticket" form + ticket list with status badges.

### 6.9 Notifications
Bell opens a **popover (380px)**: tabs `All / Unread`, list of items (icon, title, text, time), unread dot `primary-600`, `Mark all as read`. Full page `/notifications` uses the table/list pattern.

### 6.10 Auth & Onboarding (not shown, follow same language)
Centered 440px card on `gray-100`, logo on top, h2 title, form, primary full-width button, link row. Vendor onboarding: business details → verification (KYC) → bank account → done (progress stepper, same component as §4.11).

---

## 7. Modals, Drawers, Toasts

- **Modal:** centered, width 480/560/720, radius 20, padding 24–32, overlay `rgba(17,24,39,.5)` with blur 2px. Header (title `h3` + close icon), body, footer (right-aligned buttons, secondary left of primary). `Esc` and overlay click close (unless unsaved changes → confirm).
- **Drawer:** right-aligned, 480px, full height, same header/footer pattern. Use for receipts, filters, notifications.
- **Confirm dialog (destructive):** icon in `red-50` circle, title, description, `Cancel` + `Delete` (destructive).
- **Toast:** top-right, 360px, white card + left 4px colored bar (success `primary-600`, error `red-600`, info `blue-500`, warning `amber-400`), auto-dismiss 5s, pause on hover. Copy: short, specific ("Payment of ₦25,000 recorded").
- **Inline alerts:** `primary-50` / `red-50` / `orange-50` bg with matching border and icon, radius 12, padding 16.

---

## 8. States & Feedback

| State | Treatment |
|---|---|
| **Loading (page)** | Skeleton blocks matching final layout (`gray-200` pulsing, radius same as content). KPI cards, table rows (5), wallet banner |
| **Loading (button)** | Spinner + disabled, label unchanged |
| **Empty** | See §4.14. Include the CTA that fixes the emptiness |
| **No results (search/filter)** | Small magnifier illustration, "No results for '…'", `Clear filters` link |
| **Error (page)** | Illustration + "Something went wrong", `Try again` primary + `Contact support` link |
| **Error (field)** | Red border + helper text; focus first invalid field on submit |
| **Success** | Toast + optionally inline check icon in `primary-100` circle |
| **Offline** | Sticky amber banner under top bar |
| **Permission denied** | Locked-lock illustration + explanation + contact owner |

Optimistic UI where safe (toggle, checkbox, quantity). Never block the whole page for minor refreshes.

---

## 9. Iconography

- Style: **outline 1.5–2px stroke**, rounded caps, 24px grid (Lucide / Phosphor / Heroicons). Sidebar active icons use **filled** variant.
- Sizes: 16 (inline), 20 (buttons/inputs), 24 (nav), 32+ (empty states/hero).
- Color inherits text color; accent icons in stat cards use slate `#334155` on `amber-100`.
- Always pair icon-only buttons with `aria-label` and tooltip.

---

## 10. Motion

- Durations: 120ms (hover/press), 200ms (dropdowns, tabs), 280ms (modals/drawers). Easing `cubic-bezier(.2,.8,.2,1)`.
- Progress segments fill left→right on mount (stagger 40ms).
- Number count-up on dashboard KPIs (≤600ms, once).
- Respect `prefers-reduced-motion`: disable translate/scale, keep opacity fades.

---

## 11. Accessibility

- Contrast: white text on `#16A34A` is ~3.3:1 — OK for **large/bold text (≥18px or 14px bold)**, so use **600 weight and ≥14px** on green buttons/top bar. Body text in green on white (`primary-600` links) should use `primary-700` (`#15803D`, 5:1) when small.
- All interactive elements have a visible `focus-visible` ring (2px `primary-600`, offset 2px).
- Tables: real `<table>` with `<th scope="col">`, sortable headers use `aria-sort`.
- Status is never color-only: always include text (and icon where possible).
- Forms: `<label for>`, `aria-describedby` for helper/error, `aria-invalid`.
- Modals/drawers: focus trap, return focus on close, `role="dialog"` + `aria-modal`.
- Min touch target 44×44px on mobile.
- Progress bars: `role="progressbar"` with `aria-valuenow/min/max`; segmented bar gets a visually-hidden "4 of 10 installments paid".

---

## 12. Content & Formatting Rules

- **Money:** always via `formatMoney(amountMinorUnits, { currency, locale, decimals })`; symbol, grouping and decimals come from config (D4). Show decimals only where the context requires (wallet, ledger, receipts).
  ```ts
  export const formatMoney = (value: number, opts: { currency?: string; locale?: string; decimals?: number } = {}) => {
    const { currency = settings.currency, locale = settings.locale, decimals = 0 } = opts;
    return new Intl.NumberFormat(locale, { style: "currency", currency,
      minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  };
  ```
- **Dates and times:** one app-wide format per context, produced by `formatDate` / `formatTime` / `formatDateTime` using the user's timezone and locale from settings (default `Africa/Lagos`, `en-NG`). Recommended contexts: lists = short, detail = medium, transactions = date + time. The 12h/24h clock follows the user's preference. Never hard-code a date string or a time.
- **Capitalization:** sentence case for labels/buttons ("Add customer"); the current UI uses Title Case ("Add Customers") — choose one and apply everywhere (recommended: Title Case for nav & primary CTAs, sentence case for helper text).
- **Product names:** proper case ("iPhone 12", not "Iphone 12"; "Samsung Galaxy S22").
- **Truncation:** single-line `truncate` with tooltip for names > 28 chars; two-line clamp for descriptions.
- **Tone:** plain, friendly, specific. "Click on the button to add a customer" → "Add your first customer to start tracking installments."
- **Placeholders/helper copy:** never ship lorem or copy from another product (see §14).

---

## 13. Frontend Architecture Recommendations

```
src/
  app/ (or pages/)
    (auth)/login, register
    (vendor)/
      layout.tsx            # AppShell: Sidebar + Topbar
      dashboard/page.tsx
      customers/page.tsx
      customers/[id]/page.tsx
      products/page.tsx
      products/new/page.tsx
      products/packages/new/page.tsx
      installments/page.tsx
      installments/[id]/page.tsx
      payments/page.tsx
      settings/page.tsx
      support/page.tsx
  components/
    ui/          # Button, Input, Select, Checkbox, Badge, Avatar, Card, Modal, Drawer, Toast, Tabs, Skeleton
    layout/      # Sidebar, Topbar, PageHeader, Breadcrumbs, Stepper
    data/        # DataTable, Pagination, FilterBar, StatCard, ProgressBar, SegmentedProgress, EmptyState
    domain/      # PlanCard, TransactionRow, WalletBanner, ProductSelectItem, ReceiptDrawer
  lib/           # formatters (money/date), api client, zod schemas
  styles/        # globals.css (tokens), tailwind config
```

- **Stack suggestion:** Next.js + TypeScript + Tailwind + shadcn/ui (override theme with tokens above) + TanStack Table/Query + React Hook Form + Zod.
- Build UI primitives first, then compose domain components; no one-off colors, spacing or radii outside tokens.
- Keep list pages server-paginated (`page`, `limit`, `q`, `sort`, filters in URL query params so views are shareable).

### Global CSS variables (shadcn-style mapping)
```css
:root {
  --background: #F3F4F6;
  --foreground: #111827;
  --card: #FFFFFF;
  --muted: #F9FAFB;
  --muted-foreground: #6B7280;
  --border: #E5E7EB;
  --input: #E5E7EB;
  --primary: #16A34A;
  --primary-foreground: #FFFFFF;
  --ring: #16A34A;
  --destructive: #DC2626;
  --radius: 0.625rem; /* 10px */
}
```

---

## 14. Standing Fix Directives & Consistency Rules

This section replaces a one-off bug list. Each directive is a **rule that applies to every current and future screen**. The "Seen in" column records where the problem first appeared in the reference screens (as evidence only; never copy those values).

### 14.1 Directives

| ID | Directive | Seen in (examples) | How to verify |
|---|---|---|---|
| **F1 Spelling and copy** | Proofread all labels, headers, buttons and helper text. Use the central strings/i18n file; no inline typo-prone strings. | Table column "Acrion" instead of "Action" | Spell-check pass on copy files; review every column header and button |
| **F2 Currency glyph** | The currency symbol must render everywhere. Font stack must fall back to a font containing ₦; use `formatMoney` only. | `Next due: ▯25,000` (missing glyph) | Visual check of ₦ on each screen in Chrome, Safari, Android, iOS |
| **F3 One currency representation** | Always the configured symbol (₦); never the letter `N`, or mixed styles on the same screen. | `N120,000` / `N450,000` next to `₦720,000` | Search the codebase for hand-typed `N`/`₦` before numbers |
| **F4 Unique, backend-issued IDs** | Plan IDs, receipt numbers and references are unique per record and come from the backend. Use them as React keys. | Two plans with the same plan number; same reference on every transaction | Fixtures use distinct IDs; no duplicate-key warnings |
| **F5 Reconcile plan math** | For every plan: `total = paid + left`; `% = paid ÷ total`; progress segments reflect paid ÷ total installments; "target" equals what its label claims. | A package card whose total, paid, left and target don't add up | Unit-test the plan selectors; assert invariants on every fixture |
| **F6 Reconcile aggregates** | Any KPI/header number must equal the sum/count of the rows it summarizes. Customer KPIs equal sums over their plans; dashboard KPIs equal sums over all customers. | Customer "Active Plans = 1" with two active plans listed; dashboard vs customer figures that cannot both be right | Selector tests: aggregate = Σ children; E2E check on a seeded account |
| **F7 Metric type matches its label** | Money labels show money, count labels show counts, rate labels show %. Use a typed KPI component (`type: "money" \| "count" \| "percent"`). | "Outstanding Balance" displaying a bare number | KPI component accepts `type` and formats accordingly; Storybook covers each type |
| **F8 Pagination consistency** | Page count, row count and total badge must agree: `pages = ceil(total ÷ pageSize)`. Never hard-code "of 10". Disable Previous/Next at bounds. | "All Customers 16" with "Page 1 of 10" | Pagination meta comes from the API; test with 0, 1, pageSize, pageSize+1 items |
| **F9 Counts in links/captions** | "View all (N)", "Showing N entries", "+5" overflow chips and count pills come from real data. | "Showing 3 most recent entries / View all payments (4)" not tied to data | Derive from `items.length` and `totalCount` |
| **F10 Realistic, unique fixtures** | Seed/fixture data must be varied and valid: no duplicate rows, no identical timestamps/refs/amounts across records, no same product repeated for different items. | Repeated customer row; identical product ×4; identical date/amount/ref on all transactions | Fixture generator with faker; lint for duplicate keys |
| **F11 Context-correct copy** | Placeholders, step descriptions, helper and empty-state text must describe the current screen and domain (installments, vendors, products). No text carried over from other products/templates. | Product search placeholder "Search name or phone"; wizard steps "Start collaborating with your team", "Share posts to your social accounts" | Every placeholder and step description reviewed against screen purpose |
| **F12 Header reflects location** | Top bar title = current section (or a constant app name); never a stale label. Breadcrumb/page title must agree with the sidebar's active item. | Top bar says "Dashboard" on Customers, Products and Create Package | Route-driven title; test per route |
| **F13 Single active/hover/focus style** | One definition for nav active, buttons, links, focus rings, hover rows, selected items. Colors from tokens only. | Slightly different greens for the active nav and CTA across screens | Grep for hex literals outside tokens; visual regression |
| **F14 No off-palette colors** | Surfaces, table headers, badges and charts use only token colors. Any new color must be added to §2.2 first. | Peach table header on Recent payments | Stylelint/Tailwind rule: no arbitrary color values |
| **F15 Canonical names and casing** | Product, brand and model names come from the catalog data, not hand-typed; render exactly as stored. Normalize casing at data entry. | "Iphone 12" vs correct "iPhone 12" | Catalog validation on create/edit; no manual casing in UI |
| **F16 One date/time system** | All dates/times use the formatters in §12; no mixing of long month, short month and numeric styles in the same context. | `21 July 2026`, `Sep 30, 2026`, `26/07/2026` on different screens | Grep for `toLocaleDateString` / manual formats outside the helper |
| **F17 Casing convention** | One casing rule: Title Case for nav, page titles and primary buttons; sentence case for helper text, descriptions, placeholders, empty states. Button labels use the singular action ("Add Customer") unless adding several. | "Add Customers" for a single action | Copy review |
| **F18 Semantic color for money** | Incoming = green with `+`, outgoing/payouts = neutral with `−`, overdue/failed = red. Never rely on color alone. | All transaction amounts in the same black | `MoneyAmount` component with `direction` prop |
| **F19 Semantic progress colors** | Progress/threshold colors come from config bands (e.g. low = red, mid = amber, high = green) with text labels. | Collection rate always amber | `getRateTone(rate, thresholds)` helper |
| **F20 Overflow and truncation** | Every text cell has a defined behavior: truncate + tooltip for names, clamp for descriptions, no-wrap for amounts. | Two-line product cell with "+5" overflow | Storybook "long data" stories for each component |
| **F21 Selection logic** | Selecting items updates summary, totals and next-step enabled state live; Next is disabled until the minimum is met. | "2 Products Selected / Product Total" summary | Component test: toggle/qty change → totals recompute |
| **F22 Contrast and accessibility** | Small green text on white uses `primary-700`; white-on-green text is ≥14px and 600 weight; status never color-only. | Green "View" links, top bar title on `#16A34A` | Axe/Lighthouse in CI |
| **F23 No duplicate CTAs** | One primary action per context. Empty-state and header must not both show the same CTA unless one is conditional. Choose one rule app-wide. | "Add Customers" in header and in the empty state | Review each list screen's header vs empty state |
| **F24 Entity consistency** | Customer list and detail must agree (same customer, same plans, same outstanding). Navigation from a row lands on the matching entity. | List shows one plan per customer; detail shows several | Cross-view test on seeded data |

### 14.2 Audit Procedure for Every New Screen

Before building any new screen or design:

1. **Content pass:** check spelling, casing, placeholders and helper text against F1, F11, F15, F17.
2. **Data pass:** list every number, date, ID and count on the screen; tag each as *source value* or *derived value*; confirm formulas in §1.1 and invariants F5–F9. Treat any hard-coded-looking value as dynamic (D1–D12).
3. **Visual pass:** colors, radius, spacing, type scale and icons against §2 and F13, F14, F18, F19.
4. **State pass:** loading, empty, error, no-results, long-data, zero/null, permissions (§8).
5. **Accessibility pass:** contrast, focus, keyboard, labels (§11, F22).
6. **Log findings** in `docs/design-findings.md` using the template below, and resolve them before development or record a documented deviation.

```md
### [YYYY-MM-DD] <Screen name>
| ID | Directive | Finding | Severity (blocker/major/minor) | Fix / Owner | Status |
```

**Resolution rules**
- If a screen conflicts with this document, **this document wins**; update the design, not the code.
- If this document is silent, decide once, then **add the rule here** (new F-number or component spec) and record it in the Changelog (§17).
- If a conflict can't be fixed in this release, log it as a known deviation with an owner and target date.
- Never copy sample values from mockups into code, tests or seed data without regenerating them (D1, F10).

---

## 15. Build Checklist for Any New Page

- [ ] Uses `AppShell` (sidebar + top bar), correct active nav item
- [ ] Page header: title, subtitle, primary action (right)
- [ ] Breadcrumb on detail pages; back button on wizards
- [ ] Only tokens used (color, spacing, radius, type)
- [ ] Geist font loaded; ₦ renders correctly
- [ ] Loading skeleton, empty, error, no-results states implemented
- [ ] Table pattern (toolbar → header → rows → pagination) reused, not reinvented
- [ ] Form validation (Zod) with inline errors and disabled-while-submitting
- [ ] Responsive at 360 / 768 / 1024 / 1440
- [ ] Keyboard navigable, focus ring visible, ARIA labels present
- [ ] Money/date formatters used (no manual string concat)
- [ ] Success/error toasts with specific copy
- [ ] Destructive actions have confirm dialog
- [ ] No hard-coded dates, times, amounts, counts, names or IDs; all via props/formatters (D1–D12)
- [ ] Derived values computed from source data and reconciled (F5–F9)
- [ ] Null/zero/long-data cases handled and visible in Storybook (D8, D9, F20)
- [ ] Audit procedure (§14.2) completed and findings logged

---

## 16. Quick Reference

```
Font ............ Geist (400/500/600/700)
Primary ......... #16A34A   hover #15803D   soft #F0FDF4 / #DCFCE7
Accent .......... #FACC15 (amber) · icon bg #FEF3C7
Page bg ......... #F3F4F6   Card #FFFFFF   Border #E5E7EB
Text ............ #111827 / #6B7280
Sidebar ......... 240px, white     Top bar ... 64px, #16A34A
Card radius ..... 16–24px         Button/Input radius ... 10px
Input/Button h .. 48px (md 40, sm 32)
Row height ...... 72px (96 for two-line)
Spacing ......... 4-pt grid; page padding 32; card padding 24–32
```

---

## 17. Changelog

| Date | Change |
|---|---|
| Initial | First version from Dashboard, Customers and Create Package screens |
| Revision 2 | Added §1.1 Dynamic Data Principle; replaced one-off bug list with Standing Fix Directives (§14) and a repeatable audit procedure; money/date formatting made config-driven |
