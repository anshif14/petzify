import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '../../firebase/config';

const AdminRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if admin is logged in via localStorage
        const adminAuth = localStorage.getItem('adminAuth');
        if (!adminAuth) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        
        try {
          // Parse stored admin data
          const parsedAuth = JSON.parse(adminAuth);
          if (!parsedAuth || !parsedAuth.isLoggedIn || !parsedAuth.username) {
            setIsAuthenticated(false);
            setLoading(false);
            return;
          }
          
          // Verify admin still exists in database for extra security
          const db = getFirestore(app);
          const adminCollection = collection(db, 'admin');
          const adminQuery = query(adminCollection, where('username', '==', parsedAuth.username));
          const querySnapshot = await getDocs(adminQuery);
          
          if (querySnapshot.empty) {
            // Admin no longer exists in database
            localStorage.removeItem('adminAuth');
            setIsAuthenticated(false);
          } else {
            // Admin exists, user is authenticated
            setIsAuthenticated(true);
          }
        } catch (parseError) {
          console.error('Error parsing admin auth:', parseError);
          localStorage.removeItem('adminAuth');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary">
          <svg className="animate-spin h-10 w-10 mr-3" viewBox="0 0 24 24">
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
              fill="none"
            ></circle>
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default AdminRoute; 