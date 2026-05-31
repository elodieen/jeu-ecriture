import { Platform } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const SERVER_PORT = 3001;

function resolveServerUrl(): string {
  if (Platform.OS === 'web') {
    // On web, the app and the server share the same machine.
    // window.location.hostname gives the real IP when opened from a phone.
    const host =
      typeof window !== 'undefined' && window.location?.hostname
        ? window.location.hostname
        : 'localhost';
    return `http://${host}:${SERVER_PORT}`;
  }

  // On native, Expo injects the dev-server address as "host:port" (e.g. "192.168.1.15:8082").
  // We reuse the same host on our own port.
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) return `http://${host}:${SERVER_PORT}`;
  }

  return `http://localhost:${SERVER_PORT}`;
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(resolveServerUrl(), { autoConnect: false });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
