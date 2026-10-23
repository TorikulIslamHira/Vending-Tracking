# UI Unification Audit — Phase 1 (Read-Only)

Branch: `refactor/unify-admin-ui`. This document is findings only — no code changed.

## 0. Headline finding

Both route groups already share the **same component primitives and visual
language** (`Card`, `Button`, `Input`, `Dialog`, `Drawer`, `Tabs`,
`DropdownMenu`, `Switch`, `Textarea` from `@/components/ui`; same
`rounded-2xl`/`rounded-xl` card aesthetic; same semantic color tokens —
`primary`/`secondary`/`muted`/`rose`/`emerald`/`amber`). There are **not**
two different design systems at the component level.

The real split is structural, and it is more specific than "field-agent
style vs. admin style":

- **Every page in the app, in both route groups, is a single mobile-width
  column** (`max-w-md mx-auto`), even on a 1920px desktop monitor. There is
  no desktop layout anywhere in the live app — Dashboard, Reports, User
  Management, everything renders as a centered phone-width card on desktop
  too.
- An unused, never-imported desktop sidebar shell already exists in the
  repo: `apps/web/src/components/layout/{AdminLayout,Sidebar,Header}.tsx`.
  Zero files import `AdminLayout` or `Sidebar` or `Header` outside their own
  definitions. This looks like an abandoned earlier attempt at exactly the
  unification this task is asking for. `Sidebar.tsx`'s nav list (Overview,
  Vending Machines, Packet Master, Inventory Logs, Cash Tracking, Settings)
  is also stale — it doesn't match current routes (no Stores, no Users, no
  Reports, no Assignments, no Audit Log, and links to `/` and `/machines`
  which aren't current admin routes).
- `apps/web/src/components/ui/sheet.tsx` (a slide-over/drawer-from-side
  primitive, Radix-based) also exists and is **never imported anywhere**.
  It is a ready-made primitive for a mobile hamburger drawer, just unused.
- The thing that actually visually distinguishes the two groups today is:
  (a) which bottom nav wraps the page and what's in it, and (b) a stricter
  3-tab vs 4-tab nav plus RBAC redirects — not spacing, color, or component
  choice.

## 1. Route / Layout Inventory

27 files total. Root: `layout.tsx`, `page.tsx` (redirects to `/login`). Two
route groups, no `loading.tsx`/`error.tsx`/`not-found.tsx` anywhere.

| Path | Layout | Built for | Shared components used |
|---|---|---|---|
| `(agent)/scan` | `(agent)/layout.tsx` | Field Agent (+Admin "Generate" tab) | Card, Button, Input, Tabs(impl. via buttons), MachineScanner |
| `(agent)/history` | `(agent)/layout.tsx` | Field Agent (+Admin cross-link) | Card, Button |
| `(agent)/profile` | `(agent)/layout.tsx` | Field Agent | Card, Button |
| `(agent)/machine/[machineId]` | `(agent)/layout.tsx` | Field Agent (Admin reaches it too) | Card, Tabs, Dialog, Button, Input, Textarea |
| `(agent)/browse` | `(agent)/layout.tsx` | Field Agent + Admin (fleet directory) | Card, Button, Input |
| `(agent)/store/[storeId]` | `(agent)/layout.tsx` | Field Agent (QR landing → machine picker) | Button |
| `(mobile)/login`, `/forgot-password` | `(mobile)/layout.tsx` | Public | Button, Input |
| `(mobile)/dashboard` | `(mobile)/layout.tsx` | Admin | Card, Button, MachineScanner |
| `(mobile)/stores`, `/stores/[storeId]`, `/stores/[storeId]/qr`, `/stores/owners` | `(mobile)/layout.tsx` | Admin | Card, Button, Input, Drawer, Dialog |
| `(mobile)/machines`, `/machines/register`, `/machines/[machineId]/qr` (redirect stub) | `(mobile)/layout.tsx` | Admin | Card, Button, Input, Drawer |
| `(mobile)/packets` | `(mobile)/layout.tsx` | Admin | Card, Button, Input, Drawer |
| `(mobile)/cash`, `/inventory-logs` | `(mobile)/layout.tsx` | Admin | Card, Button, Input, Drawer, Textarea |
| `(mobile)/reports` | `(mobile)/layout.tsx` | Admin (+ PRESENTATION, scoped) | Card, Button, Input, Dialog, DropdownMenu |
| `(mobile)/settings` | `(mobile)/layout.tsx` | Admin | Button |
| `(mobile)/users` | `(mobile)/layout.tsx` | Admin | Card, Button, Input, Drawer, Switch |
| `(mobile)/assignments` | `(mobile)/layout.tsx` | Admin | Card, Button, Drawer |
| `(mobile)/audit-log` | `(mobile)/layout.tsx` | Admin (root-admin only) | Card |

