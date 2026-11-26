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

## Recording script

### 0:00–0:40 — Introduction

**Show:** Project title in the README or this script, then the VS Code Explorer with the `backend`, `frontend`, `docs`, and `postman` folders.

**Say:**

> Hello. This is my Employee Onboarding and Leave Management System. It is a full-stack HR prototype for managing employee records and onboarding documents, as well as leave balances, leave requests, and approvals. I’ll demonstrate the running API and a complete employee CRUD workflow using Postman.

### 0:40–1:25 — Architecture and code structure

**Show:** In VS Code, briefly show `frontend/src/App.jsx`, then `backend/src/hr/hr.controller.ts`, and `backend/src/database/entities.ts`. Do not scroll through the whole files; highlight the file names and a relevant method or entity.

**Say:**

> The React frontend provides the browser interface, while Postman can call the API directly. The backend is built with NestJS. A request reaches a controller, which calls the HR service. TypeORM repositories connect the business operations to MySQL. The entity file maps the HR tables and their relationships, including employees, departments, leave requests, and approvals.

### 1:25–1:55 — API health

**Show:** In Postman, select **Health**, click **Send**, and show the `200 OK` status and `{ "status": "ok" }` response.

**Say:**

> First I check the health endpoint. The 200 response confirms that the API is running and responding.

### 1:55–3:05 — Authentication and access control

**Show:** Briefly show the request names **Login (JWT)** and **Current Profile (Bearer JWT)**. Keep the login body, response token, and any password fields hidden. Show the profile's `200 OK` status without exposing personal fields. Then show **Protected route without token (expect 401)** and its `401 Unauthorized` status.

**Say:**

> The API authenticates users and issues a JWT. In a browser session it also uses an HttpOnly session cookie. The profile request succeeds when authenticated. Here the protected employees route returns 401 when I remove the session cookie and send it without authentication. The route is protected, so it rejects the request.

**If the no-token request returns 200:** stop and clear the `hr_session` cookie for `localhost`; Postman may be authenticating with that cookie. Run the request again and only describe the `401` after it appears.

### 3:05–5:20 — Employee CRUD

**Show:** Expand **Employee CRUD (HR Manager)**. Send each request in order, showing the status code and a safe part of the response:

1. **Create Employee**
2. **Read Employee**
3. **Update Employee**
4. **Delete Employee (deactivate)**

Keep the Create request's initial-password field masked or cropped. Avoid showing real employee data.

**Say:**

> I’m now demonstrating employee CRUD using a throwaway employee. Create adds the record and the collection saves its ID. Read retrieves that record. Update changes its position. Delete deactivates the employee rather than removing the row, preserving HR history. Together these requests demonstrate create, read, update, and delete behavior through the API.

Wait for each response before moving to the next request. If one fails, do not claim the sequence passed; explain the actual result.

### 5:20–6:20 — Leave management and onboarding

**Show:** Expand **Leave Request CRUD** and send **List My Leave Requests** only if it returns a successful response for the signed-in user. If it does not, show the route names in the documentation or the leave request/approval entities in `backend/src/database/entities.ts`. Do not create a request with the HR Manager account.

**Say:**

> The leave workflow lets an employee submit and track a request. The system keeps leave balances and approval records, and authorized approvers make decisions on assigned requests. The onboarding workflow stores document metadata and supports private document uploads and HR verification. I’m describing these workflows here; I’m only claiming a successful leave test if the response shown on screen succeeded.

### 6:20–7:05 — Brief code/data-flow trace

**Show:** In VS Code, show `backend/src/hr/hr.controller.ts` at `createEmployee` and `backend/src/hr/hr.service.ts` at `createEmployee`. If time permits, point to the employee/department relationship in `backend/src/database/entities.ts`.

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
