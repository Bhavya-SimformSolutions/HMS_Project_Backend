import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { patientRegistrationSchema } from "../validations/patient.validation";

type PatientFormData = z.infer<typeof patientRegistrationSchema>;

const prisma = new PrismaClient();

export const registerPatientDetailsService = async (userId: string, formData: Record<string, unknown>, file?: Express.Multer.File) => {
  // Attach file path to formData
  if (file) {
    formData.img = `/uploads/${file.filename}`;
  }
  // Validate form data with Zod
  const validatedData: PatientFormData = patientRegistrationSchema.parse(formData);
  // Check if the patient is already registered
  const existingPatient = await prisma.patient.findUnique({ where: { user_id: userId } });
  if (existingPatient) throw new Error("Patient details already registered");
  // Create patient record in the database
  const patient = await prisma.patient.create({
    data: {
      ...validatedData,
      user_id: userId,
    },
  });
  return {
    id: patient.id,
    first_name: patient.first_name,
    last_name: patient.last_name,
    email: patient.email,
    img: patient.img,
  };
};

export const checkPatientRegistrationService = async (userId: string) => {
  const isRegistered = await prisma.patient.findUnique({ where: { user_id: userId } });
  return Boolean(isRegistered);
};

/**
 * Returns dashboard stats for a patient: name, appointment counts by status, total count,
 * next upcoming appointment, and recent appointments.
 * @param userId - The user ID of the patient
 */
export const getPatientDashboardStatsService = async (userId: string) => {
  // Find the patient by userId
  const patient = await prisma.patient.findUnique({
    where: { user_id: userId },
    select: { first_name: true, last_name: true, id: true }
  });
  if (!patient) throw new Error('Patient not found');

  // Appointment counts by status
  const [scheduled, pending, completed, cancelled, total] = await Promise.all([
    prisma.appointment.count({ where: { patient_id: patient.id, status: 'SCHEDULED' } }),
    prisma.appointment.count({ where: { patient_id: patient.id, status: 'PENDING' } }),
    prisma.appointment.count({ where: { patient_id: patient.id, status: 'COMPLETED' } }),
    prisma.appointment.count({ where: { patient_id: patient.id, status: 'CANCELLED' } }),
    prisma.appointment.count({ where: { patient_id: patient.id } })
  ]);

  // Next upcoming appointment (by date, status SCHEDULED)
  const nextAppointment = await prisma.appointment.findFirst({
    where: { patient_id: patient.id, status: 'SCHEDULED', appointment_date: { gte: new Date() } },
    orderBy: { appointment_date: 'asc' },
    include: { doctor: { select: { name: true, specialization: true } } }
  });

  // Recent appointments (last 5, newest first)
  const recentAppointments = await prisma.appointment.findMany({
    where: { patient_id: patient.id },
    orderBy: { appointment_date: 'desc' },
    take: 5,
    include: { doctor: { select: { name: true, specialization: true } } }
  });

  return {
    patientName: `${patient.first_name} ${patient.last_name}`,
    counts: {
      scheduled,
      pending,
      completed,
      cancelled,
      total
    },
    nextAppointment,
    recentAppointments
  };
};