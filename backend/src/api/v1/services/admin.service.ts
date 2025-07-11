import { PrismaClient, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface AdminChartData {
  month: string;
  SCHEDULED: number;
  PENDING: number;
  COMPLETED: number;
  CANCELLED: number;
}

export const getAdminDashboardStatsService = async (userId: string) => {
  // Get admin name
  const admin = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  const adminName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : 'Admin';

  // Total counts
  const [totalAppointments, totalPatients, totalDoctors] = await Promise.all([
    prisma.appointment.count(),
    prisma.patient.count(),
    prisma.doctor.count()
  ]);

  // Appointments by month (with status breakdown)
  const appointments = await prisma.appointment.findMany({
    select: { appointment_date: true, status: true },
    orderBy: { appointment_date: 'asc' }
  });
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const statusList = ['SCHEDULED', 'PENDING', 'COMPLETED', 'CANCELLED'];
  const chartData: AdminChartData[] = [];
  for (let i = 0; i < 12; i++) {
    const monthAppointments = appointments.filter(a => a.appointment_date.getMonth() === i);
    const monthData: AdminChartData = {
      month: months[i],
      SCHEDULED: 0,
      PENDING: 0,
      COMPLETED: 0,
      CANCELLED: 0
    };
    statusList.forEach(status => {
      (monthData[status as keyof AdminChartData] as number) = monthAppointments.filter(a => a.status === status).length;
    });
    chartData.push(monthData);
  }

  // Appointments by status (for donut)
  const statusCounts: { [status: string]: number } = {};
  for (const status of statusList) {
    statusCounts[status] = await prisma.appointment.count({ where: { status: status as AppointmentStatus } });
  }

  // Recent appointments (last 10)
  const recentAppointments = await prisma.appointment.findMany({
    orderBy: { appointment_date: 'desc' },
    take: 10,
    include: {
      patient: { select: { first_name: true, last_name: true } },
      doctor: { select: { name: true, specialization: true } }
    }
  });

  // Recent registrations (last 10 patients and doctors)
  const recentPatients = await prisma.patient.findMany({
    orderBy: { created_at: 'desc' },
    take: 5,
    select: { first_name: true, last_name: true, created_at: true }
  });
  const recentDoctors = await prisma.doctor.findMany({
    orderBy: { created_at: 'desc' },
    take: 5,
    select: { name: true, specialization: true, created_at: true }
  });
  const recentRegistrations = [
    ...recentPatients.map(p => ({ name: `${p.first_name} ${p.last_name}`, type: 'Patient', date: p.created_at })),
    ...recentDoctors.map(d => ({ name: d.name, type: 'Doctor', date: d.created_at }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

  // Revenue by Service
  const services = await prisma.services.findMany({
    select: {
      id: true,
      service_name: true,
      bills: { select: { total_cost: true } }
    }
  });
  const revenueByService = services.map(service => ({
    serviceName: service.service_name,
    revenue: service.bills.reduce((sum, bill) => sum + bill.total_cost, 0)
  }));

  return {
    adminName,
    totalAppointments,
    totalPatients,
    totalDoctors,
    appointmentsByMonth: chartData,
    appointmentsByStatus: statusCounts,
    recentAppointments,
    recentRegistrations,
    revenueByService
  };
};

export const getAdminBillingOverviewService = async (
  page: number = 1,
  limit: number = 10,
  search: string = '',
  sortOrder: 'asc' | 'desc' = 'desc',
  filters?: {
    doctor?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) => {
  const skip = (page - 1) * limit;
  
  // Build where clause for payments
  const where: any = {};
  
  if (search) {
    where.OR = [
      { patient: { first_name: { contains: search, mode: 'insensitive' } } },
      { patient: { last_name: { contains: search, mode: 'insensitive' } } },
      { patient: { email: { contains: search, mode: 'insensitive' } } },
      { appointment: { doctor: { name: { contains: search, mode: 'insensitive' } } } }
    ];
  }
  
  if (filters?.doctor) {
    where.appointment = { doctor_id: filters.doctor };
  }
  
  if (filters?.status) {
    where.status = filters.status;
  }
  
  if (filters?.dateFrom || filters?.dateTo) {
    where.bill_date = {};
    if (filters.dateFrom) {
      where.bill_date.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.bill_date.lte = new Date(filters.dateTo);
    }
  }
  
  // Get payments with patient, doctor, and bills info
  const payments = await prisma.payment.findMany({
    where,
    include: {
      patient: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          img: true
        }
      },
      appointment: {
        select: {
          id: true,
          appointment_date: true,
          doctor: {
            select: {
              id: true,
              name: true,
              specialization: true
            }
          }
        }
      },
      bills: {
        include: {
          service: {
            select: {
              service_name: true
            }
          }
        }
      }
    },
    orderBy: { bill_date: sortOrder },
    skip,
    take: limit
  });
  
  // Transform payments to bills format for frontend compatibility
  const bills = payments.map(payment => ({
    id: payment.id,
    patient: payment.patient,
    doctor: payment.appointment.doctor,
    appointment: payment.appointment,
    totalCost: payment.total_amount,
    discount: payment.discount,
    status: payment.status,
    billDate: payment.bill_date,
    paymentDate: payment.payment_date,
    bills: payment.bills.map(bill => ({
      id: bill.id,
      serviceName: bill.service.service_name,
      serviceDate: bill.service_date,
      quantity: bill.quantity,
      unitCost: bill.unit_cost,
      totalCost: bill.total_cost
    }))
  }));
  
  // Get total count
  const total = await prisma.payment.count({ where });
  
  return {
    bills,
    total,
    page,
    limit
  };
}; 