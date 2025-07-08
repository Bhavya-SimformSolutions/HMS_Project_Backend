import { Request, Response } from "express";
import { z } from "zod";
import {
  createAppointmentService,
  getPatientAppointmentsService,
  getAppointmentByIdService,
  updateAppointmentStatusService,
  getAppointmentCountService,
  getDoctorsService,
  getPaginatedAppointmentsService,
} from "../services/appointment.service";
import { createAppointmentSchema, updateAppointmentSchema } from "../validations/appointment.validation";

/**
 * Creates a new appointment for a patient with a doctor.
 */
export const createAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }
    const validatedBody = createAppointmentSchema.parse(req.body);
    const appointment = await createAppointmentService(userId, validatedBody);
    res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      data: appointment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors,
      });
    } else {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
        error: process.env.NODE_ENV === "development" ? error : undefined,
      });
    }
  }
};

/**
 * Gets all appointments for the logged-in patient.
 */
export const getPatientAppointments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }
    const appointments = await getPatientAppointmentsService(userId);
    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

/**
 * Gets a specific appointment by ID.
 */
export const getAppointmentById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }
    const appointmentId = parseInt(req.params.id);
    if (isNaN(appointmentId)) {
      res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
      return;
    }
    const appointment = await getAppointmentByIdService(userId, appointmentId);
    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

/**
 * Updates the status of an appointment.
 */
export const updateAppointmentStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }
    const appointmentId = parseInt(req.params.id);
    if (isNaN(appointmentId)) {
      res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
      return;
    }
    const validatedBody = updateAppointmentSchema.parse(req.body);
    const updatedAppointment = await updateAppointmentStatusService(
      userId,
      appointmentId,
      validatedBody
    );
    res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
      data: updatedAppointment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors,
      });
    } else {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
        error: process.env.NODE_ENV === "development" ? error : undefined,
      });
    }
  }
};

/**
 * Gets the count of appointments for the logged-in patient.
 */
export const getAppointmentCount = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }
    const count = await getAppointmentCountService(userId);
    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

export const getDoctors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const doctors = await getDoctorsService();
    res.status(200).json({
      success: true,
      message: "Doctors fetched successfully",
      data: doctors,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to fetch doctors",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
};

/**
 * Gets a paginated list of all appointments (admin only)
 */
export const getPaginatedAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || undefined;
    const status = (req.query.status as string) || undefined;
    const { appointments, total } = await getPaginatedAppointmentsService(page, limit, search, status);
    res.status(200).json({ appointments, total, page, limit });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
  }
};
