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