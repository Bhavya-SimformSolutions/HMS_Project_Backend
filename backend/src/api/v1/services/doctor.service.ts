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

  // Notify patient with enhanced message
  if (vitalAppointment) {
    const patient = await prisma.patient.findUnique({ 
      where: { id: vitalAppointment.patient_id },
      select: { user_id: true, first_name: true, last_name: true }
    });
    const doctor = await prisma.doctor.findUnique({ 
      where: { id: vitalAppointment.doctor_id },
      select: { name: true }
    });
    
    if (patient && patient.user_id && doctor) {
      await createNotification({
        userId: patient.user_id,
        title: '📊 New Vital Signs Recorded',
        message: `Your vital signs have been recorded during your appointment with Dr. ${doctor.name}. View your health records to see the details.`,
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

  // Notify patient with enhanced message
  const patient = await prisma.patient.findUnique({ 
    where: { id: patientId },
    select: { user_id: true, first_name: true, last_name: true }
  });
  const doctor = await prisma.doctor.findUnique({ 
    where: { id: doctorId },
    select: { name: true }
  });
  
  if (patient && patient.user_id && doctor) {
    await createNotification({
      userId: patient.user_id,
      title: '📋 New Diagnosis Added',
      message: `Dr. ${doctor.name} has added a new diagnosis to your medical record. Please review the details in your appointment history.`,
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

  // Enhanced notification based on status change
  const patient = await prisma.patient.findUnique({ 
    where: { id: updated.patient_id },
    select: { user_id: true, first_name: true, last_name: true }
  });
  
  if (patient && patient.user_id) {
    let title = '';
    let message = '';
    let emoji = '';
    
    switch (status) {
      case 'SCHEDULED':
        emoji = '✅';
        title = 'Appointment Approved!';
        message = `Good news! Dr. ${doctor.name} has approved your appointment. Your appointment is now confirmed.`;
        break;
      case 'COMPLETED':
        emoji = '🏥';
        title = 'Appointment Completed';
        message = `Your appointment with Dr. ${doctor.name} has been marked as completed. Thank you for visiting us!`;
        break;
      case 'CANCELLED':
        emoji = '❌';
        title = 'Appointment Cancelled';
        message = `Unfortunately, your appointment with Dr. ${doctor.name} has been cancelled. ${reason ? `Reason: ${reason}` : 'Please contact us for rescheduling.'}`;
        
        // Notify admins about doctor-initiated cancellations
        const appointmentDetails = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          select: { appointment_date: true, time: true }
        });
        
        if (appointmentDetails) {
          const appointmentDate = new Date(appointmentDetails.appointment_date);
          const today = new Date();
          const timeDiff = appointmentDate.getTime() - today.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          if (daysDiff <= 2) { // Within 2 days
            // Get all admin users and send individual notifications
            const adminUsers = await prisma.user.findMany({
              where: { role: 'ADMIN' }
            });
            
            const appointmentDateStr = appointmentDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            
            for (const admin of adminUsers) {
              await createNotification({
                userId: admin.id,
                title: '🚨 Doctor Cancelled Appointment',
                message: `Dr. ${doctor.name} cancelled appointment with ${patient.first_name} ${patient.last_name} on ${appointmentDateStr} at ${appointmentDetails.time}. ${reason ? `Reason: ${reason}` : 'No reason provided.'}`,
                link: '/admin/appointments'
              });
            }
          }
        }
        break;
      default:
        emoji = '📋';
        title = 'Appointment Status Updated';
        message = `Your appointment status was changed to ${status}.`;
    }
    
    await createNotification({
      userId: patient.user_id,
      title: `${emoji} ${title}`,
      message: message,
      link: '/appointments',
    });
    
    // Send reminder notification for scheduled appointments
    if (status === 'SCHEDULED') {
      const appointmentDetails = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { appointment_date: true, time: true }
      });
      
      if (appointmentDetails) {
        const appointmentDateStr = new Date(appointmentDetails.appointment_date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        // Send reminder notification (could be scheduled for later in production)
        await createNotification({
          userId: patient.user_id,
          title: '⏰ Appointment Reminder',
          message: `Don't forget! You have an appointment with Dr. ${doctor.name} on ${appointmentDateStr} at ${appointmentDetails.time}.`,
          link: '/appointments',
        });
      }
    }
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
  return payment;
};

export const addBillToAppointment = async (
  appointmentId: number,
  { service_id, quantity, service_date }: { service_id: number; quantity: number; service_date: string }
) => {
  const billAppointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!billAppointment) throw new Error('Appointment not found');
  let payment = await prisma.payment.findUnique({ where: { appointment_id: appointmentId }, include: { bills: true } });
  if (!payment) {
    await prisma.payment.create({
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
        finalized: false,
      },
    });
    payment = await prisma.payment.findUnique({ where: { appointment_id: appointmentId }, include: { bills: true } });
  }
  if (!payment) throw new Error('Payment not found');
  // Allow adding bills even if finalized
  const service = await prisma.services.findUnique({ where: { id: service_id } });
  if (!service) throw new Error('Service not found');
  const total_cost = service.price * quantity;
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
  // Recalculate payment summary
  await recalculatePaymentSummary(payment.id);
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

export const deleteBillFromAppointment = async (appointmentId: number, billId: number) => {
  const payment = await prisma.payment.findUnique({ where: { appointment_id: appointmentId } });
  if (!payment) throw new Error('Payment not found');
  // Allow deleting bills even if finalized
  await prisma.patientBills.delete({ where: { id: billId } });
  await recalculatePaymentSummary(payment.id);
  return true;
};

export const editBillInAppointment = async (
  appointmentId: number,
  billId: number,
  data: { service_id?: number; quantity?: number; service_date?: string }
) => {
  const payment = await prisma.payment.findUnique({ where: { appointment_id: appointmentId } });
  if (!payment) throw new Error('Payment not found');
  const bill = await prisma.patientBills.findUnique({ where: { id: billId } });
  if (!bill) throw new Error('Bill not found');
  let updateData: any = {};
  if (data.service_id) {
    const service = await prisma.services.findUnique({ where: { id: data.service_id } });
    if (!service) throw new Error('Service not found');
    updateData.service_id = data.service_id;
    updateData.unit_cost = service.price;
    updateData.total_cost = service.price * (data.quantity ?? bill.quantity);
  }
  if (data.quantity) {
    updateData.quantity = data.quantity;
    if (updateData.unit_cost) {
      updateData.total_cost = updateData.unit_cost * data.quantity;
    } else {
      updateData.total_cost = bill.unit_cost * data.quantity;
    }
  }
  if (data.service_date) {
    updateData.service_date = new Date(data.service_date);
  }
  const updatedBill = await prisma.patientBills.update({ where: { id: billId }, data: updateData });
  await recalculatePaymentSummary(payment.id);
  return updatedBill;
};

export const editFinalBillSummary = async (
  appointmentId: number,
  data: { discount?: number; bill_date?: string }
) => {
  const payment = await prisma.payment.findUnique({ where: { appointment_id: appointmentId } });
  if (!payment) throw new Error('Payment not found');
  let updateData: any = {};
  if (data.discount !== undefined) updateData.discount = data.discount;
  if (data.bill_date) updateData.bill_date = new Date(data.bill_date);
  await prisma.payment.update({ where: { id: payment.id }, data: updateData });
  await recalculatePaymentSummary(payment.id);
  // Fetch updated payment with bills
  const updatedWithBills = await prisma.payment.findUnique({ where: { id: payment.id }, include: { bills: true } });
  return updatedWithBills;
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
      finalized: true,
    },
    include: { bills: { include: { service: true } } },
  });
  return { ...updated, bills: updated.bills, payable, discountAmount };
};

