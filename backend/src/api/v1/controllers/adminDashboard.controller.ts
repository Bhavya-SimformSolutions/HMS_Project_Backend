import { Request, Response } from "express";
import { getAdminDashboardStatsService } from "../services/admin.service";

export const getAdminDashboard = (req: Request, res: Response): void => {
  res.send("Welcome to the Admin Dashboard!");
};

export const getAdminDashboardStats = async (req: Request, res: Response) => {
  try {
    if (!req.userId || typeof req.userId !== 'string') {
      res.status(401).json({ message: 'Unauthorized: userId missing' });
      return;
    }
    const stats = await getAdminDashboardStatsService(req.userId);
    res.status(200).json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch admin dashboard stats' });
  }
};