import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useUserStore } from '../stores/useUserStore';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const { user } = useUserStore()

  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:5000');

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);

        // Join user's room
        newSocket.emit('join', {
          userId: user.id,
          email: user.email,
          role: user.role,
          name: user?.name,
          avatar: user?.avatar || null,
        });

        // Request online users list
        newSocket.emit('getOnlineUsers');
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      // Handle online users updates
      newSocket.on('onlineUsers', (users) => {
        setOnlineUsers(users);
      });

      newSocket.on('userOnline', (user) => {
        setOnlineUsers((prev) => {
          const index = prev.findIndex((u) => u.userId === user.userId);
          if (index === -1) {
            return [...prev, user];
          }
          const updated = [...prev];
          updated[index] = { ...updated[index], ...user };
          return updated;
        });
      });

      newSocket.on('userOffline', (user) => {
        setOnlineUsers(prev => prev.filter(u => u.userId !== user.userId));
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers
      }}>
      {children}
    </SocketContext.Provider>
  );
};





