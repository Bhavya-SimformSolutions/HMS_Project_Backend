# Architecture & File Structure

This document provides a high-level overview of the backend architecture, file structure, and the flow of the Healthcare Management System. It is designed to help new developers and non-technical stakeholders understand how the system is organized and how its components interact.

---

## 1. Tech Stack
- **Node.js** (runtime)
- **Express.js** (web framework)
- **TypeScript** (type safety)
- **Prisma** (ORM for PostgreSQL)
- **PostgreSQL** (database)
- **Socket.IO** (real-time notifications)
- **Multer** (file uploads)
- **Zod** (input validation)

---

## 2. Project Structure

```
backend/
├── src/
│   ├── api/
│   │   └── v1/
│   │       ├── controllers/    # Request handlers for each feature
│   │       ├── middlewares/    # Custom Express middleware (auth, validation, etc.)
│   │       ├── routes/         # API route definitions, grouped by feature/role
│   │       ├── services/       # Business logic and database access
│   │       ├── validations/    # Zod schemas for input validation
│   │       └── interfaces/     # TypeScript interfaces and types
│   ├── prisma/                 # Prisma schema and migrations
│   └── server.ts               # Application entry point
├── uploads/                    # Uploaded files (images, etc.)
├── package.json                # Project metadata and scripts
├── tsconfig.json               # TypeScript configuration
└── .env                        # Environment variables
```

---

## 3. Backend Flow

1. **Request**: Client (frontend or API consumer) sends a request to the backend.
2. **Routing**: The request is routed to the appropriate controller via Express routes.
3. **Middleware**: Middleware handles authentication, validation, and other cross-cutting concerns.
4. **Controller**: The controller processes the request, calls the relevant service, and returns a response.
5. **Service**: Services contain business logic and interact with the database using Prisma.
6. **Database**: Data is stored/retrieved from PostgreSQL via Prisma ORM.
7. **Response**: The controller sends the response back to the client.

---

## 4. Key Folders Explained

- **controllers/**: Handle incoming requests and return responses. Each major feature (auth, patient, doctor, etc.) has its own controller.
- **routes/**: Define API endpoints and map them to controllers. Organized by user role and feature.
- **services/**: Contain business logic and database queries. Keep controllers clean and focused.
- **middlewares/**: Functions that run before controllers (e.g., authentication, validation).
- **validations/**: Zod schemas for validating incoming data.
- **interfaces/**: TypeScript types and interfaces for strong typing.
- **prisma/**: Contains `schema.prisma` (database schema) and migration files.
- **uploads/**: Stores uploaded files (e.g., patient profile images).

---

## 5. How to Extend the System
- Add a new feature: Create a controller, service, route, and (optionally) validation schema.
- Add a new user role: Update the `Role` enum in Prisma, add role-based logic in middleware and services.
- Add a new API endpoint: Define the route, implement the controller and service logic, and update docs.

---

For more details, see the other documentation files in this folder.
