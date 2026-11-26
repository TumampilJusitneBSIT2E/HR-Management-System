# HR System Video Demo Script

Target runtime: about 7 minutes 30 seconds. This is a narrated system walkthrough, not a claim that every API route was tested.

## Before recording

- Start XAMPP MySQL, then start the backend from `backend/` with `npm.cmd run start:dev`.
- Check `http://localhost:3001/hr/health` in Postman and make sure it returns `200 OK`.
- Keep the backend terminal open. The React site is optional for this API-focused demo.
- Arrange VS Code and Postman so the request name, status code, and relevant response are readable.
- Use a throwaway employee record for the recording. The employee Delete endpoint deactivates the record; it does not erase HR history.
- Do not show passwords, JWTs, `.env` values, or real employee details. The Create Employee request body contains an initial password; hide or crop that part of the screen while recording. Do not expose the login response body, which contains a token.
- If repeating CRUD after a practice run, run Create again to get a new employee ID, then use that same ID for Read, Update, and Deactivate.
- The missing-token check must have no `hr_session` cookie. Clear the cookie for `localhost` immediately before this check; do not send Login again before the check.

## Click-by-click recording setup

### Start and check the system

1. Open XAMPP Control Panel and click **Start** beside **MySQL**. Start **Apache** only if you plan to show phpMyAdmin.
2. In VS Code, choose **Terminal → New Terminal**.
3. Run `cd D:\xampp\htdocs\HR\backend`, then `npm.cmd run start:dev`.
4. Wait until NestJS reports that the application has started. Leave this terminal open.
5. The React site is optional for this API demonstration. If you want it on screen, open another terminal and run `cd D:\xampp\htdocs\HR\frontend`, then `npm.cmd run dev -- --host 0.0.0.0`.
6. In Postman, expand **HR Management System API**, select **Health**, and click **Send**. Confirm `200 OK`. If it fails, do not start recording; check the backend terminal and MySQL.

### Prepare Postman authentication

1. In Postman's **Collections** pane, expand **HR Management System API**, then expand **Authentication**.
2. For a live login, select **Login (JWT)** and click **Send** using your privately configured collection variables. Never show the Variables tab, password, login response body, or JWT on camera. Since login has already succeeded in the practice run, you can show the request name without sending it again.
3. Select **Current Profile (Bearer JWT)** and click **Send**. Show only the `200 OK` status; avoid filming personal fields in the response.
4. Immediately before the missing-auth test, click **Cookies** near the upper-right of the request. Choose `localhost`, remove the `hr_session` cookie, then close the cookie manager.
5. Expand **Authentication checks**, select **Protected route without token (expect 401)**, and click **Send**. Confirm `401 Unauthorized` and a passing test result. Do not send Login between clearing the cookie and this check, because Login creates the cookie again.
6. The no-token request disables Bearer auth; clearing the cookie removes the other authentication method. The remaining requests can still use the collection's saved Bearer token.

### Run the Employee CRUD sequence

1. In the collection pane, expand **Employee CRUD (HR Manager)**.
2. Select **Create Employee**. Keep the request-body area out of the recording or blur it during editing: it contains an initial demo password.
3. Click **Send**. Confirm success; the collection test saves the new employee ID.
4. Select **Read Employee**, click **Send**, and confirm it returns the same saved ID.
5. Select **Update Employee**, click **Send**, and confirm the position changes to `Updated Demo Analyst`.
6. Select **Delete Employee (deactivate)**, click **Send**, and confirm success. Explain that this deactivates the account while preserving HR history.
7. If repeating CRUD, run Create again first and then use that newly saved ID. If the timestamped email conflicts, wait briefly and retry Create with a new timestamp.

### Arrange the screen and open code

1. Maximize Postman and collapse unrelated collections. Keep the request name, URL, status, and safe response portion readable.
2. Enlarge the response panel if needed. Avoid showing passwords, JWTs, the collection Variables tab, `.env`, the Create request body, or real employee details.
3. In VS Code, use **Ctrl+P**, enter the filename, then press **Enter** to open a file. Use **Ctrl+F** within it to find a method or entity named in the recording steps below.
4. Do a practice run first. During recording, wait for each Postman response before selecting the next request.

## Recording script

### 0:00–0:40 — Introduction

**Show:** Project title in the README or this script, then the VS Code Explorer with the `backend`, `frontend`, `docs`, and `postman` folders.

**Say:**

> Hello. This is my Employee Onboarding and Leave Management System. It is a full-stack HR prototype for managing employee records and onboarding documents, as well as leave balances, leave requests, and approvals. I’ll demonstrate the running API and a complete employee CRUD workflow using Postman.

### 0:40–1:25 — Architecture and code structure

