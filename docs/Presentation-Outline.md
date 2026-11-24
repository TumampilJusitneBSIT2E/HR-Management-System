# HR Management System — Presentation Outline

Target length: 10–15 minutes plus Q&A.

| Time | Topic | What to show |
|---|---|---|
| 0:00–1:00 | Project overview | HR problem, objectives, intended users, key features |
| 1:00–2:30 | Architecture | React/Postman → NestJS guards and DTOs → controllers → services → TypeORM repositories/entities → MySQL |
| 2:30–4:00 | Database design | ERD, primary/foreign keys, employee/department and request/approval relationships |
| 4:00–5:00 | REST API | Resource URI examples, GET/POST/PATCH/PUT/DELETE, representative status codes |
| 5:00–6:00 | Authentication/security | Login response with JWT, hashed password, protected route rejection without token |
| 6:00–10:30 | Live demo | In Postman: login, full Employee Create/Read/Update/Delete sequence, then verify the matching row in phpMyAdmin |
| 10:30–12:30 | Code/data-flow trace | Open the actual controller, service, TypeORM repository/entity, then explain the database result returning to Postman |
| 12:30–13:30 | Conclusion | Outcome, lesson/challenge, future improvements |
| 13:30–15:00 | Q&A buffer | Be ready to justify schema, authorization, ORM, and CRUD decisions |

## Separate 5–10 minute recording checklist

- [ ] Start the backend and show no startup errors.
- [ ] Log in and show the JWT response.
- [ ] Perform one complete CRUD sequence in Postman.
- [ ] Trace one request through controller, service, repository/entity, and MySQL using the real files.
- [ ] Show a protected endpoint rejecting a request without a token.
- [ ] Show the matching database record in phpMyAdmin.
- [ ] Narrate the screen recording; upload the video and test its share link in a private/incognito window.

## Before presenting

- Start XAMPP MySQL, then the backend and frontend; verify `http://localhost:3001/hr/health`.
- Import the Postman collection and set the HR login variables.
- Use a throwaway Employee record for the CRUD demonstration; DELETE deactivates it.
- Keep a backup screenshot/video in case the live connection or projector fails.
- Export the database from phpMyAdmin or use `docs/hr_system.sql` as the reproducible schema file.
