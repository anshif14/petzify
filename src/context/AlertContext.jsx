import React, { createContext, useState, useContext } from 'react';
import CustomAlert from '../components/common/CustomAlert';

// Create context
const AlertContext = createContext();

// Provider component
export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState(null);

  // Add a new alert
  const addAlert = (message, type = 'success', title = '', autoClose = null) => {
    setAlert({ message, type, title, autoClose });
  };

  // Remove the alert
  const removeAlert = () => {
    setAlert(null);
  };

  // Shorthand methods for different alert types
  const showSuccess = (message, title = '', autoClose = null) => 
    addAlert(message, 'success', title, autoClose);
    
  const showError = (message, title = '', autoClose = null) => 
    addAlert(message, 'error', title, autoClose);
    
  const showWarning = (message, title = '', autoClose = null) => 
    addAlert(message, 'warning', title, autoClose);
    
  const showInfo = (message, title = '', autoClose = null) => 
    addAlert(message, 'info', title, autoClose);

  return (
    <AlertContext.Provider value={{ showSuccess, showError, showWarning, showInfo }}>
      {children}
      
      {/* Render the active alert */}
      {alert && (
        <CustomAlert
          isOpen={true}
          message={alert.message}
          title={alert.title}
          type={alert.type}
          autoClose={alert.autoClose}
          onClose={removeAlert}
        />
      )}
    </AlertContext.Provider>
  );
};

// Custom hook to use the alert context
export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export default AlertContext; 