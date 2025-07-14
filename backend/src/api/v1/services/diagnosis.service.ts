import { PrismaClient, Diagnosis } from '@prisma/client';
const prisma = new PrismaClient();

export const getDiagnosisForAppointmentService = async (appointmentId: number): Promise<Diagnosis[]> => {
  const medicalRecord = await prisma.medicalRecords.findUnique({
    where: { appointment_id: appointmentId },
    include: { diagnosis: true },
  });
  if (!medicalRecord) {
    return [];
  }
  return medicalRecord.diagnosis;
};

export interface DiagnosisData {
  symptoms: string;
  diagnosis: string;
  prescribed_medications?: string;
  notes?: string;
  follow_up_plan?: string;
}

export const addDiagnosisForAppointmentService = async (
  appointmentId: number,
  doctorId: string,
  patientId: string,
  data: DiagnosisData
) => {
  let medicalRecord = await prisma.medicalRecords.findUnique({
    where: { appointment_id: appointmentId },
  });
  if (!medicalRecord) {
    medicalRecord = await prisma.medicalRecords.create({
      data: {
        appointment_id: appointmentId,
        patient_id: patientId,
        doctor_id: doctorId,
      },
    });
  }
  return prisma.diagnosis.create({
    data: {
      symptoms: data.symptoms,
      diagnosis: data.diagnosis,
      prescribed_medications: data.prescribed_medications,
      notes: data.notes,
      follow_up_plan: data.follow_up_plan,
      medical_id: medicalRecord.id,
      doctor_id: doctorId,
      patient_id: patientId,
    },
  });
};