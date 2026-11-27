# HR Management System

This project is a full-stack HR management prototype built with NestJS, TypeORM, MySQL, and React + Vite.

## Features

- Employee and department overview
- Employee CRUD with safe deactivation
- Leave request form and approval flow
- Leave request CRUD for pending requests
- MySQL-backed leave balance tracking and approval-time deduction
- Private onboarding document uploads and HR verification
- Role-based HR manager and department head access
- Bcrypt password storage, HttpOnly cookie sessions, forced password changes, and HR password resets
- Audit records for password and document security events
- JWT login for Postman/API clients and HttpOnly cookie sessions for the React app

## Project structure

- `backend/` — NestJS API
- `frontend/` — React app
- `docs/` — database schema and project documentation
- `postman/` — API test collection

## Run locally

1. Start MySQL from the XAMPP control panel, then create the database:
   ```sql
   CREATE DATABASE hr_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Copy `backend/.env.example` to `backend/.env`, set your MySQL connection details, and replace `JWT_SECRET` with a random value of at least 32 characters. Generate one with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
4. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```
5. Start backend:
   ```bash
   npm run start:dev
   ```
   On startup, the backend creates or migrates the HR tables and inserts demonstration records if they are not already present. Existing records and passwords are not overwritten. Existing demo accounts are required to change their password the first time after the password migration.
6. Start frontend:
   ```bash
   npm run dev -- --host 0.0.0.0
   ```

The frontend is expected to communicate with the backend on port 3001. Use `localhost` for both frontend and backend during local development so the session cookie is shared correctly. Set `FRONTEND_ORIGINS` and `API_ORIGIN` in `backend/.env` to match your local frontend URL. Use a unique `JWT_SECRET` and a private, non-public `UPLOAD_DIR` for deployment.

The backend maps all HR tables with TypeORM entities. The Employee and Leave Request CRUD paths use TypeORM repositories; startup schema creation and demo seeding use parameterized TypeORM `DataSource` queries. The reproducible database schema is available in [`docs/hr_system.sql`](./docs/hr_system.sql).

## Coursework deliverables

- Technical-documentation source: [`docs/Technical-Documentation.md`](./docs/Technical-Documentation.md). Add the video link and Postman/phpMyAdmin screenshots, then export the final PDF.
- GitHub repository: https://github.com/TumampilJusitneBSIT2E/HR-Management-System (private; grant the course reviewer access if needed).
- Postman collection: [`postman/HR-System.postman_collection.json`](./postman/HR-System.postman_collection.json). Set the HR password variable before use; state-changing calls include the configured Origin.
- Presentation plan: [`docs/Presentation-Outline.md`](./docs/Presentation-Outline.md).
- Narrated video script: [`docs/Video-Demo-Script.md`](./docs/Video-Demo-Script.md).
- Database schema: [`docs/hr_system.sql`](./docs/hr_system.sql). Demo rows are seeded by backend startup.

The documentation PDF draft is available at `docs/Technical-Documentation.pdf`; add the final screenshots and video link before submitting it. The live database export and narrated video still need to be completed.

## Authentication and demo accounts

The API requires a signed-in employee for HR data, restricts employee management and document verification to HR managers, and checks that an approver is assigned to the approval before recording a decision. Passwords are stored as bcrypt hashes; the browser no longer provides an employee/role switcher.

Leave requests are checked against the employee's yearly balance, outstanding pending requests, required uploaded supporting documents, and overlapping pending or approved requests. Requests must stay within one calendar year. Duration counts weekdays only (Monday-Friday); public holidays are not excluded.

Set private values for `DEMO_HR_PASSWORD`, `DEMO_EMPLOYEE_PASSWORD`, and `DEMO_DEPARTMENT_HEAD_PASSWORD` in `backend/.env` when seeding a fresh database. Each must be at least 12 characters and contain lower/upper case, a number, and a symbol. These variables are only used to initialize accounts whose password hash is still null; existing password hashes are never overwritten. Keep `backend/.env` local and do not submit its values.

The document screen accepts PDF, JPEG, and PNG files up to 5 MB. Files are stored outside static serving and can only be downloaded by their owner or an HR manager. Leave requests can refer to an uploaded document belonging to the signed-in employee. Password reset produces a one-time temporary password that must be changed at next sign-in. These safeguards are a coursework baseline, not a substitute for a production security assessment; use HTTPS, protect database and upload backups, and keep secrets out of source control before any real deployment.

## Design inspiration

The starter follows the HR leave and onboarding workflow used in the provided React seed data and ERD, adapted into a real backend/frontend architecture.
