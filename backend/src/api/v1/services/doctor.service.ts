import bcrypt from 'bcryptjs';
import { PrismaClient, AppointmentStatus } from "@prisma/client";
import { DoctorCreateInput } from '../interfaces/doctors/doctor_types';
import { z } from 'zod';
import { vitalSignsSchema, diagnosisSchema } from '../validations/doctor.validation';
import { createNotification } from './notification.service';

const prisma = new PrismaClient();
type VitalSignsInput = z.infer<typeof vitalSignsSchema>;
type DiagnosisInput = z.infer<typeof diagnosisSchema>;

export const createDoctorService = async (data: DoctorCreateInput) => {
  const { email, password, name, specialization, department, license_number, phone, address, type, working_days } = data;
  const hashedPassword = await bcrypt.hash(password, 10);
  // Create user with DOCTOR role
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: 'DOCTOR',
      status: 'ACTIVE',
      firstName: name,
    },
  });
  // Create doctor
  const doctor = await prisma.doctor.create({
    data: {
      user_id: user.id,
      email,
      name,
      specialization,
      department,
      license_number,
      phone,
      address,
      type,
      working_days: {
        create: working_days.map((wd) => ({
          day: wd.day,
          start_time: wd.start_time,
          close_time: wd.close_time,
        })),
      },
    },
    include: { working_days: true },
  });
  return doctor;
};

export const getAllDoctorsService = async () => {
  return prisma.doctor.findMany({ include: { working_days: true } });
};

export const getDoctorAppointmentsService = async (doctorId: string) => {
  return prisma.appointment.findMany({
    where: { doctor_id: doctorId },
    include: { patient: true },
  });
};

export const getDoctorsForPatientsService = async () => {
  return prisma.doctor.findMany({
    select: {
      id: true,
      name: true,
      specialization: true,
      department: true,
      license_number: true,
      phone: true,
      email: true,
      working_days: true,
    },
  });
};

export const getAppointmentByIdService = async (appointmentId: number) => {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      doctor: true,
      medical: {
        include: {
          vital_signs: true,
        },
      },
    },
  });
};

export const addVitalSignsService = async (
  appointmentId: number,
  data: VitalSignsInput,
) => {
  const vitalAppointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!vitalAppointment) {
    throw new Error('Appointment not found');
  }

  let medicalRecord = await prisma.medicalRecords.findUnique({
    where: { appointment_id: appointmentId },
  });

  if (!medicalRecord) {
    medicalRecord = await prisma.medicalRecords.create({
      data: {
        appointment_id: appointmentId,
        patient_id: vitalAppointment.patient_id,
        doctor_id: vitalAppointment.doctor_id,
      },
    });
  }

  const { temperature, blood_pressure, heart_rate, weight, height, respiratory_rate, oxygen_saturation } = data;
  const [systolic, diastolic] = blood_pressure.split('/').map(Number);

  const vital = await prisma.vitalSigns.create({
    data: {
      medical_id: medicalRecord.id,
      body_temperature: temperature,
      systolic,
      diastolic,
      heart_rate: String(heart_rate),
      weight,
      height,
      ...(respiratory_rate !== undefined ? { respiratory_rate } : {}),
      ...(oxygen_saturation !== undefined ? { oxygen_saturation } : {}),
    },
  });

  // Notify patient
  if (vitalAppointment) {
    const patient = await prisma.patient.findUnique({ where: { id: vitalAppointment.patient_id } });
    if (patient && patient.user_id) {
      await createNotification({
        userId: patient.user_id,
        title: 'New Vital Signs Added',
        message: 'New vital signs have been added to your appointment.',
        link: '/appointments',
      });
    }
  }
  return vital;
};

export const getDiagnosisForAppointmentService = async (appointmentId: number) => {
  // Find the medical record for this appointment
  const medicalRecord = await prisma.medicalRecords.findUnique({
    where: { appointment_id: appointmentId },
    include: { diagnosis: { include: { doctor: true } } },
  });
  if (!medicalRecord) {
    return [];
  }
  return medicalRecord.diagnosis;
};

export const addDiagnosisForAppointmentService = async (
  appointmentId: number,
  doctorId: string,
  patientId: string,
  data: DiagnosisInput
) => {
  // Find or create the medical record for this appointment
  let medicalRecord = await prisma.medicalRecords.findUnique({
    where: { appointment_id: appointmentId },
  });
  if (!medicalRecord) {
    medicalRecord = await prisma.medicalRecords.create({
      data: {
        appointment_id: appointmentId,
        patient_id: patientId,
        doctor_id: doctorId,
      },
    });
  }
  // Create the diagnosis
  const diagnosis = await prisma.diagnosis.create({
    data: {
      ...data,
      medical_id: medicalRecord.id,
      doctor_id: doctorId,
      patient_id: patientId,
    },
  });

  // Notify patient
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (patient && patient.user_id) {
    await createNotification({
      userId: patient.user_id,
      title: 'New Diagnosis Added',
      message: 'A new diagnosis has been added to your appointment.',
      link: '/appointments',
    });
  }
  return diagnosis;
};

