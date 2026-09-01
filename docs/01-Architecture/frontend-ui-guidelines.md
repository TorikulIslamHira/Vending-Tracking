---
id: arch-frontend-ui-01
type: architecture
dependencies: ["[[multi-tenant-saas.md]]"]
impacts: ["apps/web/src/app", "apps/web/src/components", "apps/web/src/config"]
---

# 🎨 Frontend UI/UX Architecture & Guidelines

> **AI Directive:** Always use Tailwind CSS and shadcn/ui. The application must support multi-tenant theming via CSS variables. Never hardcode absolute hex colors for primary/secondary elements; always use the CSS variables so tenants can customize them.

## 1. Default Tenant Theme (Bee Novelty)
The default theme is inspired by the Bee Novelty logo (Yellow & Sky Blue).

- **Primary (Vibrant Yellow):** `--primary: 48 96% 53%;` (Tailwind: `bg-primary` / #FACC15). Used for primary buttons, active tabs, and main call-to-actions.
- **Secondary/Accent (Sky Blue):** `--secondary: 217.2 91.2% 59.8%;` (Tailwind: `bg-secondary` / #3B82F6). Used for badges, informational icons, and secondary buttons.
- **Background:** `--background: 210 40% 98%;` (Light grayish-white #F9FAFB).
- **Text (Charcoal Black):** `--foreground: 222.2 84% 4.9%;` (Dark gray/black for high readability).

## 2. Core User Journeys (Based on Wireframes)

### A. Admin / Manager Flow (Desktop-Optimized)
- **Login:** Simple email/password entry.
- **Dashboard (Overview):** Total balance, active machines, and quick stats.
- **Machine Management:** Data table of all machines with status badges (Online/Offline) and a "Register Machine" modal.
- **Inventory Logs:** Color-coded audit trail (Standard vs. Reverse entries).
- **Packet Config:** Admin sets up predefined packets (Name, Qty, Price).

### B. Field Agent Flow (Strictly Mobile-First)
- **App Layout:** No complex sidebars. Use a simplified top header or bottom navigation bar. Large touch targets (min 44px).
- **QR Scanner:** Primary action upon login. Agent scans the Machine QR to enter the operation screen.
- **Machine Operation (3 Tabs):**
  1. **Restock:** Dropdown for Packet Type, Number input, and "Manual Entry" toggle.
  2. **Cash Drop:** Input field for collected physical cash.
  3. **Reverse / Audit:** List of today's actions with a "Reverse Entry" button for mistakes (requires mandatory remarks).

## 3. UI Component Rules
- **Modals/Sheets:** Use `Dialog` or `Sheet` from shadcn/ui for creating records (Machines, Packets) to avoid navigating away from the current context.
- **Forms:** Use `react-hook-form` + `zod` for all inputs. Display clear red error text below invalid fields.
- **Feedback:** Use `Toast` notifications for all success and error actions.