RBAC enforcement is at `middleware.ts` (edge, `ADMIN_ONLY_PREFIXES` list)
plus a duplicate client-side guard in `(mobile)/layout.tsx`'s effect. This
list is hand-maintained and **must be kept in sync by hand** with any route
rename during Phase 2 — it is not derived from the folder structure.

## 2. Field-agent-style vs admin-style — dimension by dimension

| Dimension | `(agent)` group | `(mobile)` group | Verdict |
|---|---|---|---|
| Outer shell | `max-w-md mx-auto`, flex column, `h-[100dvh] overflow-hidden` | Identical pattern | **Same** |
| Navigation | Bottom nav, always rendered, 3 items (Scan/History/Profile-or-AdminPortal), swaps to a 4-item admin set on `/machine/*` and `/browse` | Bottom nav, conditionally rendered (`showBottomNav`), 4 items (Dashboard/Stores/Reports/More) | Different nav *content*, same bottom-tab *mechanism* |
| Header | Simple `<header>` flex row, app logo + name + sign-in/user pill, not sticky, not per-page | No shared header — every page hand-rolls its own sticky header (`sticky top-0 z-20 -mx-4 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-card/95 backdrop-blur-md border-b border-border/40`), repeated ~15 times near-verbatim | **Real difference** — and a duplication problem on the `(mobile)` side |
| Page title pattern | Plain `<h1>` inline near a back button | Mix of: inline `<h1>` only (settings, users styling varies), `<h1>` inside a `rounded-2xl bg-muted/40` banner card (machines, packets, assignments, audit-log, cash), or both | Inconsistent even within `(mobile)` itself |
| Container width | `max-w-md` | `max-w-md` (same wrapper) but page content uses `px-4` vs `(agent)`'s `space-y-4` with no explicit `px-4` (padding comes from `<main className="p-4">` in `(agent)/layout.tsx` vs `(mobile)/layout.tsx`'s `<main>` has **no padding** — each `(mobile)` page re-adds its own `px-4 py-4`) | Subtle but real: padding ownership moved from layout → page in `(mobile)` |
| Spacing scale | `space-y-4`, card `p-3.5`/`p-4` | Same scale, same values | **Same** |
| Typography | `text-xs`/`text-sm`/`text-base`, `font-bold`/`font-black` | Same scale | **Same** |
| Color | Semantic tokens + occasional literal Tailwind colors (`rose-500`, `emerald-500`, `amber-500`, `blue-500`, `violet-500`) used ad hoc for status/role badges | Same ad hoc literal-color pattern | **Same** (see §7) |
| Buttons | shadcn `Button` variants (`default`, `outline`, `destructive`, `ghost`), plus many raw `<button>` tags with hand-rolled classes for pill/segment controls | Same mix | **Same** |
| Cards | shadcn `Card`/`CardContent` | Same | **Same** |
| Tables | None anywhere — every "table" is a list of Cards | Same | **Same** (no table component exists in the whole app) |
| Modals | shadcn `Dialog` for confirmations, `Drawer` (vaul) for forms | Same | **Same** |
| Empty states | Dashed-border card, centered icon + bold title + muted description (`browse`, `history`, `store/[storeId]`) | Mix: some pages copy the same dashed-border-card pattern (`audit-log`), others use a plain centered paragraph with no card/icon (`stores`, `machines`, `cash`, `inventory-logs`, `packets`) | Inconsistent, and **not even consistent within `(mobile)`** |
| Loading states | `animate-pulse` placeholder blocks, sized per-content, plus a few `Loader2` spinners | Same two patterns, same ad hoc sizing | **Same mechanism, no shared skeleton component** |
| Error states | No explicit error UI anywhere (queries silently fall back to mock/fallback data arrays, e.g. `fallbackMachines`, `fallbackCashLogs`, `fallbackPackets`, `fallbackLogs`) | Same | **Same gap** — worth flagging, out of scope to fix now |

