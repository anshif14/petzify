import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [admin, setAdmin] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if admin is logged in
    const adminAuth = localStorage.getItem('adminAuth');
    if (!adminAuth) {
      navigate('/admin');
      return;
    }

    try {
      const parsedAuth = JSON.parse(adminAuth);
      if (!parsedAuth.isLoggedIn) {
        navigate('/admin');
        return;
      }
      setAdmin(parsedAuth);
    } catch (error) {
      console.error('Error parsing admin auth:', error);
      navigate('/admin');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    navigate('/admin');
  };

  if (!admin) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Header */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Petzify Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm">Welcome, {admin.name}</span>
            <button 
              onClick={handleLogout}
              className="bg-white text-primary px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors duration-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Website Statistics</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Visitors</span>
                <span className="font-medium">1,245</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Users</span>
                <span className="font-medium">87</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Services Booked</span>
                <span className="font-medium">42</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Recent Activities</h2>
            <ul className="space-y-2">
              <li className="text-gray-600">New user registration</li>
              <li className="text-gray-600">Pet grooming service booked</li>
              <li className="text-gray-600">Blog post published</li>
              <li className="text-gray-600">Contact message received</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors duration-300">
                Update Content
              </button>
              <button className="w-full bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors duration-300">
                Manage Services
              </button>
              <button className="w-full bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors duration-300">
                View Messages
              </button>
            </div>
          </div>
        </div>

        {/* Content Management */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-primary mb-4">Content Management</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">Home</td>
                  <td className="px-6 py-4 whitespace-nowrap">2023-06-12</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Published
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-primary hover:text-primary-dark mr-3">Edit</button>
                    <button className="text-primary hover:text-primary-dark">Preview</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">About</td>
                  <td className="px-6 py-4 whitespace-nowrap">2023-06-10</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Published
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-primary hover:text-primary-dark mr-3">Edit</button>
                    <button className="text-primary hover:text-primary-dark">Preview</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">Services</td>
                  <td className="px-6 py-4 whitespace-nowrap">2023-06-08</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Published
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-primary hover:text-primary-dark mr-3">Edit</button>
                    <button className="text-primary hover:text-primary-dark">Preview</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">Blog</td>
                  <td className="px-6 py-4 whitespace-nowrap">2023-06-15</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Draft
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-primary hover:text-primary-dark mr-3">Edit</button>
                    <button className="text-primary hover:text-primary-dark">Preview</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Messages Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">Contact Messages</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">John Smith</td>
                  <td className="px-6 py-4 whitespace-nowrap">john@example.com</td>
                  <td className="px-6 py-4 whitespace-nowrap">Service Inquiry</td>
                  <td className="px-6 py-4 whitespace-nowrap">2023-06-18</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-primary hover:text-primary-dark mr-3">View</button>
                    <button className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">Jane Doe</td>
                  <td className="px-6 py-4 whitespace-nowrap">jane@example.com</td>
                  <td className="px-6 py-4 whitespace-nowrap">Partnership</td>
                  <td className="px-6 py-4 whitespace-nowrap">2023-06-17</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-primary hover:text-primary-dark mr-3">View</button>
                    <button className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 