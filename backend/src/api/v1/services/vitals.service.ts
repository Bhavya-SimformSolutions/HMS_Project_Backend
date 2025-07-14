import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getVitalsByAppointmentId(appointmentId: number) {
  // Find the medical record for this appointment
  const medicalRecord = await prisma.medicalRecords.findUnique({
    where: { appointment_id: appointmentId },
    select: { id: true },
  });
  if (!medicalRecord) return [];
  // Fetch all vital signs for this medical record
  return prisma.vitalSigns.findMany({
    where: { medical_id: medicalRecord.id },
    orderBy: { created_at: 'asc' },
    select: {
      systolic: true,
      diastolic: true,
      heart_rate: true,
      created_at: true,
    },
  });
} 