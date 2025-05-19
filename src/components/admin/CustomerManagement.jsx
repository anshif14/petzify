import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, doc, getDoc, deleteDoc, query, where } from 'firebase/firestore';
import { app } from '../../firebase/config';

// Helper function to format dates in a human-readable format
const formatDate = (dateValue) => {
  try {
    // Handle Firestore timestamps
    if (dateValue && typeof dateValue.toDate === 'function') {
      return new Date(dateValue.toDate()).toLocaleString('en-US', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } 
    // Handle JavaScript Date objects
    else if (dateValue instanceof Date) {
      return dateValue.toLocaleString('en-US', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } 
    // Handle ISO string dates
    else if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}T/)) {
      return new Date(dateValue).toLocaleString('en-US', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    }
    // Return the original value for anything else
    return String(dateValue);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(dateValue);
  }
};

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerPets, setCustomerPets] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const customersPerPage = 10;

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      const customersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCustomers(customersData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Reset to first page when search term changes
    setCurrentPage(1);
  }, [searchTerm]);

  const handleCustomerSelect = async (customer) => {
    setSelectedCustomer(customer);
    
    try {
      const db = getFirestore(app);
      
      // First try to query pets using the customer's ID
      const petsRef = collection(db, 'pets');
      let petsQuery = query(petsRef, where('ownerId', '==', customer.id));
      let petsSnapshot = await getDocs(petsQuery);
      
      // If no pets found, try using the customer's email as userId
      if (petsSnapshot.empty && customer.email) {
        petsQuery = query(petsRef, where('userId', '==', customer.email));
        petsSnapshot = await getDocs(petsQuery);
      }
      
      // Also try with userId field using customer.id
      if (petsSnapshot.empty) {
        petsQuery = query(petsRef, where('userId', '==', customer.id));
        petsSnapshot = await getDocs(petsQuery);
      }
      
      // Combine all pets found
      const customerPetsData = petsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCustomerPets(customerPetsData);
    } catch (err) {
      console.error('Error fetching customer pets:', err);
      setCustomerPets([]);
    }
  };

  const deleteCustomer = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      try {
        setIsDeleting(true);
        const db = getFirestore(app);
        
        // Delete the customer from Firestore
        await deleteDoc(doc(db, 'users', customerId));
        
        // Update the local state
        setCustomers(customers.filter(customer => customer.id !== customerId));
        
        // If the deleted customer was selected, clear selection
        if (selectedCustomer && selectedCustomer.id === customerId) {
          setSelectedCustomer(null);
          setCustomerPets([]);
        }
        
        setDeleteMessage({ type: 'success', text: 'Customer deleted successfully!' });
        setTimeout(() => setDeleteMessage(null), 3000);
      } catch (err) {
        console.error('Error deleting customer:', err);
        setDeleteMessage({ type: 'error', text: 'Failed to delete customer. Please try again.' });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (customer.name && customer.name.toLowerCase().includes(searchLower)) ||
      (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
      (customer.phone && customer.phone.toLowerCase().includes(searchLower))
    );
  });

  // Pagination logic
  const indexOfLastCustomer = currentPage * customersPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - customersPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstCustomer, indexOfLastCustomer);
  const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Customer Management</h2>
      
      {deleteMessage && (
        <div className={`mb-4 p-3 rounded-md ${deleteMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {deleteMessage.text}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-primary text-white">
            <h3 className="text-lg font-semibold">Customers List</h3>
          </div>
          
          {/* Search box */}
          <div className="p-4 border-b">
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              className="w-full p-2 border rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="p-4 max-h-[600px] overflow-y-auto">
            {currentCustomers.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {currentCustomers.map((customer) => (
                  <li key={customer.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleCustomerSelect(customer)}
                        className={`flex-grow text-left p-2 rounded-md hover:bg-gray-100 ${
                          selectedCustomer?.id === customer.id ? 'bg-gray-100' : ''
                        }`}
                      >
                        <div className="flex items-center">
                          {customer.avatar ? (
                            <img 
                              src={customer.avatar} 
                              alt={customer.name} 
                              className="w-10 h-10 rounded-full mr-3 object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                              <span className="text-gray-600">
                                {customer.name ? customer.name.charAt(0) : '?'}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{customer.name || 'Unnamed Customer'}</p>
                            <p className="text-sm text-gray-500">{customer.email}</p>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => deleteCustomer(customer.id)}
                        disabled={isDeleting}
                        className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete customer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">
                {filteredCustomers.length === 0 
                  ? 'No customers found matching your search.' 
                  : 'No customers found.'}
              </p>
            )}
          </div>
          
          {/* Pagination controls */}
          {filteredCustomers.length > customersPerPage && (
            <div className="p-4 border-t">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-primary bg-opacity-10 text-primary hover:bg-opacity-20'
                  }`}
                >
                  Previous
                </button>
                
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                    // Logic for showing page numbers around current page
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = idx + 1;
                    } else if (currentPage <= 3) {
                      pageNum = idx + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + idx;
                    } else {
                      pageNum = currentPage - 2 + idx;
                    }
                    
                    return (
                      <button
                        key={idx}
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
                  className={`px-3 py-1 rounded-md ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-primary bg-opacity-10 text-primary hover:bg-opacity-20'
                  }`}
                >
                  Next
                </button>
              </div>
              
              <div className="text-center text-sm text-gray-500 mt-2">
                Showing {indexOfFirstCustomer + 1}-{Math.min(indexOfLastCustomer, filteredCustomers.length)} of {filteredCustomers.length} customers
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden md:col-span-2">
          {selectedCustomer ? (
            <div>
              <div className="p-4 bg-primary text-white">
                <h3 className="text-lg font-semibold">Customer Details</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center mb-6">
                  {selectedCustomer.avatar ? (
                    <img 
                      src={selectedCustomer.avatar} 
                      alt={selectedCustomer.name} 
                      className="w-20 h-20 rounded-full mr-4 object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center mr-4">
                      <span className="text-2xl text-gray-600">
                        {selectedCustomer.name ? selectedCustomer.name.charAt(0) : '?'}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="text-xl font-semibold">{selectedCustomer.name || 'Unnamed Customer'}</h4>
                    <p className="text-gray-600">{selectedCustomer.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div>
                    <h5 className="text-sm text-gray-500 mb-1">Phone</h5>
                    <p>{selectedCustomer.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <h5 className="text-sm text-gray-500 mb-1">Created At</h5>
                    <p>{selectedCustomer.createdAt ? 
                        (selectedCustomer.createdAt && typeof selectedCustomer.createdAt.toDate === 'function' ? 
                          new Date(selectedCustomer.createdAt.toDate()).toLocaleDateString() : 
                          (selectedCustomer.createdAt instanceof Date ? 
                            selectedCustomer.createdAt.toLocaleDateString() : 
                            String(selectedCustomer.createdAt))) : 
                        'Unknown'}</p>
                  </div>
                  <div>
                    <h5 className="text-sm text-gray-500 mb-1">Last Login</h5>
                    <p>{selectedCustomer.lastLogin ? 
                        (selectedCustomer.lastLogin && typeof selectedCustomer.lastLogin.toDate === 'function' ? 
                          new Date(selectedCustomer.lastLogin.toDate()).toLocaleDateString() : 
                          (selectedCustomer.lastLogin instanceof Date ? 
                            selectedCustomer.lastLogin.toLocaleDateString() : 
                            String(selectedCustomer.lastLogin))) : 
                        'Never'}</p>
                  </div>
                  <div>
                    <h5 className="text-sm text-gray-500 mb-1">Location</h5>
                    <p>{selectedCustomer.location?.displayName || 'Not specified'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold mb-3">Pets</h4>
                  
                  {customerPets.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {customerPets.map(pet => (
                        <div key={pet.id} className="border rounded-lg overflow-hidden">
                          {pet.imageUrl ? (
                            <img 
                              src={pet.imageUrl}
                              alt={pet.name} 
                              className="w-full h-40 object-cover"
                            />
                          ) : (
                            <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500">No image</span>
                            </div>
                          )}
                          <div className="p-3">
                            <h5 className="font-medium">{pet.name}</h5>
                            <p className="text-sm text-gray-600">
                              {pet.breed}, {pet.age} years old
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {pet.type || 'Unknown type'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No pets found for this customer.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 flex items-center justify-center h-full">
              <p className="text-gray-500">Select a customer to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerManagement; 