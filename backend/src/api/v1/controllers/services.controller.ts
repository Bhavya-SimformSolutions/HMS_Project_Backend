import { Request, Response } from 'express';
import { createService, getAllServices } from '../services/services.service';
import { serviceSchema } from '../validations/service.validation';
import { z } from 'zod';

export const addService = async (req: Request, res: Response) => {
  try {
    const validatedData = serviceSchema.parse(req.body);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const newService = await createService(validatedData);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    res.status(201).json({ message: 'Service added successfully', data: newService });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation failed', errors: error.errors });
    } else {
      res.status(500).json({ message: 'Failed to add service', error: error instanceof Error ? error.message : String(error) });
    }
  }
};

export const getServices = async (req: Request, res: Response) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const services = await getAllServices();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    res.status(200).json({ data: services });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch services', error: error instanceof Error ? error.message : String(error) });
  }
};