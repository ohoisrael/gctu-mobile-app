import { io, Socket } from 'socket.io-client';
import { EXPO_API_URL } from '@env';

let socket: Socket | null = null;

export const initSocket = (token: string | null): Socket | null => {
  if (!token) {
    console.log('Socket: No token provided, skipping initialization');
    return null;
  }

  if (socket && socket.connected) {
    console.log('Socket: Already connected');
    return socket;
  }

  console.log('Socket: Connecting to', EXPO_API_URL, 'with token', token);

  socket = io(EXPO_API_URL, {
    auth: { token: `Bearer ${token}` },
    transports: ['websocket', 'polling'], // Allow polling fallback
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('Socket: Connected to server', socket?.id);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket: Connection error', error.message, error);
  });

  socket.on('error', (error) => {
    console.error('Socket: Error', error.message, error);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket: Disconnected from server', reason);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket: Disconnected');
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};