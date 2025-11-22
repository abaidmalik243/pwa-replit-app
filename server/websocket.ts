import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  branchId?: string | null;
}

let io: SocketIOServer | null = null;

export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : "*",
      credentials: true,
    },
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const cookies = socket.handshake.headers.cookie;
      if (!cookies) {
        return next(new Error("Authentication required"));
      }

      const parsedCookies = cookie.parse(cookies);
      const token = parsedCookies.authToken;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      if (!decoded.userId) {
        return next(new Error("Invalid token"));
      }

      const user = await storage.getUser(decoded.userId);
      if (!user) {
        return next(new Error("User not found"));
      }

      socket.userId = user.id;
      socket.userRole = user.role;
      socket.branchId = user.branchId;

      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`WebSocket connected: userId=${socket.userId}, role=${socket.userRole}, branchId=${socket.branchId}`);

    if (socket.branchId) {
      socket.join(`branch:${socket.branchId}`);
    }

    if (socket.userRole) {
      socket.join(`role:${socket.userRole}`);
    }

    socket.join(`user:${socket.userId}`);

    socket.on("disconnect", () => {
      console.log(`WebSocket disconnected: userId=${socket.userId}`);
    });
  });

  console.log("WebSocket server initialized");
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("WebSocket server not initialized");
  }
  return io;
}

export const emitEvent = {
  orderCreated: (order: any) => {
    if (!io) return;
    
    if (order.branchId) {
      io.to(`branch:${order.branchId}`).emit("order:created", order);
    }
    
    io.to("role:admin").emit("order:created", order);
    io.to("role:staff").emit("order:created", order);
  },

  orderStatusUpdated: (order: any) => {
    if (!io) return;
    
    if (order.branchId) {
      io.to(`branch:${order.branchId}`).emit("order:statusUpdated", order);
    }
    
    if (order.userId) {
      io.to(`user:${order.userId}`).emit("order:statusUpdated", order);
    }
    
    io.to("role:admin").emit("order:statusUpdated", order);
    io.to("role:staff").emit("order:statusUpdated", order);
  },

  kitchenTicketCreated: (ticket: any) => {
    if (!io) return;
    
    if (ticket.branchId) {
      io.to(`branch:${ticket.branchId}`).emit("kitchen:ticketCreated", ticket);
    }
  },

  kitchenTicketUpdated: (ticket: any) => {
    if (!io) return;
    
    if (ticket.branchId) {
      io.to(`branch:${ticket.branchId}`).emit("kitchen:ticketUpdated", ticket);
    }
  },

  riderLocationUpdated: (riderId: string, location: any) => {
    if (!io) return;
    
    io.to("role:admin").emit("rider:locationUpdated", { riderId, ...location });
    io.to("role:staff").emit("rider:locationUpdated", { riderId, ...location });
  },

  deliveryStatusUpdated: (delivery: any) => {
    if (!io) return;
    
    io.to("role:admin").emit("delivery:statusUpdated", delivery);
    io.to("role:staff").emit("delivery:statusUpdated", delivery);
    
    if (delivery.riderId) {
      io.to(`user:${delivery.riderId}`).emit("delivery:statusUpdated", delivery);
    }
  },

  posSessionUpdated: (session: any) => {
    if (!io) return;
    
    if (session.branchId) {
      io.to(`branch:${session.branchId}`).emit("pos:sessionUpdated", session);
    }
  },

  tableStatusUpdated: (table: any) => {
    if (!io) return;
    
    if (table.branchId) {
      io.to(`branch:${table.branchId}`).emit("table:statusUpdated", table);
    }
  },
};
