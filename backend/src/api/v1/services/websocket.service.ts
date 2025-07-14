import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface JwtPayload {
  id: string;
  role: string;
  status: string;
  // add other fields if needed
}

class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: ['http://localhost:4200', 'http://localhost:52377', 'http://localhost:52378'],
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Set up authentication middleware for WebSocket connections
   */
  private setupMiddleware(): void {
    this.io.use((socket: Socket & { userId?: string; userRole?: string }, next) => {
      const token = socket.handshake.auth.token as string;
      if (!token) {
        next(new Error('Authentication token required'));
        return;
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
        if (!decoded.id) {
          next(new Error('Invalid token'));
          return;
        }
        prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, role: true, status: true }
        }).then(user => {
          if (!user || user.status !== 'ACTIVE') {
            next(new Error('User not found or inactive'));
            return;
          }
          socket.userId = user.id;
          socket.userRole = user.role;
          next();
        }).catch(() => {
          next(new Error('Authentication failed'));
        });
      } catch {
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket & { userId?: string; userRole?: string }) => {
      if (!socket.userId) return;
      void socket.join(`user_${socket.userId}`);
      // Store connection
      this.connectedUsers.set(socket.userId, socket.id);
      // Handle disconnect
      socket.on('disconnect', () => {
        if (socket.userId) this.connectedUsers.delete(socket.userId);
      });
      // Handle notification read status updates
      socket.on('notification_read', async (notificationId: string) => {
        try {
          await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true }
          });
        } catch {
          // Silent error handling for production
        }
      });
      // Send welcome message
      socket.emit('connected', {
        message: 'Successfully connected to real-time notifications',
        userId: socket.userId
      });
    });
  }

  /**
   * Send notification to a specific user
   */
  public sendNotificationToUser(userId: string, notification: NotificationPayload): void {
    this.io.to(`user_${userId}`).emit('new_notification', notification);
  }

  /**
   * Send notification to users with specific role
   */
  public sendNotificationToRole(role: string, notification: NotificationPayload): void {
    this.io.emit('role_notification', { role, notification });
  }

  /**
   * Broadcast notification to all connected users
   */
  public broadcastNotification(notification: NotificationPayload): void {
    this.io.emit('broadcast_notification', notification);
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get Socket.IO server instance
   */
  public getIOInstance(): SocketIOServer {
    return this.io;
  }
}

export default WebSocketService;
