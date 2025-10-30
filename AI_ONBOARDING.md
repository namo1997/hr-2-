# HR System — AI Onboarding Guide

This document helps a new AI contributor continue work on the project without losing context.

## Project Snapshot

- Framework: Next.js 16 (App Router, client components), TypeScript, TailwindCSS 4.
- Backend: Prisma ORM with SQLite (`prisma/dev.db`).
- Auth/workflow features scaffolded but not fully wired; focus areas right now are employee/shift management and data import.
- Package scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`.

## Local Setup

1. Install dependencies with `npm install --legacy-peer-deps`.
2. Ensure the Prisma schema is in sync: `npx prisma db push` (already generates `prisma/dev.db`).
3. Start the dev server: `npm run dev` (listens on `http://localhost:3000`).

## Data Model Highlights

- `Zone`, `Branch`, `Department` tables were added; each generates system codes (`ZONE-xxx`, `BRN-xxx`, `DEP-xxx`).
- `Employee` now stores foreign keys (`zoneId`, `branchId`, `departmentId`) in addition to legacy `department` text.
- `ApprovalAssignment` maps approvers to roles (EXECUTIVE, MANAGER, DEPARTMENT_HEAD) and enforces hierarchy constraints.
- `Shift` now represents a weekly template with related `ShiftDayConfig`, `ShiftBreakRule` (DURATION vs FIXED), and `ShiftScopeAssignment` for zone/branch/department rules.
- Prisma client helper lives in `lib/prisma.ts` using a `globalThis` singleton.

## API Endpoints

All routes under `app/api/...` use REST semantics and return JSON.

- `GET /api/zones` — list zones (includes branches/departments).
- `POST /api/zones` — create zone; auto-codes sequentially.
- `PUT /api/zones/[id]`, `DELETE /api/zones/[id]` — update/delete with cascading cleanup.
- Similar CRUD exists for `branches` and `departments`.
- `GET /api/employees` — list employees with populated zone/branch/department.
- `POST /api/employees`, `PUT /api/employees/[id]`, `DELETE /api/employees/[id]`.
- `POST /api/employees/import` — accepts CSV (headers in Thai) to bulk create/update employees. Validates that referenced zone/branch/department codes exist and match hierarchy.
- `GET /api/approval-assignments` — fetch approval hierarchy.
- `POST /api/approval-assignments` — create/update approver assignments per role (with validation that employees belong to the selected branch/department).
- `DELETE /api/approval-assignments/[id]` — remove an assignment.
- `GET /api/shifts` — return shift templates with day configs, break rules, and scope assignments.
- `POST /api/shifts` — create a new shift template (validates schedule + scope).
- `PUT /api/shifts/[id]`, `DELETE /api/shifts/[id]` — update or remove existing templates.
- `POST /api/import` — parse fingerprint `.dat` logs or CSV previews for validation (currently returns summary/sample only).
- `GET /api/attendance` — fetch processed attendance records with optional filters (date range, department, keyword).

## Frontend Flow (app/employees/page.tsx)

1. Loads zones/branches/departments/employees from APIs on mount.
2. Step-by-step UI:
   - Step 1: Create zones.
   - Step 2: Assign branches to zones.
   - Step 3: Assign departments to branches.
   - Step 4: Add employees via form or upload CSV (`+ เพิ่มไฟล์พนักงาน`).
3. CSV template is stored at `public/templates/employee-import-template.csv` and linked in the UI/README.
4. New approval hierarchy section (Step 4) lets admins configure executives, managers per branch, and department heads per branch+department, backed by the API above.
5. Shift management page consumes `/api/shifts` to configure weekly schedules (per-day start/end, flexible or fixed breaks) and assign templates to employees by zone/branch/department.
6. Import page (`/import`) uploads fingerprint logs (`.dat`) or CSV files, parses them via `/api/import`, and shows summaries/sample rows for review.
7. Attendance page (`/attendance`) queries `/api/attendance` to summarise and list processed time records with filtering and status tabs.

## Known Issues / TODO

Lint (`npm run lint`) currently fails because of pre-existing issues outside the employee module:

- `app/import/page.tsx`: escape quotes (`react/no-unescaped-entities`).
- `app/shifts/page.tsx`: replace `Date.now()` in render path; unused event params.
- `lib/csv-parser.ts`: replace `any` with explicit types.
- Several unused variables warnings in other components.

Plan to clean these up before shipping or enabling CI.

## Testing Suggestions

- Manual: run `npm run dev`, walk through zone → branch → department → employee flows, test CSV upload (both success and validation failures).
- Automated: consider adding Vitest/Playwright later; none currently configured.

## Useful Tips

- Use `fetch` with JSON body for CRUD; CSV import must send `FormData`.
- All new codes are generated server-side; avoid generating them on the client.
- Keep Thai/English labeling consistent; user-facing strings on employees page are Thai.
- When modifying Prisma schema, re-run `npx prisma db push`.
- Reminder: there is an external Numbers file `employee-import-template 2.numbers`; CSV template is the canonical source.

Feel free to update this guide as workflows evolve.
