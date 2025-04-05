import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import UsersManager from '../components/admin/UsersManager';
import ContactInfoEditor from '../components/admin/ContactInfoEditor';
import MessagesManager from '../components/admin/MessagesManager';
import AdminProfileEditor from '../components/admin/AdminProfileEditor';
import DoctorDashboard from '../components/admin/doctor/DoctorDashboard';
import ProductManager from '../components/admin/ProductManager';

const AdminDashboard = () => {
  const [activeComponent, setActiveComponent] = useState('dashboard');
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if admin is logged in
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth) {
      try {
        const admin = JSON.parse(adminAuth);
        setAdminData(admin);
      } catch (error) {
        console.error('Error parsing admin auth:', error);
      }
    }
    setLoading(false);
  }, []);

  // If not logged in, redirect to login
  if (!loading && !adminData) {
    return <Navigate to="/admin-login" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-b-2 border-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // Determine if the user is a doctor
  const isDoctor = adminData?.role === 'doctor';

  // Define permissions based on role
  // Handle permissions as both object format (adminData.permissions.canManageUsers) 
  // and array format (adminData.permissions.includes('manage_users'))
  const canManageUsers = 
    (adminData?.permissions?.canManageUsers === true) || 
    (Array.isArray(adminData?.permissions) && adminData?.permissions?.includes('manage_users')) || 
    adminData?.role === 'superadmin';
    
  const canEditContacts = 
    (adminData?.permissions?.canEditContacts === true) || 
    (Array.isArray(adminData?.permissions) && adminData?.permissions?.includes('edit_contacts')) || 
    adminData?.role === 'superadmin';
    
  const canManageMessages = 
    (adminData?.permissions?.canManageMessages === true) || 
    (Array.isArray(adminData?.permissions) && adminData?.permissions?.includes('manage_messages')) || 
    adminData?.role === 'superadmin';
    
  const canEditProfile = 
    (adminData?.permissions?.canEditProfile === true) || 
    (Array.isArray(adminData?.permissions) && adminData?.permissions?.includes('edit_profile')) || 
    true; // All users can edit their profile

  const canManageProducts = 
    (adminData?.permissions?.canManageProducts === true) || 
    (Array.isArray(adminData?.permissions) && adminData?.permissions?.includes('manage_products')) || 
    adminData?.role === 'superadmin';

  // If user is a doctor, render the DoctorDashboard
  if (isDoctor) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-semibold text-gray-900">Doctor Dashboard</h1>
            <p className="text-gray-600">
              Welcome, Dr. {adminData.name || adminData.username}
            </p>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
            <DoctorDashboard />
          </div>
        </div>
      </div>
    );
  }

  // For regular admin users
  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar 
        activeComponent={activeComponent} 
        setActiveComponent={setActiveComponent}
        canManageUsers={canManageUsers}
        canEditContacts={canEditContacts}
        canManageMessages={canManageMessages}
        canManageProducts={canManageProducts}
      />
      
      <div className="flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">
            Welcome, {adminData.name || adminData.username} | Role: {adminData.role || 'admin'}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {activeComponent === 'dashboard' && (
            <div className="p-6">
              <h2 className="text-xl font-medium text-gray-900 mb-4">Dashboard Overview</h2>
              <p className="text-gray-600">
                Welcome to the Petzify admin dashboard. Use the sidebar to navigate to different sections.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {canManageUsers && (
                  <div className="bg-primary-light rounded-lg p-6 cursor-pointer" onClick={() => setActiveComponent('users')}>
                    <h3 className="text-lg font-medium text-primary mb-2">User Management</h3>
                    <p className="text-gray-600">Manage admin users and permissions</p>
                  </div>
                )}
                
                {canEditContacts && (
                  <div className="bg-primary-light rounded-lg p-6 cursor-pointer" onClick={() => setActiveComponent('contact-info')}>
                    <h3 className="text-lg font-medium text-primary mb-2">Contact Information</h3>
                    <p className="text-gray-600">Update website contact details</p>
                  </div>
                )}
                
                {canManageMessages && (
                  <div className="bg-primary-light rounded-lg p-6 cursor-pointer" onClick={() => setActiveComponent('messages')}>
                    <h3 className="text-lg font-medium text-primary mb-2">Message Management</h3>
                    <p className="text-gray-600">View and respond to contact messages</p>
                  </div>
                )}
                
                {canEditProfile && (
                  <div className="bg-primary-light rounded-lg p-6 cursor-pointer" onClick={() => setActiveComponent('profile')}>
                    <h3 className="text-lg font-medium text-primary mb-2">Profile Settings</h3>
                    <p className="text-gray-600">Update your admin profile</p>
                  </div>
                )}

                {canManageProducts && (
                  <div className="bg-primary-light rounded-lg p-6 cursor-pointer" onClick={() => setActiveComponent('products')}>
                    <h3 className="text-lg font-medium text-primary mb-2">Product Management</h3>
                    <p className="text-gray-600">Manage pet products and inventory</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeComponent === 'users' && canManageUsers && <UsersManager />}
          {activeComponent === 'contact-info' && canEditContacts && <ContactInfoEditor />}
          {activeComponent === 'messages' && canManageMessages && <MessagesManager />}
          {activeComponent === 'profile' && canEditProfile && <AdminProfileEditor adminData={adminData} />}
          {activeComponent === 'products' && canManageProducts && <ProductManager />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 