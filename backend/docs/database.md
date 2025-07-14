# Database & Data Flow

This document describes the database schema, key models, and how data flows through the Healthcare Management System backend.

---

## 1. Database Technology
- **PostgreSQL** (relational database)
- **Prisma ORM** (type-safe database access)

---

## 2. Key Models (Tables)
- **User**: Stores login credentials and role (Admin, Doctor, Patient, etc.)
- **Patient**: Patient profile and medical info
- **Doctor**: Doctor profile and specialization
- **Appointment**: Links patients and doctors, tracks status
- **MedicalRecords**: Stores diagnosis, prescriptions, and vitals for appointments
- **Diagnosis**: Doctor's diagnosis for a patient
- **VitalSigns**: Patient's vital signs for a medical record
- **Payment**: Billing and payment info
- **PatientBills**: Line items for each bill
- **Services**: Medical services offered
- **Notification**: System/user notifications

---

## 3. Data Flow Example (Patient Booking)
1. **User registers** as a patient (creates User and Patient records)
2. **Patient books appointment** (creates Appointment record)
3. **Doctor consults** and adds diagnosis/prescription (creates/updates MedicalRecords, Diagnosis, etc.)
4. **Billing is generated** (creates Payment and PatientBills)
5. **Notifications** are sent for updates

---

## 4. ER Diagram
- See the [ER Diagram](https://app.eraser.io/workspace/i6a4BWiOGLytq5zJh9HX) for a visual overview of the schema.

---

For schema details, see `prisma/schema.prisma` in the codebase.
