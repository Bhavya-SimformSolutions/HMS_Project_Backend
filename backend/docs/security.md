# Security

This document outlines the security features and best practices implemented in the Healthcare Management System backend.

---

## 1. Authentication & Authorization
- **JWT-based authentication** for all users
- **Role-based access control (RBAC)** to restrict endpoints by user role
- **Password hashing** with bcrypt

---

## 2. Input Validation
- **Zod** schemas for validating all incoming data
- Rejects invalid or malicious input

---

## 3. File Upload Security
- Only image files allowed
- Max file size: 5MB
- Files stored outside public web root

---

## 4. CORS & Environment Variables
- CORS enabled for allowed origins only
- Sensitive data (DB URL, JWT secret) stored in `.env` file

---

## 5. Other Best Practices
- Error handling middleware to prevent leaking stack traces
- Secure HTTP headers (can be added with helmet.js)
- Regular dependency updates

---

For more details, see the [Architecture](./architecture.md) and [API Overview](./api-overview.md).
