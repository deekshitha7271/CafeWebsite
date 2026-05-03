import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5173';
    const newSocket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'], // Allow polling for faster handshake
      reconnectionAttempts: 5,
      reconnectionDelay: 5000,
      autoConnect: true,
      withCredentials: true
    });

    newSocket.on('connect_error', (err) => {
      console.warn('🔌 Socket connection error:', err.message);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.off(); // Remove all listeners
        newSocket.close(); // Use close() instead of disconnect() for cleaner exit
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
