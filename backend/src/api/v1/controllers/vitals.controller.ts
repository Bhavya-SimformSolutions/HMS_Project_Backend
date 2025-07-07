import { Request, Response } from 'express';
import { getVitalsByAppointmentIdSchema } from "../validations/vitals.validation";
import * as vitalsService from '../services/vitals.service';

export const getVitalsByAppointmentId = async (req: Request, res: Response) => {
  const parseResult = getVitalsByAppointmentIdSchema.safeParse({ appointmentId: req.params.id });
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid appointment id', details: parseResult.error.errors });
    return;
  }
  try {
    const vitals = await vitalsService.getVitalsByAppointmentId(parseResult.data.appointmentId);
    res.json({ vitals });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vitals' });
  }
}; 