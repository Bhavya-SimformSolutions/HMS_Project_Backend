import { z } from 'zod';

export const workingDaySchema = z.object({
  day: z.string(),
  start_time: z.string(),
  close_time: z.string(),
});

export const createDoctorSchema = z.object({
  type: z.enum(['FULL', 'PART']),
  name: z.string().min(1),
  specialization: z.string().min(1),
  department: z.string().min(1),
  license_number: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),
  address: z.string().min(1),
  password: z.string().min(6),
  working_days: z.array(workingDaySchema),
});

export const doctorAppointmentStatusSchema = z.object({
  status: z.string(),
  reason: z.string().optional(),
});

export const vitalSignsSchema = z.object({
  temperature: z.number(),
  blood_pressure: z.string(),
  heart_rate: z.number(),
  weight: z.number(),
  height: z.number(),
  respiratory_rate: z.number().optional(),
  oxygen_saturation: z.number().optional(),
});

export const diagnosisSchema = z.object({
  symptoms: z.string(),
  diagnosis: z.string(),
  prescribed_medications: z.string().optional(),
  notes: z.string().optional(),
  follow_up_plan: z.string().optional(),
});

export const addBillSchema = z.object({
  service_id: z.number(),
  quantity: z.number().min(1),
  service_date: z.string(), // ISO date string
});

export const generateFinalBillSchema = z.object({
  discount: z.number().min(0).max(100), // percent
  bill_date: z.string(), // ISO date string
});

export const editBillSchema = z.object({
  service_id: z.number().optional(),
  quantity: z.number().min(1).optional(),
  service_date: z.string().optional(), // ISO date string
});

export const editFinalBillSchema = z.object({
  discount: z.number().min(0).max(100).optional(), // percent
  bill_date: z.string().optional(), // ISO date string
});