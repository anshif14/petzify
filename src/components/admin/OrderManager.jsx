import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, orderBy, getDocs, doc, updateDoc, where, Timestamp } from 'firebase/firestore';
import { app } from '../../firebase/config';
import OrderStepper from './OrderStepper';
import { sendEmail, sendTestEmail } from '../../utils/emailService';
import { 
  getOrderConfirmedEmailTemplate, 
  getOrderDispatchedEmailTemplate,
  getOrderDeliveredEmailTemplate,
  getOrderCancelledEmailTemplate
} from '../../utils/orderEmailTemplates';
import { toast } from 'react-toastify';

const OrderManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [courierDetails, setCourierDetails] = useState({ company: '', trackingNumber: '' });
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' or 'orders'
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [sendingStatusEmail, setSendingStatusEmail] = useState(false);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    dispatched: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0,
    recentOrders: []
  });
  const [siteStats, setSiteStats] = useState({
    totalVisitors: 0,
    totalUsers: 0,
    totalProducts: 0,
    pendingPets: 0,
    totalBookings: 0,
    pendingMessages: 0
  });
  const [orderFilter, setOrderFilter] = useState('all'); // 'all', 'pending', 'confirmed', etc.

  useEffect(() => {
    fetchOrders();
    fetchSiteStats();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      const ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(ordersQuery);
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);

      // Calculate order statistics
      let pending = 0, confirmed = 0, dispatched = 0, delivered = 0, cancelled = 0;
      let totalRevenue = 0;
      
      ordersData.forEach(order => {
        switch(order.status?.toLowerCase()) {
          case 'pending': pending++; break;
          case 'confirmed': confirmed++; break;
          case 'dispatched': dispatched++; break;
          case 'delivered': delivered++; break;
          case 'cancelled': cancelled++; break;
          default: break;
        }
        
        // Add to revenue if not cancelled
        if (order.status?.toLowerCase() !== 'cancelled') {
          totalRevenue += order.totalAmount || 0;
        }
      });
      
      setOrderStats({
        total: ordersData.length,
        pending,
        confirmed,
        dispatched,
        delivered,
        cancelled,
        totalRevenue,
        recentOrders: ordersData.slice(0, 5) // Get 5 most recent orders
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
    }
  };

  const fetchSiteStats = async () => {
    try {
      const db = getFirestore(app);
      
      // Get visitors count (mock data - implement your actual analytics)
      const visitors = Math.floor(Math.random() * 500) + 200;
      
      // Get users count
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      
      // Get products count
      const productsQuery = query(collection(db, 'products'));
      const productsSnapshot = await getDocs(productsQuery);
      
      // Get pending pets
      const petsQuery = query(
        collection(db, 'rehoming_pets'),
        where('status', '==', 'pending')
      );
      const petsSnapshot = await getDocs(petsQuery);
      
      // Get bookings count
      const bookingsQuery = query(collection(db, 'appointments'));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      // Get pending messages
      const messagesQuery = query(
        collection(db, 'messages'),
        where('read', '==', false)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      setSiteStats({
        totalVisitors: visitors,
        totalUsers: usersSnapshot.size,
        totalProducts: productsSnapshot.size,
        pendingPets: petsSnapshot.size,
        totalBookings: bookingsSnapshot.size,
        pendingMessages: messagesSnapshot.size
      });
    } catch (error) {
      console.error('Error fetching site stats:', error);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const db = getFirestore(app);
      const orderRef = doc(db, 'orders', orderId);
      
      if (newStatus === 'dispatched' && !courierDetails.company) {
        setSelectedOrder(orderId);
        setShowCourierModal(true);
        return;
      }

      const updateData = {
        status: newStatus,
        updatedAt: new Date(),
      };

      if (newStatus === 'dispatched') {
        updateData.courierDetails = courierDetails;
      }

      await updateDoc(orderRef, updateData);
      toast.success(`Order status updated to ${newStatus}`);
      
      // Get the updated order for email
      const orderToUpdate = orders.find(order => order.id === orderId);
      
      // Send email notification based on the new status
      if (orderToUpdate && orderToUpdate.customerEmail) {
        try {
          let emailTemplate = '';
          let emailSubject = '';
          
          switch(newStatus) {
            case 'confirmed':
              emailSubject = `Order Confirmed - Petzify Order #${orderId.slice(-6)}`;
              emailTemplate = getOrderConfirmedEmailTemplate({
                ...orderToUpdate,
                courierDetails: updateData.courierDetails
              });
              break;
            case 'dispatched':
              emailSubject = `Your Order Has Been Shipped - Petzify Order #${orderId.slice(-6)}`;
              emailTemplate = getOrderDispatchedEmailTemplate({
                ...orderToUpdate,
                courierDetails: updateData.courierDetails
              });
              break;
            case 'delivered':
              emailSubject = `Order Delivered - Petzify Order #${orderId.slice(-6)}`;
              emailTemplate = getOrderDeliveredEmailTemplate(orderToUpdate);
              break;
            case 'cancelled':
              emailSubject = `Order Cancelled - Petzify Order #${orderId.slice(-6)}`;
              emailTemplate = getOrderCancelledEmailTemplate(orderToUpdate);
              break;
            default:
              break;
          }
          
          if (emailTemplate && emailSubject) {
            setSendingStatusEmail(true);
            toast.info(`Sending status update email to customer...`);
            
            const emailResult = await sendEmail({
              to: orderToUpdate.customerEmail,
              subject: emailSubject,
              html: emailTemplate
            });
            
            if (emailResult.success) {
              console.log(`Email notification sent for order ${orderId} status update to ${newStatus}`);
              toast.success('Email notification sent successfully');
            } else {
              console.error(`Failed to send email notification: ${emailResult.error}`);
              toast.error(`Failed to send email notification: ${emailResult.error}`);
            }
            
            setSendingStatusEmail(false);
          }
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
          toast.error(`Error sending email: ${emailError.message}`);
          setSendingStatusEmail(false);
        }
      }
      
      await fetchOrders();
      
      if (showCourierModal) {
        setShowCourierModal(false);
        setCourierDetails({ company: '', trackingNumber: '' });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(`Error updating order status: ${error.message}`);
    }
  };

  const getFilteredOrders = () => {
    if (orderFilter === 'all') return orders;
    
    return orders.filter(order => 
      order.status?.toLowerCase() === orderFilter.toLowerCase()
    );
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
      case 'dispatched': return 'bg-purple-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Get a human-readable status name with proper capitalization
  const getStatusName = (status) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  // Function to send a test email
  const handleSendTestEmail = async () => {
    try {
      setSendingTestEmail(true);
      toast.info('Sending test email...');
      
      const result = await sendTestEmail();
      
      if (result.success) {
        toast.success('Test email sent successfully!');
        console.log('Test email sent successfully:', result.message);
      } else {
        toast.error(`Failed to send test email: ${result.error}`);
        console.error('Failed to send test email:', result.error);
      }
    } catch (error) {
      toast.error(`Error sending test email: ${error.message}`);
      console.error('Error sending test email:', error);
    } finally {
      setSendingTestEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* View Toggles */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Orders Management</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('dashboard')}
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'dashboard'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setViewMode('orders')}
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'orders'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Order List
          </button>
          
          {/* Email Test Button */}
          <button
            onClick={handleSendTestEmail}
            disabled={sendingTestEmail}
            className="px-4 py-2 rounded-md transition-colors bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center"
          >
            {sendingTestEmail ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </>
            ) : (
              <>Test Email</>
            )}
          </button>
        </div>
      </div>

      {viewMode === 'dashboard' && (
        <>
          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-primary">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm">Total Orders</p>
                  <p className="text-2xl font-bold">{orderStats.total}</p>
                </div>
                <div className="bg-primary-light p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(orderStats.totalRevenue)}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm">Website Visitors</p>
                  <p className="text-2xl font-bold">{siteStats.totalVisitors}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm">Total Users</p>
                  <p className="text-2xl font-bold">{siteStats.totalUsers}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Order Status Cards */}
          <h3 className="text-xl font-semibold mb-4">Order Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-yellow-700 font-medium">Pending</p>
                <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">{orderStats.pending}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full" 
                  style={{ width: `${orderStats.total ? (orderStats.pending / orderStats.total * 100) : 0}%` }} 
                />
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-700 font-medium">Confirmed</p>
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">{orderStats.confirmed}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${orderStats.total ? (orderStats.confirmed / orderStats.total * 100) : 0}%` }} 
                />
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-purple-700 font-medium">Dispatched</p>
                <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">{orderStats.dispatched}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ width: `${orderStats.total ? (orderStats.dispatched / orderStats.total * 100) : 0}%` }} 
                />
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-green-700 font-medium">Delivered</p>
                <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">{orderStats.delivered}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${orderStats.total ? (orderStats.delivered / orderStats.total * 100) : 0}%` }} 
                />
              </div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-red-700 font-medium">Cancelled</p>
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{orderStats.cancelled}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full" 
                  style={{ width: `${orderStats.total ? (orderStats.cancelled / orderStats.total * 100) : 0}%` }} 
                />
              </div>
            </div>
          </div>
          
          {/* More Site Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Website Activity</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-gray-600">Total Products</p>
                  <p className="font-semibold">{siteStats.totalProducts}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-gray-600">Pending Pet Requests</p>
                  <p className="font-semibold">{siteStats.pendingPets}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-gray-600">Total Bookings</p>
                  <p className="font-semibold">{siteStats.totalBookings}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-gray-600">Unread Messages</p>
                  <p className="font-semibold">{siteStats.pendingMessages}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orderStats.recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">#{order.id.slice(-6)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{order.customerName || order.userId || 'Anonymous'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(order.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(order.totalAmount)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${getStatusColor(order.status)}`}>
                            {order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {orderStats.recentOrders.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-4 py-3 text-sm text-gray-500 text-center">No recent orders</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-right">
                <button 
                  onClick={() => setViewMode('orders')}
                  className="text-primary hover:text-primary-dark text-sm font-medium"
                >
                  View All Orders →
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {viewMode === 'orders' && (
        <>
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">All Orders</h3>
              <p className="text-sm text-gray-500 mt-1">Manage and update order statuses</p>
            </div>
            
            {/* Filters */}
            <div className="p-4 bg-gray-50 border-b flex flex-wrap gap-2">
              <button
                onClick={() => setOrderFilter('all')}
                className={`px-4 py-2 rounded-md text-sm ${
                  orderFilter === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Orders ({orderStats.total})
              </button>
              <button
                onClick={() => setOrderFilter('pending')}
                className={`px-4 py-2 rounded-md text-sm ${
                  orderFilter === 'pending'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Pending ({orderStats.pending})
              </button>
              <button
                onClick={() => setOrderFilter('confirmed')}
                className={`px-4 py-2 rounded-md text-sm ${
                  orderFilter === 'confirmed'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Confirmed ({orderStats.confirmed})
              </button>
              <button
                onClick={() => setOrderFilter('dispatched')}
                className={`px-4 py-2 rounded-md text-sm ${
                  orderFilter === 'dispatched'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Dispatched ({orderStats.dispatched})
              </button>
              <button
                onClick={() => setOrderFilter('delivered')}
                className={`px-4 py-2 rounded-md text-sm ${
                  orderFilter === 'delivered'
                    ? 'bg-green-500 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Delivered ({orderStats.delivered})
              </button>
              <button
                onClick={() => setOrderFilter('cancelled')}
                className={`px-4 py-2 rounded-md text-sm ${
                  orderFilter === 'cancelled'
                    ? 'bg-red-500 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Cancelled ({orderStats.cancelled})
              </button>
            </div>
            
            {/* Orders Table */}
            <div className="overflow-x-auto">
              {getFilteredOrders().length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">No orders found matching the selected filter.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredOrders().map((order) => (
                      <tr key={order.id} className={selectedOrder === order.id ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">#{order.id.slice(-6)}</div>
                          <div className="text-xs text-gray-500">{order.id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{order.customerName || 'Anonymous'}</div>
                          <div className="text-xs text-gray-500">{order.customerEmail || order.userId || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${getStatusColor(order.status)}`}>
                            {getStatusName(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex space-x-2 justify-center">
                            {order.status !== 'confirmed' && order.status === 'pending' && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'confirmed')}
                                title="Confirm Order"
                                disabled={sendingStatusEmail}
                                className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded disabled:opacity-50 flex items-center"
                              >
                                {sendingStatusEmail ? (
                                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            )}
                            {order.status !== 'dispatched' && order.status === 'confirmed' && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'dispatched')}
                                title="Mark as Dispatched"
                                disabled={sendingStatusEmail}
                                className="bg-purple-500 hover:bg-purple-600 text-white p-1 rounded disabled:opacity-50 flex items-center"
                              >
                                {sendingStatusEmail ? (
                                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                  </svg>
                                )}
                              </button>
                            )}
                            {order.status !== 'delivered' && (order.status === 'confirmed' || order.status === 'dispatched') && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'delivered')}
                                title="Mark as Delivered"
                                disabled={sendingStatusEmail}
                                className="bg-green-500 hover:bg-green-600 text-white p-1 rounded disabled:opacity-50 flex items-center"
                              >
                                {sendingStatusEmail ? (
                                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                  </svg>
                                )}
                              </button>
                            )}
                            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'cancelled')}
                                title="Cancel Order"
                                disabled={sendingStatusEmail}
                                className="bg-red-500 hover:bg-red-600 text-white p-1 rounded disabled:opacity-50 flex items-center"
                              >
                                {sendingStatusEmail ? (
                                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )}
                              </button>
                            )}
                            {order.status === 'dispatched' && (
                              <button
                                onClick={() => {
                                  setCourierDetails(order.courierDetails || { company: '', trackingNumber: '' });
                                  setSelectedOrder(order.id);
                                  setShowCourierModal(true);
                                }}
                                title="Update Courier Info"
                                className="bg-primary hover:bg-primary-dark text-white p-1 rounded"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedOrder(selectedOrder === order.id ? null : order.id);
                              }}
                              title="View Details"
                              className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-1 rounded"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Order Details Section */}
          {selectedOrder && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              {orders.filter(order => order.id === selectedOrder).map(order => (
                <div key={order.id} className="divide-y divide-gray-200">
                  <div className="p-6">
                    <div className="flex flex-wrap justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800">
                          Order #{order.id.slice(-6)}
                        </h3>
                        <p className="text-gray-500 mt-1">
                          Placed on {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium mb-2 ${getStatusColor(order.status)} text-white`}>
                          {getStatusName(order.status)}
                        </span>
                        <span className="font-semibold text-lg">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Order Stepper */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <OrderStepper 
                        currentStatus={order.status || 'pending'} 
                        courierDetails={order.courierDetails}
                      />
                    </div>

                    {/* Order Contents */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">Customer Information</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="space-y-2">
                            <p className="text-sm">
                              <span className="text-gray-600 font-medium">Name:</span> {order.customerName || 'Not provided'}
                            </p>
                            <p className="text-sm">
                              <span className="text-gray-600 font-medium">Email:</span> {order.customerEmail || 'Not provided'}
                            </p>
                            <p className="text-sm">
                              <span className="text-gray-600 font-medium">Phone:</span> {order.customerPhone || 'Not provided'}
                            </p>
                            <p className="text-sm">
                              <span className="text-gray-600 font-medium">Shipping Address:</span><br />
                              {order.shippingAddress || 'Not provided'}
                            </p>
                            {order.courierDetails && order.status === 'dispatched' && (
                              <div className="mt-4 pt-3 border-t border-gray-200">
                                <p className="text-sm font-medium text-gray-600 mb-1">Courier Details:</p>
                                <p className="text-sm">{order.courierDetails.company}</p>
                                <p className="text-sm">
                                  <span className="font-medium">Tracking Number:</span>{' '}
                                  {order.courierDetails.trackingNumber}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">Order Items</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="divide-y divide-gray-200">
                            {order.items?.map((item, index) => (
                              <div key={index} className="py-3 first:pt-0 last:pb-0">
                                <div className="flex justify-between">
                                  <div>
                                    <p className="font-medium text-gray-800">{item.name}</p>
                                    <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                                  </div>
                                  <p className="text-gray-800 font-medium">
                                    {formatCurrency(item.price * item.quantity)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-gray-200 mt-4 pt-4">
                            <div className="flex justify-between font-semibold text-gray-800">
                              <span>Total Amount</span>
                              <span>{formatCurrency(order.totalAmount)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Courier Details Modal */}
      {showCourierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Enter Courier Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Courier Company</label>
                <input
                  type="text"
                  value={courierDetails.company}
                  onChange={(e) => setCourierDetails(prev => ({ ...prev, company: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tracking Number</label>
                <input
                  type="text"
                  value={courierDetails.trackingNumber}
                  onChange={(e) => setCourierDetails(prev => ({ ...prev, trackingNumber: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowCourierModal(false);
                    setCourierDetails({ company: '', trackingNumber: '' });
                  }}
                  className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStatusChange(selectedOrder, 'dispatched')}
                  disabled={!courierDetails.company || !courierDetails.trackingNumber || sendingStatusEmail}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 flex items-center"
                >
                  {sendingStatusEmail ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>Save & Dispatch</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManager; 