export const getDoctorByUserId = async (userId: string) => {
  return prisma.doctor.findUnique({ where: { user_id: userId } });
};

export const getDoctorAppointmentsByUserId = async (userId: string) => {
  const doctor = await getDoctorByUserId(userId);
  if (!doctor) return null;
  return getDoctorAppointmentsService(doctor.id);
};

export const updateDoctorAppointmentStatus = async (userId: string, appointmentId: number, status: string, reason?: string) => {
  // Validate status is a valid AppointmentStatus
  if (!Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
    return { error: 'Invalid status value' };
  }
  const doctor = await prisma.doctor.findFirst({ where: { user_id: userId } });
  if (!doctor) return { error: 'Doctor not found' };
  const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, doctor_id: doctor.id } });
  if (!appointment) return { error: 'Appointment not found' };
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: status as AppointmentStatus, reason }
  });

  // Notify patient
  const patient = await prisma.patient.findUnique({ where: { id: updated.patient_id } });
  if (patient && patient.user_id) {
    await createNotification({
      userId: patient.user_id,
      title: 'Appointment Status Updated',
      message: `Your appointment status was changed to ${status}.`,
      link: '/appointments',
    });
  }
  return { updated };
};

export const addDiagnosisForAppointmentFull = async (
  userId: string,
  appointmentId: number,
  diagnosisData: DiagnosisInput
) => {
  // Lookup doctor by user_id
  const doctor = await prisma.doctor.findUnique({ where: { user_id: userId } });
  if (!doctor) return { error: 'Doctor profile not found' };
  const doctorId = doctor.id;
  // Find patientId from appointment
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) return { error: 'Appointment not found' };
  const patientId = appointment.patient_id;
  const newDiagnosis = await addDiagnosisForAppointmentService(
    appointmentId,
    doctorId,
    patientId,
    diagnosisData
  );
  return { newDiagnosis };
};

// --- Billing Services ---

export const getBillsForAppointment = async (appointmentId: number) => {
  // Find payment record for this appointment
  const payment = await prisma.payment.findUnique({
    where: { appointment_id: appointmentId },
    include: {
      bills: { include: { service: true } },
    },
  });
  if (!payment) return [];
  return payment.bills;
};

export const addBillToAppointment = async (
  appointmentId: number,
  { service_id, quantity, service_date }: { service_id: number; quantity: number; service_date: string }
) => {
  const billAppointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!billAppointment) throw new Error('Appointment not found');
  let payment = await prisma.payment.findUnique({ where: { appointment_id: appointmentId } });
  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        appointment_id: appointmentId,
        patient_id: billAppointment.patient_id,
        bill_date: new Date(),
        payment_date: new Date(),
        discount: 0,
        total_amount: 0,
        amount_paid: 0,
        payment_method: 'CASH',
        status: 'UNPAID',
      },
    });
  }
  // Get service info
  const service = await prisma.services.findUnique({ where: { id: service_id } });
  if (!service) throw new Error('Service not found');
  const total_cost = service.price * quantity;
  // Create bill
  const bill = await prisma.patientBills.create({
    data: {
      bill_id: payment.id,
      service_id,
      service_date: new Date(service_date),
      quantity,
      unit_cost: service.price,
      total_cost,
    },
  });

  // Notify patient
  const patient = await prisma.patient.findUnique({ where: { id: billAppointment.patient_id } });
  if (patient && patient.user_id) {
    await createNotification({
      userId: patient.user_id,
      title: 'New Bill Generated',
      message: 'A new bill has been generated for your appointment.',
      link: '/appointments',
    });
  }
  return bill;
};

export const deleteBillFromAppointment = async (billId: number) => {
  return prisma.patientBills.delete({ where: { id: billId } });
};

export const generateFinalBillForAppointment = async (
  appointmentId: number,
  { discount, bill_date }: { discount: number; bill_date: string }
) => {
  // Find payment record
  const payment = await prisma.payment.findUnique({
    where: { appointment_id: appointmentId },
    include: { bills: true },
  });
  if (!payment) throw new Error('No bills to generate final bill');
  // Calculate total
  const total = payment.bills.reduce((sum: number, bill: { total_cost: number }) => sum + bill.total_cost, 0);
  const discountAmount = (total * discount) / 100;
  const payable = total - discountAmount;
  // Update payment record
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      discount,
      total_amount: total,
      bill_date: new Date(bill_date),
      // amount_paid, status, etc. can be updated later
    },
  });
  return { ...updated, payable, discountAmount };
};

export const getAllServices = async () => {
  return prisma.services.findMany();
};