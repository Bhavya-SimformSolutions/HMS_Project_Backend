import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { loginSchema, registerSchema } from "../validations/authentication.validation";
import { RegisterRequestBody } from "../interfaces/types/types";
import { z } from "zod";

const prisma = new PrismaClient();

type LoginRequestBody = z.infer<typeof loginSchema>;

export const loginService = async (body: LoginRequestBody) => {
  const { email, password } = loginSchema.parse(body);
  const user = await prisma.user.findUnique({
    where: { email },
    include: { patient: true }
  });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    throw new Error("Invalid email or password");
  }
  if (!process.env.JWT_SECRET) {
    throw new Error("Secret key for JWT is not defined in the environment variables");
  }
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      firstName: user.firstName, // FIX: Use User table fields
      lastName: user.lastName,   // FIX: Use User table fields
      gender: user.patient?.gender
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName, // FIX: Use User table fields
      lastName: user.lastName,   // FIX: Use User table fields
      gender: user.patient?.gender
    }
  };
};

export const registerService = async (body: RegisterRequestBody) => {
  const { email, password, firstName, lastName } = registerSchema.parse(body);
  if (!email || !password) {
    throw new Error("Email and password are required");
  }
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("Email already exists");
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: "PATIENT",
      status: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
    }
  });
  return newUser;
};