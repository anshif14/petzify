import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import GroomingAdminDashboard from '../../components/admin/grooming/GroomingAdminDashboard';
import AdminSidebar from '../../components/admin/AdminSidebar';

const GroomingAdminDashboardPage = () => {
  const [activeComponent, setActiveComponent] = useState('bookings');
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminAuth = async () => {
      const adminAuth = localStorage.getItem('adminAuth');
      
      if (!adminAuth) {
        navigate('/admin');
        return;
      }
      
      try {
        const adminAuthData = JSON.parse(adminAuth);
        
        // Check if admin exists and is a grooming_admin
        const db = getFirestore();
        const adminsRef = collection(db, 'admin');
        const adminQuery = query(
          adminsRef,
          where('username', '==', adminAuthData.username)
        );
        
        const adminSnapshot = await getDocs(adminQuery);
        
        if (adminSnapshot.empty) {
          localStorage.removeItem('adminAuth');
          navigate('/admin');
          return;
        }
        
        let isGroomingAdmin = false;
        adminSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.role === 'grooming_admin') {
            isGroomingAdmin = true;
            setAdminData({
              id: doc.id,
              ...data
            });
          }
        });
        
        if (!isGroomingAdmin) {
          setError('You do not have permission to access this page. Only grooming admins can access this dashboard.');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking admin auth:', error);
        setError('Error loading admin data. Please try again.');
        setLoading(false);
      }
    };
    
    checkAdminAuth();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    navigate('/admin');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/admin')}
            className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Check if admin data exists
  if (!adminData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authorization Error</h2>
          <p className="text-gray-600 mb-6">Your account is not authorized as a grooming admin.</p>
          <button
            onClick={() => navigate('/admin')}
            className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar
        activeComponent={activeComponent}
        setActiveComponent={setActiveComponent}
        canManageUsers={false}
        canEditContacts={false}
        canManageMessages={true}
        canManageProducts={false}
        canManageBookings={true}
        canManagePetParenting={false}
        canManageOrders={false}
        canManageServices={false}
      />
      
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Grooming Admin Dashboard</h1>
          <div className="flex items-center">
            <div className="mr-4 text-right">
              <p className="text-sm font-medium text-gray-900">{adminData.name}</p>
              <p className="text-xs text-gray-500">{adminData.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-gray-700"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
        
        {activeComponent === 'dashboard' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">Welcome to your Grooming Dashboard</h2>
            <p className="text-gray-600">
              Use the sidebar to navigate through different sections. You can manage your grooming appointments,
              customer information, and more.
            </p>
          </div>
        )}
        
        {activeComponent === 'bookings' && (
          <GroomingAdminDashboard adminData={adminData} />
        )}
        
        {activeComponent === 'messages' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">Messages</h2>
            <p className="text-gray-600">
              You can manage customer messages and inquiries here. 
              This feature is coming soon.
            </p>
          </div>
        )}
        
        {activeComponent === 'profile' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">Profile Settings</h2>
            <p className="text-gray-600">
              View and edit your grooming center profile information.
              This feature is coming soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroomingAdminDashboardPage; 