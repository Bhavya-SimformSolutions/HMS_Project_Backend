import { z } from 'zod';

export const getVitalsByAppointmentIdSchema = z.object({
  appointmentId: z.string().regex(/^\d+$/).transform(Number),
}); 