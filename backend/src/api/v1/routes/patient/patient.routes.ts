import express, { NextFunction, Request, Response } from "express";
import { checkAccess } from "../../middlewares/authentication.middleware";
import { verifyJWT } from "../../middlewares/jwt.middleware";
import { registerPatientDetails, checkPatientRegistration, getPatientDashboardStats, getPatientProfile } from "../../controllers/patient.controller";
import { upload } from "../../middlewares/imageUpload.middleware";


const router = express.Router();

router.get("/check-registration",verifyJWT,checkPatientRegistration);

router.post("/register",verifyJWT,upload.single('img'),(req:Request, res:Response, next:NextFunction) => 
  {
    const userRole = req.role;
    if (!userRole) {
      res.status(403).json({ message: "Access denied" });
      return;
    }
    checkAccess(userRole)(req, res, next);
  },
  registerPatientDetails
);

router.get('/dashboard', verifyJWT, checkAccess('PATIENT'), getPatientDashboardStats);
router.get('/profile', verifyJWT, checkAccess('PATIENT'), getPatientProfile);

export default router;