// Helper to recalculate payment summary
async function recalculatePaymentSummary(paymentId: number) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { bills: true } });
  if (!payment) return;
  const total = payment.bills.reduce((sum: number, bill: { total_cost: number }) => sum + bill.total_cost, 0);
  const discountAmount = (total * (payment.discount || 0)) / 100;
  const payable = total - discountAmount;
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      total_amount: total,
      // Optionally update status, etc.
    },
  });
  return { total, discountAmount, payable };
}

export const getAllServices = async () => {
  return prisma.services.findMany();
};
/**
 * Returns dashboard stats for a doctor: total patients, total appointments, total consultations,
 * appointments by month (with completed), and today's working hours.
 * @param userId - The user ID of the doctor
 */
export const getDoctorDashboardStatsService = async (userId: string) => {
  // Find the doctor by userId
  const doctor = await prisma.doctor.findUnique({
    where: { user_id: userId },
    include: { working_days: true },
  });
  if (!doctor) throw new Error('Doctor not found');

  // Total patients (distinct patients for this doctor)
  const uniquePatients = await prisma.appointment.findMany({
    where: { doctor_id: doctor.id },
    select: { patient_id: true },
    distinct: ['patient_id']
  });
  const totalPatients = uniquePatients.length;

  // Total appointments for this doctor
  const totalAppointments = await prisma.appointment.count({
    where: { doctor_id: doctor.id }
  });

  // Total consultations (completed appointments)
  const totalConsultations = await prisma.appointment.count({
    where: { doctor_id: doctor.id, status: 'COMPLETED' }
  });

  // Appointments by month (for chart)
  const appointments = await prisma.appointment.findMany({
    where: { doctor_id: doctor.id },
    select: { appointment_date: true, status: true },
    orderBy: { appointment_date: 'asc' }
  });
  // Group by month
  const months: string[] = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const chartData: { month: string; appointments: number; completed: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const monthAppointments = appointments.filter(a => a.appointment_date.getMonth() === i);
    chartData.push({
      month: months[i],
      appointments: monthAppointments.length,
      completed: monthAppointments.filter(a => a.status === 'COMPLETED').length
    });
  }

  // Today's working hours (fix day string format)
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  // Capitalize first letter, rest lowercase (e.g., 'Monday')
  const formattedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1).toLowerCase();
  const todayWorking = doctor.working_days.find(wd => wd.day === formattedDay);
  const workingHoursToday = todayWorking ? `${todayWorking.start_time} - ${todayWorking.close_time}` : 'Not Available';

  // Recent appointments (last 5, newest first)
  const recentAppointments = await prisma.appointment.findMany({
    where: { doctor_id: doctor.id },
    orderBy: { appointment_date: 'desc' },
    take: 5,
    include: {
      patient: {
        select: {
          first_name: true,
          last_name: true,
          gender: true,
        }
      },
      doctor: {
        select: {
          name: true,
          specialization: true,
        }
      }
    }
  });

  return {
    doctorName: doctor.name,
    totalPatients,
    totalAppointments,
    totalConsultations,
    appointmentsByMonth: chartData,
    workingHoursToday,
    recentAppointments
  };
};

