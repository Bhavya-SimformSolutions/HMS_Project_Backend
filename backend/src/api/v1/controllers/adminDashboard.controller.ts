import { Request, Response } from "express";
import { getAdminDashboardStatsService, getAdminBillingOverviewService } from "../services/admin.service";

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

export const getAdminBillingOverview = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
    
    const filters = {
      doctor: req.query.doctor as string,
      status: req.query.status as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string
    };
    
    const result = await getAdminBillingOverviewService(page, limit, search, sortOrder, filters);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch admin billing overview' });
  }
};