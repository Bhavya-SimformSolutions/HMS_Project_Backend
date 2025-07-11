import express, { NextFunction, Request, Response } from "express";
import { checkAccess } from "../../middlewares/authentication.middleware";
import { verifyJWT } from "../../middlewares/jwt.middleware";
import { getAdminDashboard, getAdminDashboardStats, getAdminBillingOverview } from "../../controllers/adminDashboard.controller";
import { getPaginatedPatients } from '../../controllers/patient.controller';
import { getPaginatedAppointments } from '../../controllers/appointment.controller';

const router = express.Router();

router.get("/dashboard", verifyJWT, (req:Request, res:Response,next:NextFunction) => {
  const userRole  = req.role;
  if(!userRole){
    res.status(403).json({message:"Access denied"});
    return;
  }
  //function currying
  checkAccess(userRole)(req,res,next);
},
getAdminDashboard
);

router.get('/dashboard/stats', verifyJWT, checkAccess('ADMIN'), getAdminDashboardStats);

router.get('/patients', verifyJWT, checkAccess('ADMIN'), getPaginatedPatients);

router.get('/appointments', verifyJWT, checkAccess('ADMIN'), getPaginatedAppointments);

router.get('/billing', verifyJWT, checkAccess('ADMIN'), getAdminBillingOverview);

export default router;