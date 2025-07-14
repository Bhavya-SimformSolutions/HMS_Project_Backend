import { Request, Response } from "express";
import { z } from "zod";
import {
  registerPatientDetailsService,
  checkPatientRegistrationService,
  getPatientDashboardStatsService,
  getPaginatedPatientsService,
  getPatientProfileService,
  getPatientRecordsService,
  getPatientPrescriptionsService,
  getPatientBillingService,
  PatientRecordsFilters,
  PatientPrescriptionsFilters,
  PatientBillingFilters,
} from '../services/patient.service';

/**
 * Registers patient details in the system.
 *
 * This function handles the registration of patient details by validating the input data,
 * checking for existing patient records, and creating a new patient record in the database.
 * It also supports file uploads for patient images and validates the input using Zod schemas.
 *
 * @param req - The HTTP request object, which includes the user ID, body fields, and file data.
 * @param res - The HTTP response object used to send the response back to the client.
 * @returns A promise that resolves to void. Sends an appropriate HTTP response to the client.
 *
 * @throws {z.ZodError} If the input validation fails, a 400 response is sent with validation errors.
 * @throws {Error} If an unexpected error occurs, a 500 response is sent with an internal server error message.
 *
 * HTTP Responses:
 * - 201: Patient details registered successfully. Returns the patient details.
 * - 400: Validation failed or patient details already registered.
 * - 401: Unauthorized access if the user ID is missing.
 * - 500: Internal server error for unexpected issues.
 */
export const registerPatientDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const formData = { ...(req.body as Record<string, unknown>) };
    const patient = await registerPatientDetailsService(userId, formData, req.file);
    res.status(201).json({
      message: "Patient details registered successfully",
      patient,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        message: "Validation failed",
        errors: error.errors,
      });
    } else if (error instanceof Error && (error.message === 'Email already exists' || error.message === 'Patient details already registered')) {
      res.status(409).json({ message: error.message });
    } else {
      res.status(400).json({ message: error instanceof Error ? error.message : "Internal server error" });
    }
  }
};

/**
 * Checks if the patient is already registered or not.
 *
 * @param req - The HTTP request object, which should include the `userId` property.
 * @param res - The HTTP response object used to send the response.
 * @returns A promise that resolves to void. Sends a JSON response indicating whether the patient is registered.
 *
 * @throws {Error} If an unexpected error occurs during the process, a 500 status code is returned with an error message.
 *
 * HTTP Responses:
 * - 401 Unauthorized: If the `userId` is not present in the request.
 * - 200 OK: If the request is successful, returns a JSON object with `isRegistered` set to `true` or `false`.
 */
export const checkPatientRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const isRegistered = await checkPatientRegistrationService(userId);
    res.json({ isRegistered });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Internal server error" });
  }
};

/**
 * Controller for patient dashboard stats
 */
export const getPatientDashboardStats = async (req: Request, res: Response) => {
  try {
    if (!req.userId || typeof req.userId !== 'string') {
      res.status(401).json({ message: 'Unauthorized: userId missing' });
      return;
    }
    const stats = await getPatientDashboardStatsService(req.userId);
    res.status(200).json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch patient dashboard stats';
    res.status(500).json({ message });
  }
};

/**
 * Gets a paginated list of all patients (admin only)
 */
export const getPaginatedPatients = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || undefined;
    const sort = (req.query.sort as string) === 'asc' ? 'asc' : 'desc';
    const { patients, total } = await getPaginatedPatientsService(page, limit, search, sort);
    res.status(200).json({ patients, total, page, limit });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
  }
};

/**
 * Gets the profile of the logged-in patient
 */
export const getPatientProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const profile = await getPatientProfileService(userId);
    res.status(200).json({ data: profile }); // wrap in { data: ... } for frontend compatibility
  } catch (error) {
    res.status(404).json({ message: error instanceof Error ? error.message : 'Internal server error' });
  }
};

// Helper to safely parse filters
function parseFilters(filters: unknown): unknown {
  if (typeof filters === 'string') {
    try {
      return JSON.parse(filters);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Get paginated, searchable, filterable completed appointments for patient records page
 */
export const getPatientRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || undefined;
    const filters = parseFilters(req.query.filters) as PatientRecordsFilters | undefined;
    const result = await getPatientRecordsService(userId, page, limit, search, filters);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Internal server error' });
  }
};

/**
 * Get paginated, searchable, filterable prescriptions (diagnoses) for patient
 */
export const getPatientPrescriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || undefined;
    const filters = parseFilters(req.query.filters) as PatientPrescriptionsFilters | undefined;
    const result = await getPatientPrescriptionsService(userId, page, limit, search, filters);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Internal server error' });
  }
};

/**
 * Get paginated, searchable, filterable billing/payments for patient
 */
export const getPatientBilling = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || undefined;
    const filters = parseFilters(req.query.filters) as PatientBillingFilters | undefined;
    const result = await getPatientBillingService(userId, page, limit, search, filters);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Internal server error' });
  }
};