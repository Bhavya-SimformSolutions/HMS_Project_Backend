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
  // Send notification to doctor with detailed info
  if (appointment.doctor && appointment.doctor.user_id) {
    const appointmentDateStr = appointmentDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    await createNotification({
      userId: appointment.doctor.user_id,
      title: '🩺 New Appointment Request',
      message: `${patient.first_name} ${patient.last_name} has requested a ${validatedData.type} appointment on ${appointmentDateStr} at ${validatedData.time}. Please review and approve.`,
      link: `/doctor/appointments/${appointment.id}`
    });
  }
  
  // Send confirmation notification to patient
  const appointmentDateStr = appointmentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  await createNotification({
    userId: userId,
    title: '📅 Appointment Request Submitted',
    message: `Your ${validatedData.type} appointment with Dr. ${appointment.doctor.name} on ${appointmentDateStr} at ${validatedData.time} has been submitted and is pending approval.`,
    link: `/appointments/${appointment.id}`
  });
  
  // Notify admins of new appointments for monitoring (optional - can be configured)
  const currentHour = new Date().getHours();
  
  // Only notify admins during business hours or for urgent appointments
  if (currentHour >= 8 && currentHour <= 17 || validatedData.type.toLowerCase().includes('urgent') || validatedData.type.toLowerCase().includes('emergency')) {
    // Get all admin users and send individual notifications
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });
    
    for (const admin of adminUsers) {
      await createNotification({
        userId: admin.id,
        title: '📋 New Appointment Request',
        message: `${patient.first_name} ${patient.last_name} booked a ${validatedData.type} appointment with Dr. ${appointment.doctor.name} for ${appointmentDateStr} at ${validatedData.time}.`,
        link: '/admin/appointments'
      });
    }
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
  const patient = await prisma.patient.findUnique({ 
    where: { user_id: userId },
    select: { id: true, user_id: true, first_name: true, last_name: true }
  });
  if (!patient) throw new Error("Patient profile not found");
  
  const existingAppointment = await prisma.appointment.findFirst({ 
    where: { id: appointmentId, patient_id: patient.id },
    include: { 
      doctor: { select: { name: true, specialization: true, user_id: true } } 
    }
  });
  if (!existingAppointment) throw new Error("Appointment not found");
  
  if (validatedData.status === AppointmentStatus.CANCELLED && existingAppointment.status !== AppointmentStatus.PENDING) {
    throw new Error("Only pending appointments can be cancelled");
  }
  
  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: validatedData.status as AppointmentStatus, reason: validatedData.reason },
    include: { doctor: { select: { name: true, specialization: true } } },
  });
  
  // Send notification to doctor when patient cancels
  if (validatedData.status === AppointmentStatus.CANCELLED && existingAppointment.doctor.user_id) {
    const appointmentDateStr = new Date(existingAppointment.appointment_date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    await createNotification({
      userId: existingAppointment.doctor.user_id,
      title: '🚫 Appointment Cancelled by Patient',
      message: `${patient.first_name} ${patient.last_name} has cancelled their appointment scheduled for ${appointmentDateStr} at ${existingAppointment.time}. ${validatedData.reason ? `Reason: ${validatedData.reason}` : ''}`,
      link: '/doctor/appointments',
    });
    
    // Check if cancellation is same-day or urgent - notify admins
    const appointmentDate = new Date(existingAppointment.appointment_date);
    const today = new Date();
    const timeDiff = appointmentDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff <= 1) { // Same day or next day cancellation
      // Get all admin users and send individual notifications
      const adminUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' }
      });
      
      for (const admin of adminUsers) {
        await createNotification({
          userId: admin.id,
          title: '⚠️ Urgent: Same-Day Appointment Cancellation',
          message: `Patient ${patient.first_name} ${patient.last_name} cancelled appointment with Dr. ${existingAppointment.doctor.name} scheduled for ${appointmentDateStr} at ${existingAppointment.time}. Immediate attention may be required.`,
          link: '/admin/appointments'
        });
      }
    }
  }
  
  return updatedAppointment;
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

/**
 * Fetches a paginated list of appointments for admin, with search and status filter.
 * @param page - The page number (1-based)
 * @param limit - The number of appointments per page
 * @param search - Optional search string (patient/doctor name)
 * @param status - Optional status filter
 * @returns { appointments, total }
 */
export const getPaginatedAppointmentsService = async (page: number, limit: number, search?: string, status?: string) => {
  const skip = (page - 1) * limit;
  const where: any = {};
  if (status && status !== 'ALL') {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { patient: { first_name: { contains: search, mode: 'insensitive' } } },
      { patient: { last_name: { contains: search, mode: 'insensitive' } } },
      { doctor: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      skip,
      take: limit,
      where,
      orderBy: { appointment_date: 'desc' },
      include: {
        doctor: { select: { name: true, specialization: true } },
        patient: { select: { first_name: true, last_name: true } },
      },
    }),
    prisma.appointment.count({ where }),
  ]);
  return { appointments, total };
};