/**
 * Fetches paginated, searchable, filterable patients for a doctor.
 * @param doctorUserId - The userId of the doctor
 * @param page - Page number (1-based)
 * @param limit - Number of patients per page
 * @param search - Optional search string (name/email/phone)
 * @returns { patients, total }
 */
export const getPaginatedDoctorPatientsService = async (doctorUserId: string, page: number, limit: number, search?: string) => {
  // Find doctor by userId
  const doctor = await prisma.doctor.findUnique({ where: { user_id: doctorUserId } });
  if (!doctor) throw new Error('Doctor not found');
  const skip = (page - 1) * limit;
  // Find unique patient IDs for this doctor
  const patientIdsResult = await prisma.appointment.findMany({
    where: { doctor_id: doctor.id },
    select: { patient_id: true },
    distinct: ['patient_id']
  });
  const patientIds = patientIdsResult.map(r => r.patient_id);
  // Build where clause for search
  let where: any = { id: { in: patientIds } };
  if (search) {
    where = {
      AND: [
        { id: { in: patientIds } },
        {
          OR: [
            { first_name: { contains: search, mode: 'insensitive' as any } },
            { last_name: { contains: search, mode: 'insensitive' as any } },
            { email: { contains: search, mode: 'insensitive' as any } },
            { phone: { contains: search, mode: 'insensitive' as any } },
          ]
        }
      ]
    };
  }
  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.patient.count({ where }),
  ]);
  return { patients, total };
};

