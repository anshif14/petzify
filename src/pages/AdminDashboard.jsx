import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ContactInfoEditor from '../components/admin/ContactInfoEditor';
import MessagesManager from '../components/admin/MessagesManager';
import AdminProfileEditor from '../components/admin/AdminProfileEditor';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Get admin data from localStorage
  const adminData = JSON.parse(localStorage.getItem('adminAuth') || '{}');
  const adminName = adminData.name || 'Admin';
  
  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    navigate('/admin');
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Header */}
      <header className="bg-primary text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Petzify Admin Panel</h1>
          <div className="flex items-center space-x-4">
            <span>Welcome, {adminName}</span>
            <button 
              onClick={handleLogout}
              className="bg-white text-primary px-4 py-2 rounded hover:bg-gray-100 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      
      {/* Admin Content */}
      <div className="container mx-auto p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="md:w-1/4">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <ul>
                <li>
                  <button 
                    className={`w-full text-left px-6 py-3 ${activeTab === 'dashboard' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('dashboard')}
                  >
                    Dashboard
                  </button>
                </li>
                <li>
                  <button 
                    className={`w-full text-left px-6 py-3 ${activeTab === 'contactInfo' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('contactInfo')}
                  >
                    Contact Information
                  </button>
                </li>
                <li>
                  <button 
                    className={`w-full text-left px-6 py-3 ${activeTab === 'messages' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('messages')}
                  >
                    Messages
                  </button>
                </li>
                <li>
                  <button 
                    className={`w-full text-left px-6 py-3 ${activeTab === 'profile' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('profile')}
                  >
                    Admin Profile
                  </button>
                </li>
                <li>
                  <button 
                    className={`w-full text-left px-6 py-3 ${activeTab === 'settings' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('settings')}
                  >
                    Settings
                  </button>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="md:w-3/4 space-y-6">
            {activeTab === 'dashboard' && (
              <>
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-primary-dark mb-2">Total Visitors</h3>
                    <p className="text-3xl font-bold text-primary">12,456</p>
                    <p className="text-sm text-gray-500 mt-2">+12% from last month</p>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-primary-dark mb-2">Active Users</h3>
                    <p className="text-3xl font-bold text-primary">3,245</p>
                    <p className="text-sm text-gray-500 mt-2">+8% from last month</p>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-primary-dark mb-2">Service Bookings</h3>
                    <p className="text-3xl font-bold text-primary">346</p>
                    <p className="text-sm text-gray-500 mt-2">+15% from last month</p>
                  </div>
                </div>
                
                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-primary mb-4">Recent Activity</h2>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 bg-primary-light rounded-full p-2">
                        <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">
                          New user registration: <span className="text-primary">John Smith</span>
                        </p>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 bg-primary-light rounded-full p-2">
                        <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">
                          New service booking: <span className="text-primary">Pet Grooming</span>
                        </p>
                        <p className="text-xs text-gray-500">5 hours ago</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 bg-primary-light rounded-full p-2">
                        <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd"></path>
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">
                          New message from: <span className="text-primary">Jane Doe</span>
                        </p>
                        <p className="text-xs text-gray-500">1 day ago</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-primary mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button 
                      className="p-4 bg-primary-light rounded-lg hover:bg-primary hover:text-white transition-colors text-center"
                      onClick={() => setActiveTab('contactInfo')}
                    >
                      <svg className="w-6 h-6 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                      </svg>
                      Edit Contact Info
                    </button>
                    
                    <button className="p-4 bg-primary-light rounded-lg hover:bg-primary hover:text-white transition-colors text-center">
                      <svg className="w-6 h-6 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path>
                      </svg>
                      Manage Blog
                    </button>
                    
                    <button 
                      className="p-4 bg-primary-light rounded-lg hover:bg-primary hover:text-white transition-colors text-center"
                      onClick={() => setActiveTab('profile')}
                    >
                      <svg className="w-6 h-6 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                      </svg>
                      Edit Profile
                    </button>
                    
                    <button 
                      className="p-4 bg-primary-light rounded-lg hover:bg-primary hover:text-white transition-colors text-center"
                      onClick={() => setActiveTab('messages')}
                    >
                      <svg className="w-6 h-6 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1 2H8l-1-2H5V5z" clipRule="evenodd"></path>
                      </svg>
                      View Messages
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 'contactInfo' && (
              <ContactInfoEditor />
            )}
            
            {activeTab === 'messages' && (
              <MessagesManager />
            )}

            {activeTab === 'profile' && (
              <AdminProfileEditor />
            )}
            
            {activeTab === 'settings' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-primary mb-4">Settings</h2>
                <p>Settings panel will be implemented in a future update.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 