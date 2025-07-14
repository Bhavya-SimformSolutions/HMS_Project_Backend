import { z } from 'zod';

export const serviceSchema = z.object({
  service_name: z.string(),
  description: z.string(),
  price: z.number(),
});
