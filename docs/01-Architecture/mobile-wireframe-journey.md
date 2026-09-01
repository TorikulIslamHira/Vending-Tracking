---
id: arch-wireframe-journey-02
type: architecture
dependencies: ["[[frontend-ui-guidelines.md]]"]
impacts: ["apps/web/src/app/(mobile)"]
---

# 📱 Mobile-First User Journey & Wireframe Plan

> **AI Directive:** This document dictates the exact page-by-page flow and component structure based on the provided wireframes. Implement this structure using Next.js App Router and shadcn/ui. Apply the Bee Novelty theme (Yellow/Sky Blue) defined in `frontend-ui-guidelines.md`.

## 1. Authentication Flow
- **Screen 1: Login**
  - UI: Logo placeholder, Email/Phone input, Password input, Full-width Solid Login Button, "Forgot password?" link.
- **Screen 12: Forgot Password**
  - UI: Email/Phone input, "Send Reset Link" Button, "Back to login" link.

## 2. Dashboard & Overview
- **Screen 13: Empty State (First-time)**
  - UI: Illustration placeholder, "No locations yet" text, "+ Add Your First Location" primary button.
- **Screen 2: Main Dashboard**
  - UI: Metric Cards (Total Collected, Total Restocked).
  - UI: Custom Progress Bar (Shop Cut vs Business Cut).
  - UI: "Missed Visits" alert banner.
  - UI: "Machines Needing Attention" checklist (List with checkboxes for easy selection/action).
  - Navigation: Sticky Bottom Nav Bar (Dashboard, Locations, Reports, More).

## 3. Hierarchy & Fleet Management
- **Screen 3: Locations**
  - UI: Search bar, List of Locations (Name, store count, Edit button), "+ Add Location" button.
- **Screen 4: Stores (Inside a Location)**
  - UI: Back button to Locations. List of Stores (Name, Split %, Edit % button), "+ Add Store" button.
- **Screen 5: Machines (Inside a Store)**
  - UI: Back button to Stores. Search machines, Filters (All Stores, Status).
  - UI: List of machines with select checkboxes (ID, Category, Status icon).
  - UI: "+ Add Machine" button. Floating "Generate QR" button at the bottom for selected machines.
- **Screen 6: Register New Machine**
  - UI: Store Dropdown, Machine ID input, Name/Category input, Type/Size input, "Register & Generate QR" button.
- **Screen 7: QR Code Generated**
  - UI: Large QR Code display, Machine Name & Location details.
  - UI: Buttons - "Download QR", "Print QR", "Done" (Primary).

## 4. Operations & User Management
- **Screen 8: Restocker Assignment**
  - UI: List of Restockers (Name, Role Badge, currently assigned machines). Dropdown/Button to "Assign machine".
- **Screen 10: User Management**
  - UI: List of Users (Name, Role Badge, Email, Edit/Deactivate links). "+ Add User" button.

## 5. Analytics & Settings
- **Screen 9: Reports & Reconciliation**
  - UI: Date range pickers (From/To). Filters (Locations, Stores, Machines).
  - UI: Data Table (Cash, Shop Cut, Business Cut). Full-width "Export CSV" button.
- **Screen 11: Settings**
  - UI: General section (Currency dropdown, Default split % dropdown).
  - UI: Notifications section (Toggles for Low stock, Offline alerts, Daily summary).
  - UI: "Log Out" button.
