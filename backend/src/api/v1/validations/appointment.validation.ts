import { z } from "zod";

// Define the appointment status enum to match Prisma schema
export const AppointmentStatus = {
  PENDING: 'PENDING',
  SCHEDULED: 'SCHEDULED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;

// Schema for creating a new appointment
export const createAppointmentSchema = z.object({
  doctor_id: z.string().min(1, "Doctor ID is required"),
  appointment_date: z.string()
    .min(1, "Appointment date is required")
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    }, "Appointment date cannot be in the past"),
  time: z.string()
    .min(1, "Appointment time is required")
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"),
  type: z.string()
    .min(1, "Appointment type is required")
    .max(50, "Appointment type must be less than 50 characters"),
  note: z.string().max(500, "Note must be less than 500 characters").optional(),
  reason: z.string().max(500, "Reason must be less than 500 characters").optional(),
});

// Schema for updating an appointment
export const updateAppointmentSchema = z.object({
  status: z.enum([
    AppointmentStatus.PENDING,
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.COMPLETED
  ], {
    errorMap: () => ({ message: "Invalid appointment status" })
  }),
  reason: z.string().max(500, "Reason must be less than 500 characters").optional(),
});

// Type for the validated appointment data
export type CreateAppointmentData = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentData = z.infer<typeof updateAppointmentSchema>; 