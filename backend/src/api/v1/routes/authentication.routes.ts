import express from "express";
import { login, register } from "../controllers/authentication.controller";

const router = express.Router();

// Login route
router.post("/login", login);

//Register route
router.post("/register", register);

export default router;