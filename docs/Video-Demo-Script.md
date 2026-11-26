# HR System Video Demo: Click-by-Click Guide

Target runtime: about 7 minutes 30 seconds. This is a narrated walkthrough of the tested API flows and an explanation of the other implemented HR workflows. Do not imply that an untested request succeeded.

## What this video demonstrates

- API availability through `GET /hr/health`.
- JWT login and profile access.
- Rejection of an unauthenticated request with `401`.
- Full Employee CRUD: Create, Read, Update, and Delete (which safely deactivates).
- The implemented leave and onboarding workflows, with a successful leave response only if one is actually obtained.
- A brief trace from the controller to the service and TypeORM entity.

The backend has 27 route handlers. This short video intentionally demonstrates representative requests and a complete CRUD workflow rather than all 27 routes.

## Prepare before recording

### Start the system

1. Open XAMPP Control Panel and click **Start** beside **MySQL**. Start **Apache** only if you plan to show phpMyAdmin.
2. In VS Code, choose **Terminal → New Terminal**.
3. In the terminal, run:

   ```powershell
   cd D:\xampp\htdocs\HR\backend
   npm.cmd run start:dev
   ```

4. Wait for Nest to report that it started successfully. Leave this terminal running.
5. In Postman, open the imported **HR Management System API** collection, select **Health**, and click **Send**. Confirm `200 OK` and `{"status":"ok"}` before recording.

The React frontend is optional for this API-focused video. If you also want to show the browser UI, open a second VS Code terminal and run:

```powershell
cd D:\xampp\htdocs\HR\frontend
npm.cmd run dev -- --host 0.0.0.0
```

### Prepare Postman safely

1. Expand **HR Management System API** in the left **Collections** panel.
2. Confirm the collection variables are already set and the login works. Keep the actual `hrPassword`, `newPassword`, and `accessToken` private. Do not show the collection **Variables** tab on camera.
3. Confirm **Current Profile (Bearer JWT)** succeeds with `200 OK`.
4. In Postman's **Cookies** control, remove the `hr_session` cookie for `localhost` immediately before the no-auth request. This is necessary because login stores a cookie and the API accepts either a Bearer token or that cookie.
5. Select **Authentication checks → Protected route without token (expect 401)** and send it. Confirm the response is `401 Unauthorized` and the test passes.
6. Confirm **Employee CRUD (HR Manager)** requests still have the collection Bearer token and can run. The no-auth request explicitly disables collection authentication; employee requests inherit the collection Bearer token.
7. For the recording, run a fresh **Create Employee** first so Postman sets a new `employeeId`, then use that same ID for Read, Update, and Deactivate. The collection generates a timestamped demo email.
8. The Create Employee body includes a demo initial password. Arrange the Postman window so the request body and response secrets are outside the recorded area. Do not reveal login response tokens, password values, `.env`, or real employee data.

If Login returns `401`, stop and verify the current account password privately; do not reset the existing database password just for this recording. If the no-auth request returns `200`, clear the `localhost` cookie and retry. Only narrate results actually shown.

## Recording: exact screen actions and narration

### 0:00–0:40 — Introduce the project

**Click/show**

1. In VS Code, open the Explorer if it is hidden.
2. Show the project folders: `backend`, `frontend`, `docs`, and `postman`.
3. Show the project title in the README or this script.

**Say**

> Hello. This is my Employee Onboarding and Leave Management System. It is a full-stack HR prototype for managing employee records and onboarding documents, as well as leave balances, leave requests, and approvals. I’ll demonstrate the running API and a complete employee CRUD workflow using Postman.

### 0:40–1:25 — Show the architecture in code

**Click/show**

1. In VS Code press **Ctrl+P**, type `frontend/src/App.jsx`, and press **Enter**. Briefly show the React app file name.
2. Press **Ctrl+P**, type `backend/src/hr/hr.controller.ts`, and press **Enter**.
3. Use **Ctrl+F**, search `createEmployee`, and show the controller method that routes the request to `hrService.createEmployee`.
4. Press **Ctrl+P**, type `backend/src/database/entities.ts`, and press **Enter**. Use **Ctrl+F** to show `EmployeeEntity` or `LeaveRequestEntity`.
5. Do not spend time scrolling through entire files.

**Say**

> The React frontend provides the browser interface, while Postman can call the API directly. The backend is built with NestJS. A request reaches a controller, which calls the HR service. TypeORM repositories connect business operations to MySQL. The entity file maps tables and relationships, including employees, departments, leave requests, and approvals.

### 1:25–1:55 — Show API availability

**Click/show**

1. Switch to Postman.
2. In the left collection tree, click **Health**.
3. Click the blue **Send** button at the upper-right of the request.
4. Show the `200 OK` status and the small health response. Do not show unrelated data.

**Say**

> First I check the health endpoint. The 200 response confirms that the API is running and responding.