## 3. Bottom nav render locations

1. `apps/web/src/app/(agent)/layout.tsx:182-206` — `<nav>` is **always**
   rendered (no conditional wrapper) inside the agent shell. Content swaps
   between `navItems` (Scan/History/Profile-or-AdminPortal) and
   `adminNavItems` (Dashboard/Stores/Reports/More) based on
   `showAdminNav = isAdmin && isAdminNavPage` (line 93), itself derived from
   `isAdmin` (line 55) and `isAdminNavPage = pathname.startsWith("/machine/") || pathname.startsWith("/browse")` (line 92).
2. `apps/web/src/app/(mobile)/layout.tsx:159-203` — `<nav>` is
   **conditionally** rendered, gated on `showBottomNav` (line 116-119):
   `!isAuthPage && user?.role !== "PRESENTATION" && bottomNavRoutes.some(...)`.

No other bottom-nav component exists; no third nav implementation found.

## 4. Role-based UI branches (file:line)

| File:Line | Condition | Effect |
|---|---|---|
| `middleware.ts:65` | `role === "ADMIN" ? "/dashboard" : isPresentation ? "/reports" : "/scan"` | Computes each role's home route |
| `middleware.ts:101-104` | `role !== "ADMIN" && ADMIN_ONLY_PREFIXES.some(...)` | Edge redirect off admin-only pages |
| `(agent)/layout.tsx:45-48` | `user?.role === "PRESENTATION"` | Bounces PRESENTATION to `/reports` |
| `(agent)/layout.tsx:55` | `isAdmin = user?.role === "ADMIN"` | Drives nav content below |
| `(agent)/layout.tsx:69-81` | `isAdmin ? "Admin Portal" item : "Profile" item` | 3rd tab swap |
| `(agent)/layout.tsx:92-93` | `isAdminNavPage`, `showAdminNav` | Nav-set swap on `/machine/*`, `/browse` |
| `(mobile)/layout.tsx:80-88` | `role === "ADMIN"` return; `PRESENTATION` → `/reports`; else → `/scan` | Client-side RBAC guard (duplicates middleware) |
| `(mobile)/layout.tsx:118` | `user?.role !== "PRESENTATION"` | Hides bottom nav entirely for PRESENTATION |
| `(agent)/history/page.tsx:58,98` | `isAdmin = user?.role === "ADMIN"` | Shows "View Full Ledger" cross-link only for Admin |
| `(agent)/scan/page.tsx:338,343,350-353,367` | `isAdmin` | Gates the Scan/Generate tab switcher UI |
| `(agent)/machine/[machineId]/page.tsx:94` | `isPresentation = user?.role === "PRESENTATION"` | Hides edit/resolve/pay buttons (UI-only; API also enforces 403) |
| `(mobile)/stores/page.tsx:59` | `isPresentation` | Hides Add/Edit/Delete store buttons |
| `(mobile)/stores/owners/page.tsx:35` | `isPresentation` | Hides Edit button |
| `(mobile)/reports/page.tsx:64` | `isPresentation` | Hides "View in Full Ledger" cross-link |
| `(mobile)/users/page.tsx:51,66-67,78,205-206,208,226,246,304,378,382` | `viewerIsPresentation`, `userRole` state, `isAdmin`/`isPresentation` per listed row | Hides mutation controls; role badge/label rendering; delete-permission toggle gated to root admin |
| `(mobile)/assignments/page.tsx:53` | `u.role === "FIELD_AGENT"` | Filters which users show as "restockers" |
| `(mobile)/settings/page.tsx:70,187` (`currentUserIsRoot`) | role/flag check | Shows role badge; gates Audit Log link to root admin |
| `(mobile)/audit-log/page.tsx:32-37` | `currentUserIsRoot` | Whole-page access gate (not route-level) |
| `hooks/useUsers.ts:27,60,95` | role union type | Type-level only, not a UI branch |
| `components/layout/Header.tsx:56` | `user?.role \|\| "FIELD_AGENT"` fallback | Dead code (component unused) — fallback literal is stale too |

