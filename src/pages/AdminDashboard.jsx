import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import UsersManager from '../components/admin/UsersManager';
import ContactInfoEditor from '../components/admin/ContactInfoEditor';
import MessagesManager from '../components/admin/MessagesManager';
import AdminProfileEditor from '../components/admin/AdminProfileEditor';
import DoctorDashboard from '../components/admin/doctor/DoctorDashboard';
import ProductManager from '../components/admin/ProductManager';
import BookingManager from '../components/admin/BookingManager';
import ContentManager from '../components/admin/ContentManager';
import TestimonialsManager from '../components/admin/TestimonialsManager';
import LoadingScreen from '../components/common/LoadingScreen';
import PetParentingManager from '../components/admin/PetParentingManager';
import OrderManager from '../components/admin/OrderManager';
import PetBoardingAdmin from './admin/PetBoardingAdmin';
import BoardingAdminDashboard from '../components/admin/boarding/BoardingAdminDashboard';
import ReviewsAdminManager from '../components/admin/ReviewsAdminManager';
import TailTalksAdmin from './admin/TailTalksAdmin';
import { auth, db } from '../firebase/index';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import ServicesAdmin from './admin/ServicesAdmin';
import CustomerManagement from '../components/admin/CustomerManagement';
import DoctorManagement from '../components/admin/DoctorManagement';
import PetDetails from '../components/admin/PetDetails';

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
    return <LoadingScreen message="Loading Dashboard..." />;
  }

  // Determine if the user is a doctor
  const isDoctor = adminData?.role === 'doctor';

  // Determine if the user is a boarding admin
  const isBoardingAdmin = adminData?.role === 'boarding_admin';

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

  const canManageBookings =
      (adminData?.permissions?.canManageBookings === true) ||
      (Array.isArray(adminData?.permissions) && adminData?.permissions?.includes('manage_bookings')) ||
      adminData?.role === 'superadmin';

  const canManagePetParenting =
      (adminData?.permissions?.canManagePetParenting === true) ||
      (Array.isArray(adminData?.permissions) && adminData?.permissions?.includes('manage_pet_parenting')) ||
      adminData?.role === 'superadmin';

  const canManageOrders =
      (adminData?.permissions?.canManageOrders === true) ||
      (Array.isArray(adminData?.permissions) && adminData?.permissions?.includes('manage_orders')) ||
      adminData?.role === 'superadmin';

  const canManageServices =
      (adminData?.permissions?.canManageServices === true) ||
      (Array.isArray(adminData?.permissions) && adminData?.permissions?.includes('manage_services')) ||
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

  // If user is a boarding admin, render the Boarding Admin Dashboard
  if (isBoardingAdmin) {
    console.log("Rendering boarding admin dashboard with data:", adminData);
    console.log("Admin email that will be used for queries:", adminData.email);

    // Dump all admin properties to identify any email-related fields
    console.log("All admin data properties:");
    for (const key in adminData) {
      console.log(`${key}: ${adminData[key]}`);
    }

    // Ensure adminData has necessary properties
    const enhancedAdminData = {
      ...adminData,
      // Ensure email is available (use username as fallback if needed)
      email: adminData.email
    };

    return (
        <div className="min-h-screen bg-gray-100">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h1 className="text-2xl font-semibold text-gray-900">Boarding Center Dashboard</h1>
              <p className="text-gray-600">
                Welcome, {adminData.name || adminData.username}
              </p>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
              <BoardingAdminDashboard adminData={enhancedAdminData} />
            </div>
          </div>
        </div>
    );
  }

  // For regular admin users
  return (
      <div className="flex min-h-screen bg-white">
        <AdminSidebar
            activeComponent={activeComponent}
            setActiveComponent={setActiveComponent}
            canManageUsers={canManageUsers}
            canEditContacts={canEditContacts}
            canManageMessages={canManageMessages}
            canManageProducts={canManageProducts}
            canManageBookings={canManageBookings}
            canManagePetParenting={canManagePetParenting}
            canManageOrders={canManageOrders}
            canManageReviews={adminData?.role === 'superadmin'}
            canManageServices={canManageServices}
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
                <div>
                  <OrderManager/>
                </div>
                // <div className="p-6">
                //   <h2 className="text-xl font-medium text-gray-900 mb-4">Dashboard Overview</h2>
                //   <p className="text-gray-600">
                //     Welcome to the Petzify admin dashboard. Use the sidebar to navigate to different sections.
                //   </p>
                //
                //   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                //     {canManageUsers && (
                //         <div className="bg-primary-light rounded-lg p-6 cursor-pointer" onClick={() => setActiveComponent('users')}>
                //           <h3 className="text-lg font-bold text-white mb-2">User Management</h3>
                //           <p className="text-gray-600">Manage admin users and permissions</p>
                //         </div>
                //     )}
                //
                //     {canEditContacts && (
                //         <div className="bg-primary-light rounded-lg p-6 cursor-pointer" onClick={() => setActiveComponent('contact-info')}>
                //           <h3 className="text-lg font-bold text-white mb-2">Contact Information</h3>
                //           <p className="text-gray-600">Update website contact details</p>
                //         </div>
                //     )}
                //
                //     {canManageMessages && (
                //         <div className="bg-primary-light rounded-lg p-6 cursor-pointer" onClick={() => setActiveComponent('messages')}>
                //           <h3 className="text-lg font-bold text-white mb-2">Message Management</h3>
                //           <p className="text-gray-600">View and respond to contact messages</p>
                //         </div>
                //     )}
                //
                //     {canManageBookings && (
                //         <div className="bg-primary-light rounded-lg p-6 cursor-pointer" onClick={() => setActiveComponent('bookings')}>
                //           <h3 className="text-lg font-bold text-white mb-2">Booking Management</h3>
                //           <p className="text-gray-600">Manage veterinary appointments</p>
                //         </div>
                //     )}
                //
                //     {canManageProducts && (
                //         <div className="bg-primary-light rounded-lg p-6 cursor-pointer" onClick={() => setActiveComponent('products')}>
                //           <h3 className="text-lg font-bold text-white mb-2">Product Management</h3>
                //           <p className="text-gray-600">Manage pet products and inventory</p>
                //         </div>
                //     )}
                //
                //     {canManageOrders && (
                //         <div className="bg-primary-light rounded-lg p-6 cursor-pointer" onClick={() => setActiveComponent('orders')}>
                //           <h3 className="text-lg font-bold text-white mb-2">Order Management</h3>
                //           <p className="text-gray-600">Manage customer orders and deliveries</p>
                //         </div>
                //     )}
                //
                //     {canEditContacts && (
                //         <div className="bg-primary-light rounded-lg p-6 cursor-pointer" onClick={() => setActiveComponent('content')}>
                //           <h3 className="text-lg font-bold text-white mb-2">Content Management</h3>
                //           <p className="text-gray-600">Manage website content and images</p>
                //         </div>
                //     )}
                //
                //     {canManagePetParenting && (
                //         <div className="bg-primary-light rounded-lg p-6 cursor-pointer" onClick={() => setActiveComponent('pet-parenting')}>
                //           <h3 className="text-lg font-bold text-white mb-2">Pet Parenting</h3>
                //           <p className="text-gray-600">Manage pet adoption and rehoming requests</p>
                //         </div>
                //     )}
                //
                //     {canEditProfile && (
                //         <div className="bg-primary-light rounded-lg p-6 cursor-pointer" onClick={() => setActiveComponent('profile')}>
                //           <h3 className="text-lg font-bold text-white mb-2">Profile Settings</h3>
                //           <p className="text-gray-600">Update your admin profile</p>
                //         </div>
                //     )}
                //
                //     {canEditContacts && (
                //         <div className="bg-primary-light rounded-lg p-6 cursor-pointer" onClick={() => setActiveComponent('testimonials')}>
                //           <h3 className="text-lg font-bold text-white mb-2">Testimonials</h3>
                //           <p className="text-gray-600">Manage customer testimonials</p>
                //         </div>
                //     )}
                //
                //     {canManageUsers && (
                //         <div className="bg-primary-light rounded-lg p-6 cursor-pointer" onClick={() => setActiveComponent('pet-boarding')}>
                //           <h3 className="text-lg font-bold text-white mb-2">Pet Boarding Management</h3>
                //           <p className="text-gray-600">Manage pet boarding center applications</p>
                //         </div>
                //     )}
                //   </div>
                // </div>
            )}

            {activeComponent === 'users' && canManageUsers && <UsersManager />}
            {activeComponent === 'contact-info' && canEditContacts && <ContactInfoEditor />}
            {activeComponent === 'messages' && canManageMessages && <MessagesManager />}
            {activeComponent === 'profile' && canEditProfile && <AdminProfileEditor adminData={adminData} />}
            {activeComponent === 'products' && canManageProducts && <ProductManager />}
            {activeComponent === 'bookings' && canManageBookings && <BookingManager />}
            {activeComponent === 'content' && canEditContacts && <ContentManager />}
            {activeComponent === 'pet-parenting' && canManagePetParenting && <PetParentingManager />}
            {activeComponent === 'orders' && canManageOrders && <OrderManager />}
            {activeComponent === 'testimonials' && canEditContacts && <TestimonialsManager />}
            {activeComponent === 'pet-boarding' && <PetBoardingAdmin />}
            {activeComponent === 'reviews' && adminData?.role === 'superadmin' && <ReviewsAdminManager />}
            {activeComponent === 'services' && canManageServices && <ServicesAdmin />}
            {activeComponent === 'customer-management' && <CustomerManagement />}
            {activeComponent === 'doctor-management' && <DoctorManagement />}
            {activeComponent === 'pet-details' && <PetDetails />}
            {activeComponent === 'tail-talks' && (
              <div className="p-0">
                <TailTalksAdmin />
              </div>
            )}
          </div>
        </div>
      </div>
  );
};

export default AdminDashboard; 