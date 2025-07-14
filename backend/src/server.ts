// This file initializes and starts the server.

import express from "express";
import { createServer } from "http";
import dotenv from "dotenv";
import adminRoutes from "./api/v1/routes/admin/adminDashboard.routes";
import authRoutes from "./api/v1/routes/authentication.routes";
import patientRoutes from "./api/v1/routes/patient/patient.routes";
import appointmentRoutes from "./api/v1/routes/patient/appointment.routes";
import doctorRoutes from "./api/v1/routes/doctor.routes";
import serviceRoutes from "./api/v1/routes/admin/services.routes";
import cors from 'cors'
import path from 'path';
import notificationRoutes from "./api/v1/routes/notification.routes";
import WebSocketService from "./api/v1/services/websocket.service";
import { setWebSocketService } from "./api/v1/services/notification.service";

dotenv.config();
const app = express();

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);

// Set WebSocket service for notification service
setWebSocketService(webSocketService);

app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:52377'],
  credentials: true,
}))

// Increase the payload size limit to handle image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use("/admin", adminRoutes);
app.use("/admin/services", serviceRoutes);
app.use("/auth", authRoutes);
app.use("/patient", patientRoutes);
app.use("/patient/appointments", appointmentRoutes);
app.use("/", doctorRoutes);
app.use('/notifications', notificationRoutes);

// WebSocket status endpoint
app.get('/api/websocket/status', (req, res) => {
  res.json({
    status: 'active',
    connectedUsers: webSocketService.getConnectedUsersCount(),
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(process.env.PORT, () => {
  console.log(`🚀 Server is running on port ${String(process.env.PORT)}`);
});

// Export for potential testing
export { app, server, webSocketService };