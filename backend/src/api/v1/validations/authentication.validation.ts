import { z } from "zod";

// Schema for login
export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

// Schema for register
export const registerSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});