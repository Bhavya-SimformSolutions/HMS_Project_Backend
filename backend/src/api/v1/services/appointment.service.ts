import { AppointmentStatus, PrismaClient } from "@prisma/client";
import { createAppointmentSchema, updateAppointmentSchema } from "../validations/appointment.validation";
import { z } from "zod";
import { createNotification } from "./notification.service";

const prisma = new PrismaClient();
type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const createAppointmentService = async (userId: string, body: CreateAppointmentInput) => {
  // Get patient details
  const patient = await prisma.patient.findUnique({ where: { user_id: userId } });
  if (!patient) throw new Error("Patient profile not found");
  // Validate appointment data
  const validatedData = createAppointmentSchema.parse(body);
  // Check if doctor exists
  const doctor = await prisma.doctor.findUnique({ where: { id: validatedData.doctor_id } });
  if (!doctor) throw new Error("Doctor not found");
  // Convert string date to Date object for Prisma
  const appointmentDate = new Date(validatedData.appointment_date);
  // Check if doctor is available on the selected date and time
  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      doctor_id: validatedData.doctor_id,
      appointment_date: appointmentDate,
      time: validatedData.time,
      status: { notIn: [AppointmentStatus.CANCELLED] }
    }
  });
  if (existingAppointment) throw new Error("This time slot is already booked for the selected doctor");
  // Create appointment
  const appointment = await prisma.appointment.create({
    data: {
      patient_id: patient.id,
      doctor_id: validatedData.doctor_id,
      appointment_date: appointmentDate,
      time: validatedData.time,
      type: validatedData.type,
      note: validatedData.note,
      status: AppointmentStatus.PENDING,
    },
    include: {
      doctor: { select: { name: true, specialization: true, user_id: true } },
    },
  });
  // Send notification to doctor
  if (appointment.doctor && appointment.doctor.user_id) {
    await createNotification({
      userId: appointment.doctor.user_id,
      title: 'New Appointment Booked',
      message: `A patient has booked an appointment with you.`,
      link: '/doctor/appointments',
    });
  }
  return appointment;
};

export const getPatientAppointmentsService = async (userId: string) => {
  const patient = await prisma.patient.findUnique({ where: { user_id: userId } });
  if (!patient) throw new Error("Patient profile not found");
  return prisma.appointment.findMany({
    where: { patient_id: patient.id },
    include: {
      doctor: { select: { name: true, specialization: true, img: true } },
      medical: { include: { vital_signs: true } },
    },
    orderBy: { appointment_date: 'desc' },
  });
};

export const getAppointmentByIdService = async (userId: string, appointmentId: number) => {
  const patient = await prisma.patient.findUnique({ where: { user_id: userId } });
  if (!patient) throw new Error("Patient profile not found");
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, patient_id: patient.id },
    include: {
      doctor: { select: { name: true, specialization: true, img: true } },
      patient: { select: { first_name: true, last_name: true, gender: true, phone: true, address: true, date_of_birth: true, img: true } }
    },
  });
  if (!appointment) throw new Error("Appointment not found");
  return appointment;
};

export const updateAppointmentStatusService = async (userId: string, appointmentId: number, body: UpdateAppointmentInput) => {
  const validatedData = updateAppointmentSchema.parse(body);
  const patient = await prisma.patient.findUnique({ where: { user_id: userId } });
  if (!patient) throw new Error("Patient profile not found");
  const existingAppointment = await prisma.appointment.findFirst({ where: { id: appointmentId, patient_id: patient.id } });
  if (!existingAppointment) throw new Error("Appointment not found");
  if (validatedData.status === AppointmentStatus.CANCELLED && existingAppointment.status !== AppointmentStatus.PENDING) {
    throw new Error("Only pending appointments can be cancelled");
  }
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: validatedData.status as AppointmentStatus, reason: validatedData.reason },
    include: { doctor: { select: { name: true, specialization: true } } },
  });
};

export const getAppointmentCountService = async (userId: string) => {
  const patient = await prisma.patient.findUnique({ where: { user_id: userId } });
  if (!patient) throw new Error("Patient profile not found");
  const count = await prisma.appointment.count({ where: { patient_id: patient.id } });
  return count;
};

export const getDoctorsService = async () => {
  return prisma.doctor.findMany({ select: { id: true, name: true, specialization: true, img: true } });
};