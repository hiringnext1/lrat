import { io } from 'socket.io-client';

const socket = io('/', {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionAttempts: 10,
});

socket.on('connect', () => {
  console.log('[Socket.io] Connected to server');
  const token = localStorage.getItem('lrat_token');
  if (token) {
    socket.emit('authenticate', token);
  }
});

socket.on('disconnect', () => {
  console.log('[Socket.io] Disconnected from server');
});

socket.on('connect_error', (err) => {
  console.warn('[Socket.io] Connection error:', err.message);
});

export default socket;
