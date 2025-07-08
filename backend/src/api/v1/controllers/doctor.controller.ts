import { Request, Response } from 'express';
import { createDoctorService, getAllDoctorsService, getDoctorsForPatientsService, getAppointmentByIdService, addVitalSignsService, getDiagnosisForAppointmentService, getDoctorAppointmentsByUserId, updateDoctorAppointmentStatus as updateDoctorAppointmentStatusService, addDiagnosisForAppointmentFull, getBillsForAppointment as getBillsForAppointmentService, addBillToAppointment as addBillToAppointmentService, deleteBillFromAppointment as deleteBillFromAppointmentService, generateFinalBillForAppointment as generateFinalBillForAppointmentService, getAllServices as getAllServicesService, getDoctorDashboardStatsService, getPaginatedDoctorPatientsService, getPaginatedDoctorBillingOverviewService, getPaginatedDoctorsForAdminService } from '../services/doctor.service';
import { createDoctorSchema, doctorAppointmentStatusSchema, vitalSignsSchema, diagnosisSchema, addBillSchema, generateFinalBillSchema } from '../validations/doctor.validation';

export const createDoctor = async (req: Request, res: Response) => {
  try {
    const data = createDoctorSchema.parse(req.body);
    const doctor = await createDoctorService(data);
    res.status(201).json(doctor);
  } catch (error: unknown) {
    console.error(error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: 'Unknown error' });
    }
  }
};

export const getAllDoctors = async (req: Request, res: Response) => {
  try {
    const doctors = await getAllDoctorsService();
    res.json(doctors);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Unknown error' });
    }
  }
};

export const getDoctorAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, message: 'Unauthorized: Missing userId' });
      return;
    }
    const appointments = await getDoctorAppointmentsByUserId(req.userId);
    if (!appointments) {
      res.status(404).json({ success: false, message: 'Doctor profile not found' });
      return;
    }
    res.status(200).json({ success: true, data: appointments });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Unknown error' });
    }
  }
};

export const getDoctorsForPatients = async (req: Request, res: Response) => {
  try {
    const doctors = await getDoctorsForPatientsService();
    res.json(doctors);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Unknown error' });
    }
  }
}; 

export const updateDoctorAppointmentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Unauthorized: Missing userId' });
      return;
    }
    const userId = req.userId;
    const appointmentId = parseInt(req.params.id);
    if (isNaN(appointmentId)) {
      res.status(400).json({ message: "Invalid appointment ID" });
      return;
    }
    const { status, reason } = doctorAppointmentStatusSchema.parse(req.body);
    const result = await updateDoctorAppointmentStatusService(userId, appointmentId, status, reason);
    if (result.error === 'Doctor not found') {
      res.status(403).json({ message: "Access denied: You don't have permission to access this !" });
      return;
    }
    if (result.error === 'Appointment not found') {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }
    if (result.error === 'Invalid status value') {
      res.status(400).json({ message: "Invalid status value" });
      return;
    }
    res.status(200).json({ success: true, data: result.updated });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAppointmentById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (req.role !== 'DOCTOR') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    const appointmentId = parseInt(req.params.id, 10);
    const appointment = await getAppointmentByIdService(
      appointmentId,
    );
    if (!appointment) {
      res.status(404).json({ message: 'Appointment not found' });
      return;
    }
    res.status(200).json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointment', error });
  }
};

export const addVitalSigns = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (req.role !== 'DOCTOR') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    const appointmentId = parseInt(req.params.id, 10);
    const vitalSignsData = vitalSignsSchema.parse(req.body);
    const newVitals = await addVitalSignsService(
      appointmentId,
      vitalSignsData,
    );
    res.status(201).json(newVitals);
  } catch (error) {
    res.status(500).json({ message: 'Error adding vital signs', error });
  }
};