**Show/click:** In VS Code, press **Ctrl+P**, type `frontend/src/App.jsx`, and press **Enter**. Briefly show the React source. Repeat with `backend/src/hr/hr.controller.ts`, then `backend/src/database/entities.ts`. Show only the filename and relevant area.

**Say:**

> The React frontend provides the browser interface, while Postman can call the API directly. The backend is built with NestJS. A request reaches a controller, which calls the HR service. TypeORM repositories connect the business operations to MySQL. The entity file maps the HR tables and their relationships, including employees, departments, leave requests, and approvals.

### 1:25–1:55 — API health

**Show/click:** In Postman's left **Collections** pane, expand **HR Management System API** if needed, select **Health**, then click **Send**. Show `200 OK` and `{ "status": "ok" }`.

**Say:**

> First I check the health endpoint. The 200 response confirms that the API is running and responding.

### 1:55–3:05 — Authentication and access control

**Show/click:** Expand **Authentication**. Briefly show **Login (JWT)** without exposing its body or response. Select **Current Profile (Bearer JWT)** and show `200 OK` without personal fields. Click **Cookies**, choose `localhost`, remove `hr_session`, and close the cookie manager. Expand **Authentication checks**, select **Protected route without token (expect 401)**, click **Send**, and show `401 Unauthorized` with the test passing.

**Say:**

> The API authenticates users and issues a JWT. In a browser session it also uses an HttpOnly session cookie. The profile request succeeds when authenticated. Here the protected employees route returns 401 when I remove the session cookie and send it without authentication. The route is protected, so it rejects the request.

**If the no-token request returns 200:** stop and clear the `hr_session` cookie for `localhost`; Postman may be authenticating with that cookie. Run the request again and only describe the `401` after it appears.

### 3:05–5:20 — Employee CRUD

**Show/click:** Expand **Employee CRUD (HR Manager)** in the left pane. Select and send each request in order, showing the status code and a safe part of the response:

1. **Create Employee**
2. **Read Employee**
3. **Update Employee**
4. **Delete Employee (deactivate)**

Keep the Create request's initial-password field masked or cropped. Avoid showing real employee data.

**Say:**

> I’m now demonstrating employee CRUD using a throwaway employee. Create adds the record and the collection saves its ID. Read retrieves that record. Update changes its position. Delete deactivates the employee rather than removing the row, preserving HR history. Together these requests demonstrate create, read, update, and delete behavior through the API.

Wait for each response before moving to the next request. If one fails, do not claim the sequence passed; explain the actual result.

### 5:20–6:20 — Leave management and onboarding

**Show/click:** Expand **Leave Request CRUD** and select **List My Leave Requests**. Click **Send** only if the saved Bearer token belongs to a user allowed to view the result; otherwise, skip the request. If unavailable or unsuccessful, use **Ctrl+P** to open `backend/src/database/entities.ts` and **Ctrl+F** to find `LeaveRequestEntity` and `LeaveApprovalEntity`. Do not create a request with the HR Manager account.

**Say:**

> The leave workflow lets an employee submit and track a request. The system keeps leave balances and approval records, and authorized approvers make decisions on assigned requests. The onboarding workflow stores document metadata and supports private document uploads and HR verification. I’m describing these workflows here; I’m only claiming a successful leave test if the response shown on screen succeeded.

### 6:20–7:05 — Brief code/data-flow trace

**Show/click:** In VS Code, press **Ctrl+P**, open `backend/src/hr/hr.controller.ts`, then press **Ctrl+F** and search `createEmployee`. Show the controller method. Repeat with `backend/src/hr/hr.service.ts` and search `async createEmployee`. If time permits, open `backend/src/database/entities.ts`, search `class EmployeeEntity`, and show its department relationship.

**Say:**

> This code trace shows how a request is handled: the controller receives and routes the request, the service applies the HR operation, and TypeORM persists the employee through the repository. The entity defines how the employee relates to the department and other HR records.

### 7:05–7:30 — Conclusion

**Show:** Return to the project title or the Postman collection overview.

**Say:**

> To summarize, the system combines employee and onboarding management with leave requests, balances, and approvals. The demo showed API availability, authentication, protected access, and employee CRUD. A future improvement is accounting for public holidays when calculating leave duration. Thank you.

## If something goes wrong during the recording

- If Health fails, check the backend terminal and MySQL before continuing.
- If Login fails, stop and check the current account credentials privately. Do not reset the existing database password just for the recording.
- If a protected-route test returns 200, clear the `hr_session` cookie and retry; do not claim it returned 401 unless it did.
- If an Employee CRUD request fails, state which step failed and show the actual result. Do not present an unverified response as successful.
- If the leave-list request is empty or unavailable, explain the workflow and distinguish that explanation from a tested operation.
