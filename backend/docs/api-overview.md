# API Overview

This document provides a comprehensive overview of all API endpoints available in the Healthcare Management System backend, grouped by user role and feature. Each endpoint includes a brief description of its purpose.

---

## Authentication
- `POST /auth/login` — User login
- `POST /auth/register` — User registration

---

## Admin Endpoints
- `GET /admin/dashboard` — Get admin dashboard data
- `GET /admin/dashboard/stats` — Get admin dashboard statistics
- `GET /admin/patients` — Get paginated list of patients
- `GET /admin/appointments` — Get paginated list of appointments
- `GET /admin/billing` — Get admin billing overview
- `POST /admin/services` — Add a new service
- `GET /admin/services` — List all services
- `POST /admin/doctors` — Add a new doctor
- `GET /admin/doctors` — List all doctors (admin view)

---

## Patient Endpoints
- `GET /patient/check-registration` — Check patient registration status
- `POST /patient/register` — Register patient details (with image upload)
- `GET /patient/dashboard` — Get patient dashboard stats
- `GET /patient/profile` — Get patient profile
- `GET /patient/records` — List patient medical records
- `GET /patient/prescriptions` — List patient prescriptions
- `GET /patient/billing` — List patient billing information

### Patient Appointments
- `POST /patient/appointments` — Create new appointment
- `GET /patient/appointments` — Get all appointments for the logged-in patient
- `GET /patient/appointments/count` — Get count of appointments
- `GET /patient/appointments/doctors` — Get all doctors (for booking)
- `GET /patient/appointments/:id` — Get appointment details
- `GET /patient/appointments/:id/vitals` — Get vitals for an appointment
- `GET /patient/appointments/:id/bills` — Get bills for a specific appointment
- `GET /patient/appointments/:id/diagnosis` — Get diagnosis for a specific appointment
- `PATCH /patient/appointments/:id/status` — Update appointment status

---

## Doctor Endpoints
- `GET /doctor/appointments` — List all doctor appointments
- `GET /doctor/appointments/:id` — Get appointment details
- `PUT /doctor/appointments/:id/status` — Update appointment status
- `POST /doctor/appointments/:id/vitals` — Add vital signs for an appointment
- `GET /doctor/appointments/:id/vitals` — Get vitals for an appointment
- `GET /doctor/appointments/:id/diagnosis` — Get diagnosis for an appointment
- `POST /doctor/appointments/:id/diagnosis` — Add diagnosis for an appointment
- `GET /doctor/dashboard` — Get doctor dashboard stats
- `GET /doctor/appointments/:id/bills` — Get bills for an appointment
- `POST /doctor/appointments/:id/bills` — Add a bill to an appointment
- `DELETE /doctor/appointments/:id/bills/:billId` — Delete a bill from an appointment
- `PATCH /doctor/appointments/:id/bills/:billId` — Edit a bill in an appointment
- `POST /doctor/appointments/:id/generate-bill` — Generate final bill for an appointment
- `PATCH /doctor/appointments/:id/final-bill` — Edit final bill summary
- `GET /doctor/services` — List all services (doctor view)
- `GET /doctor/patients` — List all patients for a doctor
- `GET /doctor/billing` — Get doctor billing overview

---

## Notification Endpoints
- `GET /notifications` — List notifications for the logged-in user
- `PATCH /notifications/:id/read` — Mark a notification as read
- `POST /notifications` — Create a notification (internal use)

---

For request/response details and advanced usage, see the feature-specific docs in this folder.
