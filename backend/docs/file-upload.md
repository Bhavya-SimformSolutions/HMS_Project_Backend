# File Uploads

This document explains how file and image uploads are handled in the Healthcare Management System backend.

---

## 1. Technology
- **Multer** middleware for handling multipart/form-data
- **Express** for serving static files

---

## 2. How It Works
- Users (patients, doctors) can upload images (e.g., profile pictures, documents) via API endpoints.
- Uploaded files are stored in the `/uploads` directory on the server.
- The backend serves these files statically at `/uploads/<filename>`.
- File size and type restrictions are enforced for security.

---

## 3. Security
- Only image files are allowed (JPG, PNG, etc.)
- Maximum file size is 5MB
- Uploaded files are validated and sanitized

---

## 4. Implementation
- See `src/api/v1/middlewares/` for upload logic
- See `server.ts` for static file serving

---

For API usage, see the [API Overview](./api-overview.md).