### 1:55–3:05 — Show authentication and protection

**Click/show**

1. In the left collection tree, expand **Authentication**.
2. Briefly select **Login (JWT)**. Do not show its password variable, request body with credentials, or response token. Do not pause on the login response.
3. Select **Current Profile (Bearer JWT)** and show only the request name and `200 OK` status. Hide or crop personal response fields.
4. Expand **Authentication checks**.
5. Select **Protected route without token (expect 401)**.
6. Click **Send** and show `401 Unauthorized` plus the passing test result. Avoid showing employee data if the result is anything other than 401.

**Say**

> Login authenticates the HR user and issues a JWT. In a browser session the API also uses an HttpOnly session cookie. The profile request succeeds when authenticated. Here the protected employees route returns 401 after the session cookie is removed, demonstrating that an unauthenticated request is rejected.

If the result is `200`, do not call it a successful no-token check. Clear the cookie for `localhost`, send it again, and only continue when you get `401`.

### 3:05–5:20 — Demonstrate Employee CRUD

**Click/show**

1. Expand **Employee CRUD (HR Manager)** in the left collection tree.
2. Click **Create Employee**. Keep the request-body area containing `InitialPassword` out of the recording. Click **Send**. Show the success status and only safe demo fields. The request test automatically saves `employeeId`.
3. Click **Read Employee**. Click **Send**. Show `200 OK` and that the ID matches the created demo employee.
4. Click **Update Employee**. Click **Send**. Show `200 OK` and the position changed to `Updated Demo Analyst`.
5. Click **Delete Employee (deactivate)**. Click **Send**. Show `200 OK` and the success result.
6. Wait for each response before selecting the next request.

**Say**

> I’m using a throwaway demo employee. Create adds the record and saves its ID for the next requests. Read retrieves that same employee. Update changes the position. Delete deactivates the employee rather than erasing the record, which preserves HR history. Together these requests demonstrate create, read, update, and delete behavior.

Use the collection's generated timestamp email so repeated practice runs do not reuse an existing email. Do not repeat Create unless you are ready to use the new ID for all remaining steps.

### 5:20–6:20 — Explain leave and onboarding workflows

**Click/show**

1. Expand **Leave Request CRUD**.
2. Select **List My Leave Requests**.
3. Click **Send** only if the saved Bearer token is still active. Show the response only if it is successful and contains no sensitive information.
4. If the response is empty or errors, switch to VS Code and open `backend/src/database/entities.ts` using **Ctrl+P**. Use **Ctrl+F** to show `LeaveRequestEntity`, `LeaveApprovalEntity`, or `OnboardingDocumentEntity`.
5. Do not create a leave request while signed in as the HR Manager. The collection describes this request flow for an Employee account.

**Say**

> The leave workflow lets an employee submit and track a request. The system keeps annual balances and approval records, and authorized approvers make decisions on assigned requests. Onboarding documents can be uploaded privately and reviewed by HR. I’m describing those implemented workflows; I’m only claiming a successful leave test if the response shown here succeeded.

### 6:20–7:05 — Trace the employee request

**Click/show**

1. In VS Code press **Ctrl+P**, open `backend/src/hr/hr.controller.ts`, and search for `createEmployee`.
2. Point out that the controller passes the validated DTO and current HR user's ID to the service.
3. Press **Ctrl+P**, open `backend/src/hr/hr.service.ts`, and search for `async createEmployee`.
4. Point out the employee repository operation and transaction. Do not show environment files or secrets.
5. If time permits, open `backend/src/database/entities.ts` and show how `EmployeeEntity` relates to a department.

**Say**

> This code trace shows the path for creating an employee. The controller receives the request and identifies the signed-in user. The service checks and writes the employee using TypeORM repositories, and the entity maps the employee to the MySQL table and department relationship.

### 7:05–7:30 — Conclude

**Click/show**

1. Return to the Postman collection overview or the project title in VS Code.
2. Leave a clean, non-sensitive screen visible.

**Say**

> To summarize, the system combines employee and onboarding management with leave requests, balances, and approvals. This demo showed API availability, authentication, protected access, and employee CRUD. One future improvement is accounting for public holidays when calculating leave duration. Thank you.

## If something goes wrong

- **Health fails:** check that XAMPP MySQL is running and inspect the backend terminal.
- **Login returns 401:** verify the current account password privately; do not reset the live database password for the demo.
- **Protected route returns 200:** clear the `hr_session` cookie for `localhost` and retry; the cookie is authentication even if the request has no Bearer token.
- **Employee CRUD fails:** do not claim the failed step passed. State the actual response and stop or retry after fixing the cause.
- **Leave request list is empty or errors:** explain the workflow and distinguish that explanation from a tested operation.
- **A secret or personal record appears:** stop recording and redo that segment with the sensitive area hidden.