None of these touch backend authorization — every one is a client-side
rendering decision layered on top of `middleware.ts` (edge) and (per prior
session knowledge) server-side checks in the API. Phase 2 can remove the
*differentiated layout/nav* branches (items 2, 3, 4 above — the ones that
change which shell/nav a role sees) once there's one shell for everyone,
but the *PRESENTATION-is-read-only* branches (items 8-13) are a different,
unrelated concern (a demo/read-only account type) and must stay — removing
them would let a read-only demo account see mutation buttons that then 403.
**The task's hard constraint not to touch role/permission logic means only
the nav/shell-swap branches are in scope for Phase 2 deletion.**

## 5. Duplicate / near-duplicate components

- **Sticky mobile header markup**, copy-pasted near-verbatim across ~15
  `(mobile)` pages (`stores`, `stores/[storeId]`, `stores/[storeId]/qr`,
  `stores/owners`, `machines`, `machines/register`, `packets`, `cash`,
  `inventory-logs`, `reports`, `settings`, `users`, `assignments`,
  `audit-log`, `dashboard`). Same exact class string:
  `sticky top-0 z-20 -mx-4 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-card/95 backdrop-blur-md border-b border-border/40`.
  Never extracted into a shared `PageHeader` component.
- **QR download/print flow**, duplicated almost line-for-line in three
  places: `(agent)/scan/page.tsx`'s `GenerateModeView` (machine QR),
  `(mobile)/stores/[storeId]/qr/page.tsx` (store QR), and the thin redirect
  stub `(mobile)/machines/[machineId]/qr/page.tsx`. The canvas-based PNG
  fallback + SVG-blob download logic is copied whole between the first two.
- **Empty-state card**: two competing patterns (dashed-border + icon vs.
  plain centered text) — see §2 table row "Empty states".
- **Loading skeleton blocks**: every list page hand-rolls its own
  `animate-pulse` div sizes instead of sharing one `Skeleton` component.
- **Store/machine picker list-item card**: `(agent)/browse`,
  `(agent)/store/[storeId]`, `(mobile)/stores`, `(mobile)/stores/[storeId]`
  each reimplement a near-identical "icon + mono serial + status pill +
  chevron" row.
- **Dead shell components**: `AdminLayout.tsx`, `Sidebar.tsx`, `Header.tsx`,
  `sheet.tsx` — all zero-usage, candidates to either delete or repurpose
  (see §6 and the proposal below).
