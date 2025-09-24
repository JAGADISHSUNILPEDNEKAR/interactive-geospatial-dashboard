// src/hooks/useWebSocket.ts
import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export const useWebSocket = (
  endpoint: string | null,
  options: UseWebSocketOptions = {}
) => {
  const {
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  const [data, setData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!endpoint || socketRef.current?.connected) return;

    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001';
    
    socketRef.current = io(wsUrl, {
      path: endpoint,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts,
      reconnectionDelay,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
      console.log('WebSocket connected:', endpoint);
    });

    socketRef.current.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('WebSocket disconnected:', reason);
    });

    socketRef.current.on('data', (payload) => {
      setData(payload);
    });

    socketRef.current.on('error', (err) => {
      setError(new Error(err.message || 'WebSocket error'));
      console.error('WebSocket error:', err);
    });

    socketRef.current.on('reconnect_attempt', (attemptNumber) => {
      reconnectAttemptsRef.current = attemptNumber;
      console.log(`Reconnection attempt ${attemptNumber}/${reconnectionAttempts}`);
    });

    socketRef.current.on('reconnect_failed', () => {
      setError(new Error('Failed to reconnect after maximum attempts'));
    });
  }, [endpoint, reconnectionAttempts, reconnectionDelay]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const send = useCallback((event: string, payload: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, payload);
    } else {
      console.warn('WebSocket not connected. Cannot send message.');
    }
  }, []);

  useEffect(() => {
    if (autoConnect && endpoint) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [endpoint, autoConnect, connect, disconnect]);

  return {
    data,
    isConnected,
    error,
    connect,
    disconnect,
    send,
    reconnectAttempts: reconnectAttemptsRef.current,
  };
};
