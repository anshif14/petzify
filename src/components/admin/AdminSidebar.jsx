import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminSidebar = ({ 
  activeComponent, 
  setActiveComponent, 
  canManageUsers, 
  canEditContacts, 
  canManageMessages,
  canManageProducts 
}) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    navigate('/admin-login');
  };

  return (
    <div className="w-64 bg-white shadow-md min-h-screen">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-primary">Petzify Admin</h2>
      </div>
      
      <nav className="mt-6">
        <ul>
          <li>
            <button
              onClick={() => setActiveComponent('dashboard')}
              className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                activeComponent === 'dashboard'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>
          </li>
          
          {canManageUsers && (
            <li>
              <button
                onClick={() => setActiveComponent('users')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'users'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                User Management
              </button>
            </li>
          )}
          
          {canEditContacts && (
            <li>
              <button
                onClick={() => setActiveComponent('contact-info')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'contact-info'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Information
              </button>
            </li>
          )}
          
          {canManageMessages && (
            <li>
              <button
                onClick={() => setActiveComponent('messages')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'messages'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Messages
              </button>
            </li>
          )}
          
          {canManageProducts && (
            <li>
              <button
                onClick={() => setActiveComponent('products')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'products'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Products
              </button>
            </li>
          )}
          
          <li>
            <button
              onClick={() => setActiveComponent('profile')}
              className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                activeComponent === 'profile'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </button>
          </li>
          
          <li className="mt-auto">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-6 py-3 text-left text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default AdminSidebar; 