- **PDF report style objects** (`StoreOwnersPdfDocument.tsx`,
  `ReconciliationPdfDocument.tsx`, `MachineAuditPdfDocument.tsx`) all
  redefine the same header/footer/table style constants with the same hex
  values — not a UI-layer concern (react-pdf has its own styling model,
  can't consume Tailwind tokens) but worth a shared constants file someday.
  Out of scope for this task.

## 6. Mobile/responsive assessment + navigation proposal

**Current state:** there is no responsive behavior at all — both layouts
hard-code `max-w-md mx-auto` with no breakpoint logic, so a desktop user
gets a phone-width column centered in empty space. There is no sidebar in
the live app; `Sidebar.tsx` (`hidden md:flex`) exists but is never rendered
because nothing imports it.

**Capacitor/native constraints already handled correctly and that must be
preserved:**
- `h-[100dvh] overflow-hidden` on the outer shell + a single scrolling
  `<main>` — avoids the iOS fixed-position drift-on-restore bug (documented
  in both layouts' comments). Any replacement shell must keep this
  "nothing fixed/sticky except inside the one scroll container" discipline,
  or re-verify safe behavior if it changes.
- `pt-[calc(0.75rem+env(safe-area-inset-top))]` on headers and
  `pb-[calc(0.5rem+env(safe-area-inset-bottom))]` on the bottom nav — notch/
  home-indicator safe areas. A new header/nav must carry equivalent
  `env(safe-area-inset-*)` handling.
- Touch targets in the current bottom navs are ~48px (`min-h-[48px]` in
  `(mobile)/layout.tsx`, `py-1.5` + icon in `(agent)/layout.tsx` → roughly
  44-48px) — acceptable, should be matched or exceeded in any replacement.
- `vaul`'s `Drawer` is already configured with `repositionInputs={false}`
  specifically to not fight Capacitor's own keyboard-resize handling — this
  detail must survive if drawers are reused for a new mobile nav sheet.

**Proposed navigation**, reusing what already exists in the repo:
- **Desktop (`md:` and up):** a fixed sidebar — rehabilitate
  `components/layout/Sidebar.tsx`, but rewrite its `navItems` to match the
  real current route set (Dashboard, Stores, Machines, Packets, Cash,
  Reports, Users, Settings, + Assignments/Audit Log where role-gated) and
  drive `isActive` off real paths, not the stale `/`/`/machines` it has now.
- **Mobile/tablet:** a hamburger trigger in a shared header, opening
  `components/ui/sheet.tsx` (already in the repo, unused, Radix-based,
  side-anchored) as the nav drawer — avoids pulling in a second drawer
  implementation since `vaul`'s `Drawer` (bottom sheet) is already used
  app-wide for forms and should stay reserved for that role, not navigation.
- Bottom tab bar is removed entirely once this is in place — no bottom nav
  survives for any role.
- Capacitor: verify `sheet.tsx`'s overlay/portal doesn't reintroduce the
  fixed-position-drift problem the current layouts' comments warn about;
  test specifically on a background/restore cycle on-device, not just in a
  desktop browser resize.

## 7. Design inconsistencies

- Padding ownership is split: `(agent)/layout.tsx`'s `<main>` has `p-4`,
  while `(mobile)/layout.tsx`'s `<main>` has none and every page re-adds
  its own `px-4 py-4`. A unified shell should own this once, not per-page.
- Page-title presentation is inconsistent even within `(mobile)` alone —
  sometimes a plain `<h1>`, sometimes wrapped in a `rounded-2xl bg-muted/40`
  banner card (see §2).
- Empty-state and loading-skeleton patterns are copy-pasted ad hoc rather
  than shared (see §5).
- Literal Tailwind color utilities (`rose-500`, `emerald-500`, `amber-500`,
  `blue-500`, `violet-500`, `secondary`) are used directly for status/role
  badges throughout, rather than through semantic tokens — not necessarily
  wrong (badges need many distinct hues), but there's no documented mapping
  of which color means what (e.g. `rose` = danger/offline/reversal in some
  places, `amber` = cash/warning in others) — fine today, but will drift
  further if copy-pasted into more pages without a shared `Badge` variant.
- `#FACC15`/`#3B82F6` hardcoded hex literals in `config/theme.ts` are
  intentional tenant-theme defaults (overridable via env vars), not an
  inconsistency. Other hex literals found are all in react-pdf style
  objects or `<canvas>` `fillStyle` calls (QR download rendering) — both
  contexts that can't consume CSS variables, so not a real finding.

## 8. Accessibility/UX — brief list only

- Several icon-only buttons have no `aria-label` (rely on `title` attribute
  only, which isn't announced by all screen readers the same way `aria-label`
  is) — e.g. the QR "View QR Code" icon button in
  `(mobile)/stores/[storeId]/page.tsx`, the delete/edit icon buttons in
  `(mobile)/stores/page.tsx` and `(mobile)/machines/page.tsx`.
- Some inline icon-only controls are smaller than 44px (e.g. `h-7 w-7`
  "view QR" button in `(agent)/store/[storeId]/page.tsx`, `h-5 w-5` clear-
  search button in `(agent)/browse/page.tsx`) — below the usual 44px touch
  target guideline, though most primary actions are correctly ≥44-48px.
- App-wide `userScalable: false` / `maximumScale: 1` in the root
  `viewport` config (already known from prior session work, not new) is a
  standing WCAG 1.4.4 tradeoff — unchanged by this task, just noted for
  completeness.
- No visible focus-ring audit issue found on shadcn primitives (they ship
  `focus-visible` rings), but several hand-rolled `<button>` elements
  (status filter pills, tab switchers) rely only on `active:scale-95` with
  no explicit focus style — likely fine via browser default outline, not
  verified against the custom rounded shapes.
- No skip-link or landmark structure (`<nav>`/`<main>` exist, but no
  `aria-label` differentiating the two navs when both agent/admin nav sets
  share one `<nav>` element in `(agent)/layout.tsx`).
