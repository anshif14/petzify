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
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Order #{order.id.slice(-6)}</h3>
                  <p className="text-gray-500">Placed on {formatDate(order.createdAt)}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(order.status)}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

              <OrderStepper 
                currentStatus={order.status} 
                courierDetails={order.courierDetails}
              />

              <div className="mt-6 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Customer Details</h4>
                    <p>{order.customerName}</p>
                    <p>{order.customerEmail}</p>
                    <p>{order.shippingAddress}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Order Summary</h4>
                    <p>Total Items: {order.items?.length || 0}</p>
                    <p>Total Amount: ${order.totalAmount?.toFixed(2)}</p>
                  </div>
                </div>

                {order.status !== 'delivered' && (
                  <div className="mt-4 flex justify-end">
                    {order.status === 'confirmed' && (
                      <button
                        onClick={() => setSelectedOrder(order.id)}
                        className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
                      >
                        Add Courier Details
                      </button>
                    )}
                    {getNextStatus(order.status) && (
                      <button
                        onClick={() => handleStatusChange(order.id, getNextStatus(order.status))}
                        className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark ml-2"
                      >
                        Mark as {getNextStatus(order.status)}
                      </button>
                    )}
                  </div>
                )}
              </div>
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