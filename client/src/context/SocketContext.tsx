import { createContext, useContext, useEffect, useRef, ReactNode, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  subscribe: <T>(event: string, callback: (data: T) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socket.on("connect", () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error.message || "Unknown error");
      setIsConnected(false);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("WebSocket reconnected after", attemptNumber, "attempts");
      setIsConnected(true);
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("WebSocket reconnection attempt", attemptNumber);
    });

    socket.on("reconnect_error", (error) => {
      console.error("WebSocket reconnection error:", error.message || "Unknown error");
    });

    socket.on("reconnect_failed", () => {
      console.error("WebSocket reconnection failed after maximum attempts");
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribe = <T,>(event: string, callback: (data: T) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      
      return () => {
        if (socketRef.current) {
          socketRef.current.off(event, callback);
        }
      };
    }
    
    return () => {};
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, subscribe }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
}

export function useSocketEvent<T>(
  event: string,
  callback: (data: T) => void,
  dependencies: any[] = []
) {
  const { subscribe } = useSocket();

  useEffect(() => {
    const unsubscribe = subscribe<T>(event, callback);
    return unsubscribe;
  }, [event, ...dependencies]);
}
