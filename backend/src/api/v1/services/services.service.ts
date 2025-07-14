import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createService = async (data: { service_name: string; description: string; price: number }) => {
  return prisma.services.create({
    data,
  });
};

export const getAllServices = async () => {
  return prisma.services.findMany({
    orderBy: { created_at: 'desc' },
  });
}; 