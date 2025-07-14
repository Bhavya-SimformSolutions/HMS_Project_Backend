import { PrismaClient } from "@prisma/client";
import { createNotification } from "./notification.service";

const prisma = new PrismaClient();

/**
 * Send daily appointment summary to admins
 */
export async function sendDailyAppointmentSummary() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's appointment statistics
  const todayAppointments = await prisma.appointment.findMany({
    where: {
      appointment_date: {
        gte: new Date(today.toISOString().split("T")[0] + "T00:00:00.000Z"),
        lt: new Date(tomorrow.toISOString().split("T")[0] + "T00:00:00.000Z"),
      },
    },
    include: {
      doctor: { select: { name: true } },
      patient: { select: { first_name: true, last_name: true } },
    },
  });

  const stats = {
    total: todayAppointments.length,
    pending: todayAppointments.filter((a) => a.status === "PENDING").length,
    scheduled: todayAppointments.filter((a) => a.status === "SCHEDULED").length,
    completed: todayAppointments.filter((a) => a.status === "COMPLETED").length,
    cancelled: todayAppointments.filter((a) => a.status === "CANCELLED").length,
  };

  // Get tomorrow's scheduled appointments
  const tomorrowDate = new Date(tomorrow);
  const dayAfterTomorrow = new Date(tomorrowDate);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  const tomorrowAppointments = await prisma.appointment.findMany({
    where: {
      appointment_date: {
        gte: new Date(tomorrowDate.toISOString().split("T")[0] + "T00:00:00.000Z"),
        lt: new Date(dayAfterTomorrow.toISOString().split("T")[0] + "T00:00:00.000Z"),
      },
      status: "SCHEDULED",
    },
  });

  const message = `📊 **Daily Appointment Summary**
    
**Today's Stats:**
• Total: ${stats.total.toString()} appointments
• Pending: ${stats.pending.toString()} | Scheduled: ${stats.scheduled.toString()}
• Completed: ${stats.completed.toString()} | Cancelled: ${stats.cancelled.toString()}

**Tomorrow:** ${tomorrowAppointments.length.toString()} scheduled appointments

${stats.cancelled > 5 ? "⚠️ High cancellation rate detected!" : ""}
${stats.pending > 10 ? "⚠️ Many pending approvals!" : ""}`;

  // Send notification to all admin users
  const adminUsers = await prisma.user.findMany({
    where: { role: "ADMIN" },
  });

  for (const admin of adminUsers) {
    await createNotification({
      title: "📊 Daily Appointment Report",
      message: message,
      link: "/admin/appointments",
      userId: admin.id,
    });
  }

  return { success: true, stats };
}

/**
 * Send weekly appointment analytics to admins
 */
export async function sendWeeklyAppointmentAnalytics() {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weeklyAppointments = await prisma.appointment.findMany({
    where: {
      created_at: {
        gte: weekAgo,
        lte: today,
      },
    },
    include: {
      doctor: { select: { name: true, specialization: true } },
    },
  });

  // Calculate metrics
  const totalBookings = weeklyAppointments.length;
  const completionRate =
    weeklyAppointments.length > 0
      ? (
          (weeklyAppointments.filter((a) => a.status === "COMPLETED").length /
            totalBookings) *
          100
        ).toFixed(1)
      : "0";
  const cancellationRate =
    weeklyAppointments.length > 0
      ? (
          (weeklyAppointments.filter((a) => a.status === "CANCELLED").length /
            totalBookings) *
          100
        ).toFixed(1)
      : "0";

  // Top specializations
  const specializationCount = weeklyAppointments.reduce<Record<string, number>>(
    (acc, appointment) => {
      const spec = appointment.doctor.specialization || "General";
      acc[spec] = (acc[spec] || 0) + 1;
      return acc;
    },
    {}
  );

  const topSpecializations = Object.entries(specializationCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([spec, count]) => `${spec}: ${count.toString()}`)
    .join(", ");

  const message = `📈 **Weekly Appointment Analytics**
    
**This Week's Performance:**
• Total Bookings: ${totalBookings.toString()}
• Completion Rate: ${completionRate}%
• Cancellation Rate: ${cancellationRate}%

**Top Specializations:** ${topSpecializations}

**Trends:**
$${
  parseFloat(cancellationRate) > 15
    ? "🔍 Review high cancellation rate"
    : "✅ Cancellation rate is healthy"
}
$${
  parseFloat(completionRate) > 80
    ? "✅ Good completion rate"
    : "🔍 Consider follow-up on incomplete appointments"
}`;

  // Send notification to all admin users
  const adminUsers = await prisma.user.findMany({
    where: { role: "ADMIN" },
  });

  for (const admin of adminUsers) {
    await createNotification({
      title: "📈 Weekly Analytics Report",
      message: message,
      link: "/admin/dashboard",
      userId: admin.id,
    });
  }

  return {
    success: true,
    analytics: { totalBookings, completionRate, cancellationRate },
  };
}

export { prisma };
