import { z } from "zod";

// Validation schema for patient registration
export const patientRegistrationSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  date_of_birth: z.string().transform((str) => new Date(str)),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email format"),
  marital_status: z.string().min(1, "Marital status is required"),
  address: z.string().min(1, "Address is required"),
  emergency_contact_name: z.string().min(1, "Emergency contact name is required"),
  emergency_contact_number: z.string().min(10, "Emergency contact number must be at least 10 digits"),
  relation: z.string().min(1, "Relation is required"),
  blood_group: z.string().optional(),
  allergies: z.string().optional(),
  medical_conditions: z.string().optional(),
  medical_history: z.string().optional(),
  insurance_provider: z.string().optional(),
  insurance_number: z.string().optional(),
  privacy_consent: z.string().transform(val => val === 'true' || val === '1' || val === 'on'),
  service_consent: z.string().transform(val => val === 'true' || val === '1' || val === 'on'),
  medical_consent: z.string().transform(val => val === 'true' || val === '1' || val === 'on'),
  img: z.string().optional(),
  colorCode: z.string().optional(),
});