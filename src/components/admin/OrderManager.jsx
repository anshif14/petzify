import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, orderBy, getDocs, doc, updateDoc, where } from 'firebase/firestore';
import { app } from '../../firebase/config';
import OrderStepper from './OrderStepper';

const OrderManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [courierDetails, setCourierDetails] = useState({ company: '', trackingNumber: '' });
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
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
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
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
      await fetchOrders();
      
      if (showCourierModal) {
        setShowCourierModal(false);
        setCourierDetails({ company: '', trackingNumber: '' });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      'pending': 'confirmed',
      'confirmed': 'dispatched',
      'dispatched': 'delivered'
    };
    return statusFlow[currentStatus] || null;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      dispatched: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const toggleOrderExpand = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
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
      <h2 className="text-2xl font-bold mb-6">Order Management</h2>
      
      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Order Header - Always visible and clickable */}
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleOrderExpand(order.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${order.status === 'pending' ? 'bg-yellow-400' : 
                    order.status === 'confirmed' ? 'bg-blue-400' : 
                    order.status === 'dispatched' ? 'bg-purple-400' : 
                    order.status === 'delivered' ? 'bg-green-400' : 'bg-gray-400'}`} 
                  />
                  <div>
                    <h3 className="font-medium">Order #{order.id.slice(-6)}</h3>
                    <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{order.customerName}</p>
                    <p className="text-sm text-gray-500">Subtotal: {formatCurrency(order.subtotal || order.totalAmount)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedOrderId === order.id ? 'rotate-180' : ''}`} 
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* Order Details - Only visible when expanded */}
              {expandedOrderId === order.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <OrderStepper 
                    currentStatus={order.status} 
                    courierDetails={order.courierDetails}
                  />
                  
                  <div className="mt-6 grid md:grid-cols-2 gap-6">
                    {/* Customer Details */}
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-medium mb-3 text-gray-700">Customer Details</h4>
                      <div className="space-y-2">
                        <p className="flex items-center text-sm">
                          <span className="w-24 text-gray-500">Name:</span>
                          <span className="font-medium">{order.customerName || 'N/A'}</span>
                        </p>
                        <p className="flex items-center text-sm">
                          <span className="w-24 text-gray-500">Email:</span>
                          <span className="font-medium">{order.customerEmail || order.userId || 'N/A'}</span>
                        </p>
                        <p className="flex items-center text-sm">
                          <span className="w-24 text-gray-500">Phone:</span>
                          <span className="font-medium">{order.customerPhone || 'N/A'}</span>
                        </p>
                        <p className="flex items-start text-sm">
                          <span className="w-24 text-gray-500">Address:</span>
                          <span className="font-medium">{order.shippingAddress || 'N/A'}</span>
                        </p>
                      </div>
                    </div>
                    
                    {/* Order Items */}
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-medium mb-3 text-gray-700">Order Items</h4>
                      <div className="max-h-60 overflow-y-auto pr-2">
                        {order.items?.map((item, index) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-center space-x-3">
                              {item.imageUrl && (
                                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="h-full w-full object-cover object-center"
                                  />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium">{item.name}</p>
                                <p className="text-xs text-gray-500">{formatCurrency(item.price)} × {item.quantity}</p>
                              </div>
                            </div>
                            <p className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</p>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Subtotal:</span>
                          <span>{formatCurrency(order.subtotal || order.totalAmount)}</span>
                        </div>
                        {order.shippingCost > 0 && (
                          <div className="flex justify-between text-sm mt-1">
                            <span className="font-medium">Shipping:</span>
                            <span>{formatCurrency(order.shippingCost)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-semibold mt-2">
                          <span>Grand Total:</span>
                          <span>{formatCurrency(order.totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  {order.status !== 'delivered' && (
                    <div className="mt-6 flex justify-end">
                      {order.status === 'confirmed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order.id);
                            setShowCourierModal(true);
                          }}
                          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 mr-2"
                        >
                          Add Courier Details
                        </button>
                      )}
                      {getNextStatus(order.status) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(order.id, getNextStatus(order.status));
                          }}
                          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
                        >
                          Mark as {getNextStatus(order.status)}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Courier Details Modal */}
      {showCourierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
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
                  disabled={!courierDetails.company || !courierDetails.trackingNumber}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
                >
                  Save & Dispatch
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