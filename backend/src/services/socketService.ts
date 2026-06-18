import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: SocketServer;

// Map userId → socketId for targeted delivery
const userSockets = new Map<number, string>();

export const initSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin:      process.env.CLIENT_URL,
      credentials: true,
    },
  });

  // Auth middleware — validate JWT on socket handshake
  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
      (socket as any).userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as number;
    userSockets.set(userId, socket.id);

    socket.on('disconnect', () => {
      userSockets.delete(userId);
    });
  });

  return io;
};

/** Send a real-time notification to a specific user if they are online */
export const notifyUser = (userId: number, payload: {
  type: string;
  message: string;
  task_id?: number | null;
  created_at?: string;
}) => {
  const socketId = userSockets.get(userId);
  if (socketId) {
    io?.to(socketId).emit('notification', payload);
  }
};

export { io };