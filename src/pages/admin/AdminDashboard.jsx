import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { app } from '../../firebase/config';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    orders: 0,
    appointments: 0,
    messages: 0,
    pendingPets: 0
  });
  const [rehomingEnquiries, setRehomingEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRehomingEnquiries();
  }, []);

  const fetchStats = async () => {
    // This would be implemented to fetch actual stats
    // Currently showing empty stats as placeholder
  };

  const fetchRehomingEnquiries = async () => {
    try {
      const db = getFirestore(app);
      const q = query(
        collection(db, 'petRehomingEnquires'),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      const querySnapshot = await getDocs(q);
      const enquiriesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setRehomingEnquiries(enquiriesList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching rehoming enquiries:', error);
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : 
                 timestamp.toDate ? timestamp.toDate() : 
                 new Date();
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-primary">{stats.users}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Products</h3>
            <p className="text-3xl font-bold text-primary">{stats.products}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Orders</h3>
            <p className="text-3xl font-bold text-primary">{stats.orders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Pending Appointments</h3>
            <p className="text-3xl font-bold text-primary">{stats.appointments}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Unread Messages</h3>
            <p className="text-3xl font-bold text-primary">{stats.messages}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Pending Pet Approvals</h3>
            <p className="text-3xl font-bold text-primary">{stats.pendingPets}</p>
          </div>
        </div>
        
        {/* Rehoming Enquiries Section */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Rehoming Enquiries</h2>
            <Link to="/admin/rehoming-enquiries" className="text-primary hover:text-primary-dark text-sm font-medium">
              View All
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading enquiries...</p>
              </div>
            ) : rehomingEnquiries.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No unread rehoming enquiries</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pet</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rehomingEnquiries.map(enquiry => (
                      <tr key={enquiry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white mr-3">
                              {enquiry.userId && enquiry.userId.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{enquiry.userId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {enquiry.petDetails?.mediaFiles && enquiry.petDetails.mediaFiles.length > 0 && 
                              enquiry.petDetails.mediaFiles[0].type === 'image' ? (
                              <img 
                                src={enquiry.petDetails.mediaFiles[0].url} 
                                alt={enquiry.petDetails.name} 
                                className="h-8 w-8 rounded-full object-cover mr-3" 
                              />
                            ) : (
                              <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                                <span className="text-gray-500 text-xs">No img</span>
                              </div>
                            )}
                            <div className="text-sm text-gray-900">{enquiry.petDetails?.name || 'Unknown'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{formatDate(enquiry.createdAt)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Unread
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Link 
                            to={`/admin/rehoming-enquiries?userId=${enquiry.userId}`} 
                            className="text-primary hover:text-primary-dark"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Recent Activity</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <p className="text-gray-600">No recent activity to display.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 