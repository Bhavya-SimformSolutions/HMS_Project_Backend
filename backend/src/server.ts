// This file initializes and starts the server.

import express from "express";
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

dotenv.config();
const app=express();

app.use(cors({
  origin:'http://localhost:4200', 
  credentials:true,
}))

// Increase the payload size limit to handle image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use("/admin", adminRoutes);
app.use("/admin/services",serviceRoutes);
app.use("/auth", authRoutes);
app.use("/patient", patientRoutes);
app.use("/patient/appointments", appointmentRoutes);
app.use("/", doctorRoutes);
app.use('/notifications', notificationRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${String(process.env.PORT)}`);
});