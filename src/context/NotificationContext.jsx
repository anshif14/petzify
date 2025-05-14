import React, { createContext, useState, useContext } from 'react';
import NotificationToast from '../components/common/NotificationToast';

const NotificationContext = createContext();

// Counter to ensure unique IDs even when created at the same millisecond
let idCounter = 0;

export const useNotification = () => {
  return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  
  const showNotification = (message, type = 'success', duration = 3000) => {
    // Create a truly unique ID by combining timestamp with an incrementing counter
    const timestamp = Date.now();
    idCounter += 1;
    const id = `${timestamp}-${idCounter}`;
    
    setNotifications(prev => [...prev, { id, message, type, duration }]);
    
    // Automatically remove notification after duration
    setTimeout(() => {
      removeNotification(id);
    }, duration + 300); // Add a little extra time for animation
    
    return id;
  };
  
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };
  
  // Helper methods for common notification types
  const success = (message, duration) => showNotification(message, 'success', duration);
  const error = (message, duration) => showNotification(message, 'error', duration);
  const warning = (message, duration) => showNotification(message, 'warning', duration);
  const info = (message, duration) => showNotification(message, 'info', duration);
  
  const value = {
    showNotification,
    removeNotification,
    success,
    error,
    warning,
    info
  };
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="notification-container">
        {notifications.map(notification => (
          <NotificationToast
            key={notification.id}
            message={notification.message}
            type={notification.type}
            duration={notification.duration}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export default NotificationContext; 