export const getDiagnosisForAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.role !== 'DOCTOR') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    const appointmentId = parseInt(req.params.id, 10);
    const diagnosis = await getDiagnosisForAppointmentService(appointmentId);
    res.status(200).json(diagnosis);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching diagnosis', error });
  }
};

export const addDiagnosisForAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.role !== 'DOCTOR' || !req.userId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    const appointmentId = parseInt(req.params.id, 10);
    const diagnosisData = diagnosisSchema.parse(req.body);
    const result = await addDiagnosisForAppointmentFull(req.userId, appointmentId, diagnosisData);
    if (result.error === 'Doctor profile not found') {
      res.status(403).json({ message: "Doctor profile not found" });
      return;
    }
    if (result.error === 'Appointment not found') {
      res.status(404).json({ message: 'Appointment not found' });
      return;
    }
    res.status(201).json(result.newDiagnosis);
  } catch (error) {
    console.error('Error adding diagnosis:', error);
    res.status(500).json({ message: 'Error adding diagnosis', error });
  }
};

export const getBillsForAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const appointmentId = parseInt(req.params.id, 10);
    if (isNaN(appointmentId)) {
      res.status(400).json({ message: 'Invalid appointment ID' });
      return;
    }
    const bills = await getBillsForAppointmentService(appointmentId);
    res.status(200).json(bills);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bills', error });
  }
};

export const addBillToAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const appointmentId = parseInt(req.params.id, 10);
    if (isNaN(appointmentId)) {
      res.status(400).json({ message: 'Invalid appointment ID' });
      return;
    }
    const billData = addBillSchema.parse(req.body);
    const bill = await addBillToAppointmentService(appointmentId, billData);
    res.status(201).json(bill);
  } catch (error) {
    res.status(500).json({ message: 'Error adding bill', error });
  }
};

export const deleteBillFromAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const billId = parseInt(req.params.billId, 10);
    if (isNaN(billId)) {
      res.status(400).json({ message: 'Invalid bill ID' });
      return;
    }
    await deleteBillFromAppointmentService(billId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting bill', error });
  }
};

export const generateFinalBillForAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const appointmentId = parseInt(req.params.id, 10);
    if (isNaN(appointmentId)) {
      res.status(400).json({ message: 'Invalid appointment ID' });
      return;
    }
    const data = generateFinalBillSchema.parse(req.body);
    const result = await generateFinalBillForAppointmentService(appointmentId, data);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error generating final bill', error });
  }
};

export const getAllServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const services = await getAllServicesService();
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching services', error });
  }
};

/**
 * Controller for doctor dashboard stats
 */
export const getDoctorDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId || typeof req.userId !== 'string') {
      res.status(401).json({ message: 'Unauthorized: userId missing' });
      return;
    }
    const stats = await getDoctorDashboardStatsService(req.userId);
    res.status(200).json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch doctor dashboard stats' });
  }
};

/**
 * Gets paginated, searchable, filterable patients for the logged-in doctor
 */
export const getPaginatedDoctorPatients = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Unauthorized: Missing userId' });
      return;
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || undefined;
    const { patients, total } = await getPaginatedDoctorPatientsService(req.userId, page, limit, search);
    res.status(200).json({ patients, total, page, limit });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
  }
};

/**
 * Gets paginated, searchable billing overview for the logged-in doctor
 */
export const getPaginatedDoctorBillingOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Unauthorized: Missing userId' });
      return;
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || undefined;
    const { bills, total } = await getPaginatedDoctorBillingOverviewService(req.userId, page, limit, search);
    res.status(200).json({ bills, total, page, limit });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
  }
};

/**
 * Gets paginated, searchable, sortable doctors for admin
 * GET /admin/doctors?page=1&limit=10&search=...&sortOrder=desc
 */
export const getPaginatedDoctorsForAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';
    const { doctors, total } = await getPaginatedDoctorsForAdminService(page, limit, search, sortOrder);
    res.status(200).json({ doctors, total, page, limit });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
  }
};