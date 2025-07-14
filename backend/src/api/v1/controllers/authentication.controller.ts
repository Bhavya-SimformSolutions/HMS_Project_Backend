import { Request, Response } from "express";
import { z } from "zod";
import { RegisterRequestBody } from "../interfaces/types/types";
import { loginService, registerService } from '../services/authentication.service';
import { loginSchema } from "../validations/authentication.validation";

/**
 * Handles user login by validating credentials, generating a JWT token, and returning it to the client.
 *
 * @param req - The HTTP request object containing the user's login credentials in the body.
 * @param res - The HTTP response object used to send the response back to the client.
 * @returns A Promise that resolves to void.
 *
 * @throws {z.ZodError} If the input validation fails.
 * @throws {Error} If an internal server error occurs.
 *
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedBody = loginSchema.parse(req.body);
    const result = await loginService(validatedBody);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        message: "Invalid input", 
        errors: error.errors 
      });
    } else {
      res.status(401).json({ message: error instanceof Error ? error.message : "Internal server error" });
    }
  }
};

/**
 * Handles user registration by validating the request body, checking for existing users,
 * hashing the password, and creating a new user in the database.
 *
 * @param req - The HTTP request object containing the registration details in the body.
 * @param res - The HTTP response object used to send the response back to the client.
 * 
 * @throws {z.ZodError} If the request body validation fails.
 * @throws {Error} If an unexpected error occurs during the registration process.
 *
 * @remarks
 * - The function uses `registerSchema` to validate the request body.
 * - If the email already exists in the database, a 409 Conflict response is sent.
 * - Passwords are hashed using bcrypt before storing them in the database.
 * - The created user is returned with selected fields: `id`, `email`, and `role`.
 *
 * @returns A JSON response with a success message and the newly created user details
 * if the registration is successful.
 *
 */
export const register = async (req: Request<object, object, RegisterRequestBody>, res: Response): Promise<void> => {
  try {
    const newUser = await registerService(req.body);
    res.status(201).json({
      message: "User registered successfully",
      user: newUser
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        message: "Validation failed", 
        errors: error.errors 
      });
    } else {
      res.status(400).json({ message: error instanceof Error ? error.message : "Internal server error" });
    }
  }
};