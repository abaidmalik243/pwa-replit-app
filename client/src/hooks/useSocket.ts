import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on("connect", () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      setIsConnected(false);
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

  return {
    socket: socketRef.current,
    isConnected,
    subscribe,
  };
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
  }, [event, subscribe, ...dependencies]);
}
