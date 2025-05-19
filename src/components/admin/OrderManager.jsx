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
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [revenueStats, setRevenueStats] = useState({
    today: 0,
    yesterday: 0,
    thisWeek: 0,
    thisMonth: 0,
    lastMonth: 0,
    avgOrderValue: 0,
    topProducts: []
  });
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedOrders, setExpandedOrders] = useState([]);
  const ordersPerPage = 10;

  useEffect(() => {
    fetchOrders();
    fetchSiteStats();
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      calculateRevenueStats();
    }
  }, [orders]);

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

  const calculateRevenueStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay());
    
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    
    let todayRevenue = 0;
    let yesterdayRevenue = 0;
    let thisWeekRevenue = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let totalOrdersValue = 0;
    let completedOrdersCount = 0;
    
    // For tracking top-selling products
    const productSales = {};
    
    orders.forEach(order => {
      // Skip cancelled orders
      if (order.status?.toLowerCase() === 'cancelled') return;
      
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      const orderAmount = order.totalAmount || 0;
      
      // Add to product sales
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = {
              id: item.productId,
              name: item.name,
              totalQuantity: 0,
              totalRevenue: 0
            };
          }
          productSales[item.productId].totalQuantity += (item.quantity || 1);
          productSales[item.productId].totalRevenue += (item.price * (item.quantity || 1));
        });
      }
      
      // Add to completed orders count for average calculation
      if (['confirmed', 'dispatched', 'delivered'].includes(order.status?.toLowerCase())) {
        completedOrdersCount++;
        totalOrdersValue += orderAmount;
      }
      
      // Check time periods
      if (orderDate >= today) {
        todayRevenue += orderAmount;
      }
      
      if (orderDate >= yesterday && orderDate < today) {
        yesterdayRevenue += orderAmount;
      }
      
      if (orderDate >= firstDayOfWeek) {
        thisWeekRevenue += orderAmount;
      }
      
      if (orderDate >= firstDayOfMonth) {
        thisMonthRevenue += orderAmount;
      }
      
      if (orderDate >= firstDayOfLastMonth && orderDate <= lastDayOfLastMonth) {
        lastMonthRevenue += orderAmount;
      }
    });
    
    // Convert product sales object to sorted array
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
    
    setRevenueStats({
      today: todayRevenue,
      yesterday: yesterdayRevenue,
      thisWeek: thisWeekRevenue,
      thisMonth: thisMonthRevenue,
      lastMonth: lastMonthRevenue,
      avgOrderValue: completedOrdersCount ? (totalOrdersValue / completedOrdersCount) : 0,
      topProducts
    });
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
    let filtered = orders;
    
    // Filter by status
    if (orderFilter !== 'all') {
      filtered = filtered.filter(order => 
        order.status?.toLowerCase() === orderFilter.toLowerCase()
      );
    }
    
    // Filter by search term (order ID, customer name, email)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(order => 
        (order.id && order.id.toLowerCase().includes(term)) ||
        (order.customerName && order.customerName.toLowerCase().includes(term)) ||
        (order.customerEmail && order.customerEmail.toLowerCase().includes(term)) ||
        (order.customerPhone && order.customerPhone.toLowerCase().includes(term))
      );
    }
    
    // Filter by date range
    if (dateRange.startDate) {
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(order => {
        if (!order.createdAt) return true;
        const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        return orderDate >= startDate;
      });
    }
    
    if (dateRange.endDate) {
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => {
        if (!order.createdAt) return true;
        const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        return orderDate <= endDate;
      });
    }
    
    return filtered;
  };

  const handleDateRangeChange = (e, type) => {
    setDateRange(prev => ({
      ...prev,
      [type]: e.target.value
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateRange({ startDate: '', endDate: '' });
    setOrderFilter('all');
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

  const handleSelectOrder = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };
  
  const handleSelectAllOrders = (e) => {
    if (e.target.checked) {
      setSelectedOrders(getFilteredOrders().map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };
  
  const handleBulkAction = async (action) => {
    if (!selectedOrders.length) {
      toast.error('No orders selected');
      return;
    }
    
    // Confirmation dialog
    if (!window.confirm(`Are you sure you want to mark ${selectedOrders.length} orders as ${action}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      let successCount = 0;
      
      for (const orderId of selectedOrders) {
        try {
          // Get current order
          const order = orders.find(o => o.id === orderId);
          
          // Skip if order can't transition to this status
          if (action === 'confirmed' && order.status !== 'pending') continue;
          if (action === 'dispatched' && order.status !== 'confirmed') continue;
          if (action === 'delivered' && !['confirmed', 'dispatched'].includes(order.status)) continue;
          if (action === 'cancelled' && ['delivered', 'cancelled'].includes(order.status)) continue;
          
          await handleStatusChange(orderId, action);
          successCount++;
        } catch (error) {
          console.error(`Error updating order ${orderId}:`, error);
        }
      }
      
      // Clear selected orders
      setSelectedOrders([]);
      setBulkActionMenuOpen(false);
      
      toast.success(`Successfully updated ${successCount} orders to ${action}`);
      await fetchOrders();
    } catch (error) {
      console.error('Error in bulk update:', error);
      toast.error('An error occurred during bulk update');
    } finally {
      setLoading(false);
    }
  };
  
  const exportOrdersCSV = () => {
    const ordersToExport = getFilteredOrders();
    
    if (!ordersToExport.length) {
      toast.error('No orders to export');
      return;
    }
    
    try {
      // Create CSV header
      let csv = 'Order ID,Date,Customer Name,Email,Phone,Status,Amount,Items,Shipping Address,Payment Method\n';
      
      // Add data rows
      ordersToExport.forEach(order => {
        const orderId = order.id || '';
        const date = order.createdAt ? (
          order.createdAt.toDate ? 
            order.createdAt.toDate().toLocaleDateString() : 
            new Date(order.createdAt).toLocaleDateString()
        ) : 'N/A';
        
        const customerName = (order.customerName || order.userName || 'N/A').replace(/"/g, '""');
        const email = (order.customerEmail || order.userEmail || order.userId || 'N/A').replace(/"/g, '""');
        const phone = (order.customerPhone || order.userPhone || 'N/A').replace(/"/g, '""');
        const status = (order.status || 'N/A').replace(/"/g, '""');
        const amount = order.totalAmount || order.subtotal || 0;
        const paymentMethod = (order.paymentMethod || 'N/A').replace(/"/g, '""');
        const shippingAddress = (order.shippingAddress || 'N/A').replace(/"/g, '""').replace(/\n/g, ' ');
        
        // Format items as a single string
        const items = order.items && Array.isArray(order.items) 
          ? order.items.map(item => 
              `${(item.name || '').replace(/"/g, '""')}(${item.quantity || 1})`
            ).join('; ') 
          : 'N/A';
        
        // Add row, properly escaping fields with quotes
        csv += `"${orderId}","${date}","${customerName}","${email}","${phone}","${status}","${amount}","${items}","${shippingAddress}","${paymentMethod}"\n`;
      });
      
      // Create blob with BOM for Excel compatibility
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `orders-export-${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      
      // Force download
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast.success(`Exported ${ordersToExport.length} orders successfully`);
    } catch (error) {
      console.error('Error exporting orders:', error);
      toast.error(`Error exporting orders: ${error.message}`);
    }
  };

  // Add these helper functions for pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = getFilteredOrders().slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(getFilteredOrders().length / ordersPerPage);
  
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Close all expanded orders when changing page
    setExpandedOrders([]);
  };
  
  const toggleOrderExpand = (orderId) => {
    setExpandedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
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
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Dashboard Content - Left Side */}
          <div className="w-full lg:w-2/3">
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
            
            {/* Revenue Insights Section */}
            <h3 className="text-xl font-semibold mb-4">Revenue Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Revenue Comparison */}
              <div className="bg-white rounded-lg shadow-md p-6 md:col-span-2">
                <h4 className="text-lg font-semibold mb-4">Revenue Overview</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <p className="text-sm text-gray-500">Today</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(revenueStats.today)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {revenueStats.today > revenueStats.yesterday 
                        ? `↑ ${formatCurrency(revenueStats.today - revenueStats.yesterday)} vs yesterday` 
                        : `↓ ${formatCurrency(revenueStats.yesterday - revenueStats.today)} vs yesterday`}
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <p className="text-sm text-gray-500">This Week</p>
                    <p className="text-xl font-bold text-purple-600">{formatCurrency(revenueStats.thisWeek)}</p>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <p className="text-sm text-gray-500">This Month</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(revenueStats.thisMonth)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {revenueStats.thisMonth > revenueStats.lastMonth 
                        ? `↑ ${formatCurrency(revenueStats.thisMonth - revenueStats.lastMonth)} vs last month` 
                        : `↓ ${formatCurrency(revenueStats.lastMonth - revenueStats.thisMonth)} vs last month`}
                    </p>
                  </div>
                </div>
                
                {/* Growth indicators */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Monthly Growth</p>
                    <p className="text-sm font-medium">
                      {revenueStats.thisMonth > revenueStats.lastMonth 
                        ? `+${((revenueStats.thisMonth - revenueStats.lastMonth) / revenueStats.lastMonth * 100).toFixed(1)}%` 
                        : `${((revenueStats.thisMonth - revenueStats.lastMonth) / revenueStats.lastMonth * 100).toFixed(1)}%`}
                    </p>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                    <div 
                      className={`h-2 rounded-full ${revenueStats.thisMonth > revenueStats.lastMonth ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(Math.abs((revenueStats.thisMonth - revenueStats.lastMonth) / revenueStats.lastMonth * 100), 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              {/* Average Order Value */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h4 className="text-lg font-semibold mb-4">Order Metrics</h4>
                <div className="space-y-6">
                  <div>
                    <p className="text-gray-500 text-sm">Average Order Value</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(revenueStats.avgOrderValue)}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-500 text-sm">Conversion Rate</p>
                    <p className="text-2xl font-bold text-primary">{((orderStats.total / siteStats.totalVisitors) * 100).toFixed(1)}%</p>
                    <p className="text-xs text-gray-500 mt-1">Based on total visitors</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Top Products */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h4 className="text-lg font-semibold mb-4">Top Performing Products</h4>
              {revenueStats.topProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units Sold</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {revenueStats.topProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{product.totalQuantity}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(product.totalRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No product data available</p>
              )}
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
          </div>
          
          {/* Order List - Right Side */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                <h3 className="text-lg font-semibold">Recent Orders</h3>
                <button 
                  onClick={() => setViewMode('orders')}
                  className="text-primary hover:text-primary-dark text-sm font-medium flex items-center"
                >
                  View All
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                {orders.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {orders.slice(0, 15).map((order) => (
                      <div key={order.id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-900">#{order.id.slice(-6)}</span>
                            <span 
                              className={`ml-2 text-xs px-2 py-1 rounded-full text-white ${getStatusColor(order.status)}`}
                            >
                              {getStatusName(order.status)}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">{formatDate(order.createdAt)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-800">
                              {order.customerName || 'Anonymous'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {order.items?.length || 0} items
                            </p>
                          </div>
                          <p className="font-medium text-gray-900">{formatCurrency(order.totalAmount)}</p>
                        </div>
                        
                        <div className="mt-2 flex justify-end space-x-1">
                          {order.status === 'pending' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'confirmed')}
                              className="px-2 py-1 text-xs rounded text-blue-600 bg-blue-50 hover:bg-blue-100"
                            >
                              Confirm
                            </button>
                          )}
                          
                          {order.status === 'confirmed' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'dispatched')}
                              className="px-2 py-1 text-xs rounded text-purple-600 bg-purple-50 hover:bg-purple-100"
                            >
                              Dispatch
                            </button>
                          )}
                          
                          {(order.status === 'confirmed' || order.status === 'dispatched') && (
                            <button
                              onClick={() => {
                                setSelectedOrder(order.id);
                                setViewMode('orders');
                              }}
                              className="px-2 py-1 text-xs rounded text-gray-600 bg-gray-50 hover:bg-gray-100"
                            >
                              Details
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    No orders found
                  </div>
                )}
              </div>
              
              {orders.length > 15 && (
                <div className="p-3 bg-gray-50 border-t text-center">
                  <button 
                    onClick={() => setViewMode('orders')}
                    className="text-primary hover:underline text-sm"
                  >
                    View {orders.length - 15} more orders
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'orders' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">All Orders</h3>
              <p className="text-sm text-gray-500 mt-1">Manage and update order statuses</p>
            </div>
            
            {/* Advanced Filters */}
            <div className="p-4 bg-gray-50 border-b">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-grow">
                  <input
                    type="text"
                    placeholder="Search by Order ID, Customer Name, Email, or Phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div className="flex flex-wrap md:flex-nowrap gap-2">
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => handleDateRangeChange(e, 'startDate')}
                    className="p-2 border rounded-md"
                    placeholder="Start Date"
                  />
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => handleDateRangeChange(e, 'endDate')}
                    className="p-2 border rounded-md"
                    placeholder="End Date"
                  />
                </div>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Clear Filters
                </button>
              </div>
              
              {/* Status Filters */}
              <div className="flex flex-wrap gap-2">
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
            </div>
            
            {/* Results Summary */}
            <div className="px-6 py-3 bg-gray-100 text-sm text-gray-600">
              Found {getFilteredOrders().length} orders {searchTerm || dateRange.startDate || dateRange.endDate ? 'matching your filters' : ''}
            </div>
            
            {/* Bulk Actions Bar */}
            <div className="p-4 bg-gray-50 border-t flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedOrders.length > 0 && selectedOrders.length === currentOrders.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOrders(currentOrders.map(order => order.id));
                    } else {
                      setSelectedOrders([]);
                    }
                  }}
                  className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600">
                  {selectedOrders.length} of {getFilteredOrders().length} selected
                </span>
              </div>
              
              <div className="flex gap-2">
                {selectedOrders.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setBulkActionMenuOpen(!bulkActionMenuOpen)}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark flex items-center"
                    >
                      Bulk Actions
                      <svg 
                        className={`ml-2 w-4 h-4 transition-transform ${bulkActionMenuOpen ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {bulkActionMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                        <ul className="py-1">
                          <li>
                            <button
                              onClick={() => handleBulkAction('confirmed')}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-500"
                            >
                              Mark as Confirmed
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => handleBulkAction('dispatched')}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-500"
                            >
                              Mark as Dispatched
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => handleBulkAction('delivered')}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-500"
                            >
                              Mark as Delivered
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => handleBulkAction('cancelled')}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-500"
                            >
                              Mark as Cancelled
                            </button>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={exportOrdersCSV}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>
            
            {/* Order Tiles */}
            <div className="divide-y divide-gray-200">
              {currentOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">No orders found matching the selected filter.</p>
                </div>
              ) : (
                currentOrders.map((order) => (
                  <div key={order.id} className="bg-white">
                    {/* Order Summary Row */}
                    <div className={`p-4 ${expandedOrders.includes(order.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex flex-wrap md:flex-nowrap items-center">
                        {/* Checkbox */}
                        <div className="mr-4">
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => handleSelectOrder(order.id)}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                        </div>
                        
                        {/* Order ID and Date */}
                        <div className="w-full md:w-1/5 mb-2 md:mb-0">
                          <div className="flex flex-col">
                            <div className="font-medium text-gray-900">#{order.id.slice(-6)}</div>
                            <div className="text-xs text-gray-500">{formatDate(order.createdAt)}</div>
                          </div>
                        </div>
                        
                        {/* Customer Info */}
                        <div className="w-full md:w-1/4 mb-2 md:mb-0">
                          <div className="flex flex-col">
                            <div className="font-medium text-gray-900">{order.customerName || order.userName || 'Anonymous'}</div>
                            <div className="text-xs text-gray-500">
                              {order.customerEmail || order.userEmail || order.userId || 'No email'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {order.customerPhone || order.userPhone || 'No phone'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Order Details */}
                        <div className="w-full md:w-1/5 mb-2 md:mb-0">
                          <div className="flex flex-col">
                            <div className="font-medium text-gray-900">{formatCurrency(order.totalAmount || order.subtotal)}</div>
                            <div className="text-xs text-gray-500">
                              {order.items?.length || 0} item(s) • {order.paymentMethod || 'N/A'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Status */}
                        <div className="w-full md:w-1/6 mb-2 md:mb-0">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${getStatusColor(order.status)}`}>
                            {getStatusName(order.status)}
                          </span>
                        </div>
                        
                        {/* Actions */}
                        <div className="w-full md:w-1/5 flex justify-end items-center space-x-2">
                          <div className="flex space-x-1">
                            {order.status !== 'confirmed' && order.status === 'pending' && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'confirmed')}
                                title="Confirm Order"
                                disabled={sendingStatusEmail}
                                className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded disabled:opacity-50 flex items-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            )}
                            {order.status !== 'dispatched' && order.status === 'confirmed' && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'dispatched')}
                                title="Mark as Dispatched"
                                disabled={sendingStatusEmail}
                                className="bg-purple-500 hover:bg-purple-600 text-white p-1 rounded disabled:opacity-50 flex items-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                              </button>
                            )}
                            {order.status !== 'delivered' && (order.status === 'confirmed' || order.status === 'dispatched') && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'delivered')}
                                title="Mark as Delivered"
                                disabled={sendingStatusEmail}
                                className="bg-green-500 hover:bg-green-600 text-white p-1 rounded disabled:opacity-50 flex items-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                              </button>
                            )}
                            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'cancelled')}
                                title="Cancel Order"
                                disabled={sendingStatusEmail}
                                className="bg-red-500 hover:bg-red-600 text-white p-1 rounded disabled:opacity-50 flex items-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                          
                          <button
                            onClick={() => toggleOrderExpand(order.id)}
                            className={`p-1 rounded-md transition-colors ${
                              expandedOrders.includes(order.id)
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {expandedOrders.includes(order.id) ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expandable Details Section */}
                    {expandedOrders.includes(order.id) && (
                      <div className="p-4 bg-blue-50 border-t border-blue-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Customer Details */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Customer Information</h4>
                            <div className="bg-white p-3 rounded-md shadow-sm">
                              <p className="text-sm">
                                <span className="font-semibold">Name:</span> {order.customerName || order.userName || 'Not provided'}
                              </p>
                              <p className="text-sm mt-1">
                                <span className="font-semibold">Email:</span> {order.customerEmail || order.userEmail || order.userId || 'Not provided'}
                              </p>
                              <p className="text-sm mt-1">
                                <span className="font-semibold">Phone:</span> {order.customerPhone || order.userPhone || 'Not provided'}
                              </p>
                              <p className="text-sm mt-1">
                                <span className="font-semibold">Shipping Address:</span><br />
                                {order.shippingAddress || 'Not provided'}
                              </p>
                              
                              {order.courierDetails && order.status === 'dispatched' && (
                                <div className="mt-3 pt-2 border-t border-gray-100">
                                  <p className="text-sm font-semibold text-gray-700">Courier Details:</p>
                                  <p className="text-sm">{order.courierDetails.company}</p>
                                  <p className="text-sm">
                                    <span className="font-semibold">Tracking Number:</span> {order.courierDetails.trackingNumber}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Order Items */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Order Items</h4>
                            <div className="bg-white p-3 rounded-md shadow-sm">
                              {order.items && order.items.length > 0 ? (
                                <div className="space-y-3">
                                  {order.items.map((item, index) => (
                                    <div key={index} className={index > 0 ? 'pt-3 border-t border-gray-100' : ''}>
                                      <div className="flex">
                                        {item.image && (
                                          <div className="w-16 h-16 mr-3 flex-shrink-0">
                                            <img 
                                              src={item.image} 
                                              alt={item.name}
                                              className="w-full h-full object-cover rounded-md"
                                            />
                                          </div>
                                        )}
                                        <div className="flex-grow">
                                          <p className="text-sm font-medium">{item.name}</p>
                                          <div className="flex justify-between mt-1">
                                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                            <p className="text-sm font-medium">
                                              {formatCurrency(item.price * item.quantity)}
                                            </p>
                                          </div>
                                          <p className="text-xs text-gray-500 mt-1">Product ID: {item.productId}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  
                                  <div className="pt-3 border-t border-gray-100 flex justify-between">
                                    <span className="font-semibold">Total Amount:</span>
                                    <span className="font-semibold">{formatCurrency(order.totalAmount || order.subtotal)}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">No items found</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Order Timeline */}
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Order Timeline</h4>
                          <div className="bg-white p-3 rounded-md shadow-sm">
                            <OrderStepper currentStatus={order.status || 'pending'} courierDetails={order.courierDetails} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {/* Pagination Controls */}
            {getFilteredOrders().length > ordersPerPage && (
              <div className="py-4 px-6 bg-white border-t flex justify-center">
                <nav className="flex items-center">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-md mr-2 ${
                      currentPage === 1 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={i}
                          onClick={() => paginate(pageNum)}
                          className={`w-8 h-8 rounded-md ${
                            currentPage === pageNum
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-md ml-2 ${
                      currentPage === totalPages 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
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