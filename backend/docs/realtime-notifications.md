# Real-time Notifications

This document explains how real-time notifications work in the Healthcare Management System backend.

---

## 1. Technology
- **Socket.IO** for WebSocket-based real-time communication
- **JWT Authentication** for secure connections

---

## 2. How It Works
- When a user logs in, the frontend establishes a WebSocket connection to the backend using Socket.IO.
- The backend authenticates the connection using the user's JWT token.
- Notifications (e.g., new appointment, bill, or message) are sent instantly to the relevant user or role.
- Users receive notifications in real time without needing to refresh the page.

---

## 3. Notification Types
- **User-specific**: Sent to a single user (e.g., appointment update)
- **Role-based**: Sent to all users with a specific role (e.g., doctors)
- **Broadcast**: Sent to all connected users (e.g., system maintenance)

---

## 4. Implementation
- See `src/api/v1/services/websocket.service.ts` for the WebSocket logic.
- Notifications are stored in the database and can be marked as read.

---

For API usage, see the [API Overview](./api-overview.md).