/**
 * Fetches a paginated, searchable billing overview for a doctor (across all their patients/appointments).
 * @param doctorUserId - The userId of the doctor
 * @param page - Page number (1-based)
 * @param limit - Number of bills per page
 * @param search - Optional search string (patient name, bill ID)
 * @returns { bills, total }
 */
export const getPaginatedDoctorBillingOverviewService = async (
  doctorUserId: string,
  page: number,
  limit: number,
  search?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
  // Find doctor by userId
  const doctor = await prisma.doctor.findUnique({ where: { user_id: doctorUserId } });
  if (!doctor) throw new Error('Doctor not found');
  const skip = (page - 1) * limit;

  // Find all appointment IDs for this doctor
  const appointmentIdsResult = await prisma.appointment.findMany({
    where: { doctor_id: doctor.id },
    select: { id: true }
  });
  const appointmentIds = appointmentIdsResult.map(r => r.id);
  if (appointmentIds.length === 0) {
    return { bills: [], total: 0 };
  }

  // Build where clause for search
  let where: any = {
    payment: {
      appointment_id: { in: appointmentIds }
    }
  };
  if (search) {
    where = {
      AND: [
        { payment: { appointment_id: { in: appointmentIds } } },
        {
          OR: [
            { id: { equals: parseInt(search) || undefined } }, // bill ID
            { payment: {
                appointment: {
                  patient: {
                    OR: [
                      { first_name: { contains: search, mode: 'insensitive' as any } },
                      { last_name: { contains: search, mode: 'insensitive' as any } }
                    ]
                  }
                }
              }
            }
          ]
        }
      ]
    };
  }

  // Query bills with joins
  const [bills, total] = await Promise.all([
    prisma.patientBills.findMany({
      where,
      skip,
      take: limit,
      orderBy: { service_date: sortOrder },
      include: {
        service: true,
        payment: {
          include: {
            appointment: {
              include: {
                patient: true
              }
            }
          }
        }
      }
    }),
    prisma.patientBills.count({ where })
  ]);

  // Map to a flat structure for frontend
  const result = bills.map(bill => ({
    id: bill.id,
    serviceName: bill.service?.service_name,
    serviceDate: bill.service_date,
    quantity: bill.quantity,
    unitCost: bill.unit_cost,
    totalCost: bill.total_cost,
    patient: bill.payment?.appointment?.patient,
    appointmentId: bill.payment?.appointment?.id,
    status: bill.payment?.status,
    billDate: bill.payment?.bill_date,
    paymentDate: bill.payment?.payment_date,
    discount: bill.payment?.discount // Added discount to result
  }));

  return { bills: result, total };
};

/**
 * Service for paginated, searchable, sortable doctors for admin
 */
export const getPaginatedDoctorsForAdminService = async (
  page: number = 1,
  limit: number = 10,
  search: string = '',
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
  const skip = (page - 1) * limit;
  let where: any = {};
  if (search) {
    where = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { specialization: { contains: search, mode: 'insensitive' } },
        { license_number: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    };
  }
  const [doctors, total] = await Promise.all([
    prisma.doctor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: sortOrder },
      include: { working_days: true },
    }),
    prisma.doctor.count({ where })
  ]);
  return { doctors, total };
};
