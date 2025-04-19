import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebase';
import { toast } from 'react-toastify';
import './BoardingAdminDashboard.css'; // Import CSS file for custom styles
import { FiLoader } from 'react-icons/fi';

const BoardingAdminDashboard = ({ adminData }) => {
  // State for boarding centers data
  const [boardingCenters, setBoardingCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Navigation state
  const [activeSection, setActiveSection] = useState('centers');
  
  // State for add center form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCenter, setNewCenter] = useState({
    centerName: '',
    address: '',
    pricePerDay: '',
    petTypes: [],
    services: [],
    operatingDays: [],
    imageUrl: '',
    description: '',
    isAvailable: true
  });

  // State for edit center form
  const [editingCenter, setEditingCenter] = useState(null);
  const [editFormData, setEditFormData] = useState({
    centerName: '',
    address: '',
    city: '',
    pricePerDay: '',
    capacity: '',
    description: '',
    openingTime: '',
    closingTime: '',
    operatingDays: [],
    petTypes: [],
    imageUrl: '',
  });
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState({
    centerName: '',
    address: '',
    city: '',
    pricePerDay: '',
    capacity: '',
    imageUrl: '',
    openingTime: '',
    closingTime: '',
    description: '',
    petTypes: [],
    services: [],
    operatingDays: [],
  });
  const [centerAvailability, setCenterAvailability] = useState({});

  // State for center details view
  const [viewingCenter, setViewingCenter] = useState(null);

  // Fetch boarding centers data
  useEffect(() => {
    const fetchBoardingCenters = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Admin data:", adminData);
        
        if (!adminData?.email) {
          setError("Admin email not found. Please check your profile.");
          setLoading(false);
          return;
        }
        
        let centers = [];
        
        // Check if admin has a direct boardingCenterId reference (simplest approach)
        if (adminData.boardingCenterId) {
          console.log("Found boardingCenterId in admin data:", adminData.boardingCenterId);
          const centerRef = doc(db, 'petBoardingCenters', adminData.boardingCenterId);
          const centerSnap = await getDoc(centerRef);
          
          if (centerSnap.exists()) {
            const data = centerSnap.data();
            centers.push({
              id: centerSnap.id,
              ...data,
              name: data.centerName || '',
              pricePerDay: data.pricePerDay || 0,
              isAvailable: data.isAvailable !== false
            });
            console.log("Found center by ID:", centers);
          } else {
            console.log("No center found with ID:", adminData.boardingCenterId);
          }
        }
        
        // If no center found by ID, fallback to email search
        if (centers.length === 0) {
          console.log("Looking for centers with email:", adminData.email);
          const centersQuery = query(
            collection(db, 'petBoardingCenters'),
            where('email', '==', adminData.email)
          );
          
          const querySnapshot = await getDocs(centersQuery);
          console.log("Centers found by email:", querySnapshot.size);
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            centers.push({
              id: doc.id,
              ...data,
              name: data.centerName || '',
              pricePerDay: data.pricePerDay || 0,
              isAvailable: data.isAvailable !== false
            });
          });
        }
        
        console.log("Final centers to display:", centers);
        setBoardingCenters(centers);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching boarding centers:", err);
        setError(`Failed to load boarding centers: ${err.message}`);
        setLoading(false);
      }
    };

    if (adminData) {
      console.log("Fetching boarding centers for admin:", adminData);
      fetchBoardingCenters();
    } else {
      console.log("Admin data not available yet");
      setLoading(false);
    }
  }, [adminData]);

  // Toggle availability of a boarding center
  const toggleAvailability = async (centerId, currentStatus) => {
    try {
      const centerRef = doc(db, 'petBoardingCenters', centerId);
      await updateDoc(centerRef, {
        isAvailable: !currentStatus
      });
      
      // Update local state
      setBoardingCenters(prev => 
        prev.map(center => 
          center.id === centerId 
            ? { ...center, isAvailable: !currentStatus } 
            : center
        )
      );
      
      toast.success(`Center ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (err) {
      console.error("Error toggling availability:", err);
      toast.error("Failed to update center status");
    }
  };

  // Handle input change for new center form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCenter(prev => ({ ...prev, [name]: value }));
  };

  // Handle checkbox change for arrays (petTypes, services, operatingDays)
  const handleCheckboxChange = (e, field) => {
    const { value, checked } = e.target;
    setNewCenter(prev => {
      if (checked) {
        return { ...prev, [field]: [...prev[field], value] };
      } else {
        return { ...prev, [field]: prev[field].filter(item => item !== value) };
      }
    });
  };

  // Submit new center
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate form
      if (!newCenter.centerName || !newCenter.address || !newCenter.pricePerDay) {
        toast.error("Please fill all required fields");
        return;
      }

      // Add new boarding center to Firestore
      const centerData = {
        ...newCenter,
        email: adminData.email,
        perDayCharge: Number(newCenter.pricePerDay),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        adminCreated: true,
        city: "Kochi", // Default city, update as needed
        capacity: "10", // Default capacity, update as needed
        openingTime: "09:00", // Default opening time
        closingTime: "20:30", // Default closing time
        discounts: "",
        galleryImageURLs: newCenter.imageUrl ? [newCenter.imageUrl] : []
      };
      
      console.log("Adding new center with data:", centerData);
      
      const docRef = await addDoc(collection(db, 'petBoardingCenters'), centerData);
      console.log("Center added with ID:", docRef.id);
      
      // Update local state
      setBoardingCenters(prev => [
        ...prev, 
        { 
          id: docRef.id,
          ...centerData,
          name: centerData.centerName // For display purposes
        }
      ]);
      
      // Reset form and hide it
      setNewCenter({
        centerName: '',
        address: '',
        pricePerDay: '',
        petTypes: [],
        services: [],
        operatingDays: [],
        imageUrl: '',
        description: '',
        isAvailable: true
      });
      setShowAddForm(false);
      toast.success("Boarding center added successfully!");
    } catch (err) {
      console.error("Error adding boarding center:", err);
      toast.error("Failed to add boarding center: " + err.message);
    }
  };

  // Edit center functionality
  const handleEditClick = (center) => {
    setEditingCenter(center);
    setEditFormData({
      centerName: center.centerName || '',
      address: center.address || '',
      city: center.city || '',
      pricePerDay: center.perDayCharge || center.pricePerDay || '',
      capacity: center.capacity || '',
      description: center.description || '',
      openingTime: center.openingTime || '',
      closingTime: center.closingTime || '',
      operatingDays: Array.isArray(center.operatingDays) ? center.operatingDays : [],
      petTypes: Array.isArray(center.petTypes) ? center.petTypes : [],
      imageUrl: center.galleryImageURLs && center.galleryImageURLs.length > 0 ? center.galleryImageURLs[0] : (center.imageUrl || ''),
    });
  };

  // Delete center functionality
  const handleDelete = async (centerId) => {
    if (window.confirm("Are you sure you want to delete this boarding center? This action cannot be undone.")) {
      try {
        setLoading(true);
        await deleteDoc(doc(db, "petBoardingCenters", centerId));
        
        // Update local state
        setBoardingCenters(prev => prev.filter(center => center.id !== centerId));
        
        toast.success("Boarding center deleted successfully!");
      } catch (error) {
        console.error("Error deleting boarding center:", error);
        toast.error("Failed to delete boarding center");
      } finally {
        setLoading(false);
      }
    }
  };

  // View center data functionality
  const viewCenterData = (center) => {
    setViewingCenter(center);
    console.log("Viewing Center Data:", center);
  };

  const closeViewDetails = () => {
    setViewingCenter(null);
  };

  const closeEditForm = () => {
    setEditingCenter(null);
    setEditFormData({
      centerName: '',
      address: '',
      city: '',
      pricePerDay: '',
      capacity: '',
      description: '',
      openingTime: '',
      closingTime: '',
      operatingDays: [],
      petTypes: [],
      imageUrl: '',
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditCheckboxChange = (e) => {
    const { name, value, checked } = e.target;
    if (checked) {
      setEditFormData({
        ...editFormData,
        [name]: [...(editFormData[name] || []), value]
      });
    } else {
      setEditFormData({
        ...editFormData,
        [name]: (editFormData[name] || []).filter(item => item !== value)
      });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!editingCenter) return;
    
    try {
      setLoading(true);
      
      const centerRef = doc(db, "petBoardingCenters", editingCenter.id);
      
      await updateDoc(centerRef, {
        centerName: editFormData.centerName,
        address: editFormData.address,
        city: editFormData.city,
        perDayCharge: Number(editFormData.pricePerDay),
        capacity: Number(editFormData.capacity),
        description: editFormData.description,
        openingTime: editFormData.openingTime,
        closingTime: editFormData.closingTime,
        operatingDays: editFormData.operatingDays,
        petTypes: editFormData.petTypes,
        galleryImageURLs: editFormData.imageUrl ? [editFormData.imageUrl] : [],
        updatedAt: serverTimestamp(),
      });
      
      toast.success("Boarding center updated successfully!");
      
      // Refresh boarding centers
      const updatedBoardingCenters = boardingCenters.map(center => {
        if (center.id === editingCenter.id) {
          return {
            ...center,
            centerName: editFormData.centerName,
            address: editFormData.address,
            city: editFormData.city,
            perDayCharge: Number(editFormData.pricePerDay),
            capacity: Number(editFormData.capacity),
            description: editFormData.description,
            openingTime: editFormData.openingTime,
            closingTime: editFormData.closingTime,
            operatingDays: editFormData.operatingDays,
            petTypes: editFormData.petTypes,
            galleryImageURLs: editFormData.imageUrl ? [editFormData.imageUrl] : [],
          };
        }
        return center;
      });
      
      setBoardingCenters(updatedBoardingCenters);
      closeEditForm();
    } catch (error) {
      console.error("Error updating boarding center: ", error);
      toast.error("Failed to update boarding center");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading boarding centers...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  // Sidebar navigation item component
  const NavItem = ({ icon, label, section }) => (
    <li 
      className={`px-4 py-3 flex items-center cursor-pointer transition-colors ${
        activeSection === section 
          ? "bg-blue-600 text-white" 
          : "text-gray-700 hover:bg-blue-50"
      }`}
      onClick={() => setActiveSection(section)}
    >
      <span className="mr-3">{icon}</span>
      <span className="font-medium">{label}</span>
    </li>
  );

  // Render the centers management UI
  const renderCentersManagement = () => (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Your Boarding Centers</h2>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          {showAddForm ? 'Cancel' : 'Add New Center'}
        </button>
      </div>

      {/* Add Center Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Boarding Center</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Center Name *
                </label>
                <input
                  type="text"
                  name="centerName"
                  value={newCenter.centerName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={newCenter.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Per Day *
                </label>
                <input
                  type="number"
                  name="pricePerDay"
                  value={newCenter.pricePerDay}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="text"
                  name="imageUrl"
                  value={newCenter.imageUrl}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={newCenter.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows="3"
              ></textarea>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pet Types Accepted
              </label>
              <div className="flex flex-wrap gap-4">
                {['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'].map(type => (
                  <label key={type} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      value={type}
                      onChange={(e) => handleCheckboxChange(e, 'petTypes')}
                      checked={newCenter.petTypes.includes(type)}
                      className="rounded border-gray-300 text-blue-600 mr-2"
                    />
                    <span className="text-sm text-gray-700">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Services Offered
              </label>
              <div className="flex flex-wrap gap-4">
                {['Accommodation', 'Feeding', 'Walking', 'Grooming', 'Medical Care'].map(service => (
                  <label key={service} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      value={service}
                      onChange={(e) => handleCheckboxChange(e, 'services')}
                      checked={newCenter.services.includes(service)}
                      className="rounded border-gray-300 text-blue-600 mr-2"
                    />
                    <span className="text-sm text-gray-700">{service}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operating Days
              </label>
              <div className="flex flex-wrap gap-4">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <label key={day} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      value={day}
                      onChange={(e) => handleCheckboxChange(e, 'operatingDays')}
                      checked={newCenter.operatingDays.includes(day)}
                      className="rounded border-gray-300 text-blue-600 mr-2"
                    />
                    <span className="text-sm text-gray-700">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors mr-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Center
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Center Modal */}
      {editingCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Edit Boarding Center</h2>
              <button
                onClick={closeEditForm}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Center Name*
                  </label>
                  <input
                    type="text"
                    name="centerName"
                    value={editFormData.centerName || ""}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address*
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={editFormData.address || ""}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City*
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={editFormData.city || ""}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price Per Day (₹)*
                  </label>
                  <input
                    type="number"
                    name="pricePerDay"
                    value={editFormData.pricePerDay || ""}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity*
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={editFormData.capacity || ""}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL
                  </label>
                  <input
                    type="text"
                    name="imageUrl"
                    value={editFormData.imageUrl || ""}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    name="openingTime"
                    value={editFormData.openingTime || ""}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    name="closingTime"
                    value={editFormData.closingTime || ""}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={editFormData.description || ""}
                  onChange={handleEditFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="3"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pet Types Accepted
                </label>
                <div className="flex flex-wrap gap-3">
                  {["Dog", "Cat", "Bird", "Fish", "Small Mammal", "Reptile"].map((type) => (
                    <label key={type} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="petTypes"
                        value={type}
                        checked={editFormData.petTypes?.includes(type) || false}
                        onChange={handleEditCheckboxChange}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operating Days
                </label>
                <div className="flex flex-wrap gap-3">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                    <label key={day} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="operatingDays"
                        value={day}
                        checked={editFormData.operatingDays?.includes(day) || false}
                        onChange={handleEditCheckboxChange}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeEditForm}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Center"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* No Centers Found Message */}
      {boardingCenters.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No boarding centers</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new boarding center.</p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Add Boarding Center
            </button>
          </div>
        </div>
      )}

      {/* Centers List */}
      {boardingCenters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {boardingCenters.map((center) => (
            <div key={center.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative h-48">
                <img
                  src={center.galleryImageURLs && center.galleryImageURLs.length > 0 
                    ? center.galleryImageURLs[0] 
                    : "https://via.placeholder.com/300x200?text=No+Image"}
                  alt={center.centerName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{center.centerName}</h3>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Location:</span> {center.address}, {center.city}
                </p>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Price:</span> ₹{center.perDayCharge || center.pricePerDay}/day
                </p>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Capacity:</span> {center.capacity} pets
                </p>
                
                {center.description && (
                  <p className="text-gray-600 mb-2">
                    <span className="font-medium">Description:</span> {center.description}
                  </p>
                )}
                
                {center.openingTime && center.closingTime && (
                  <p className="text-gray-600 mb-2">
                    <span className="font-medium">Hours:</span> {center.openingTime} - {center.closingTime}
                  </p>
                )}
                
                {center.operatingDays && center.operatingDays.length > 0 && (
                  <p className="text-gray-600 mb-2">
                    <span className="font-medium">Operating Days:</span> {center.operatingDays.join(', ')}
                  </p>
                )}
                
                {center.petTypes && center.petTypes.length > 0 && (
                  <p className="text-gray-600 mb-2">
                    <span className="font-medium">Pet Types:</span> {center.petTypes.join(', ')}
                  </p>
                )}
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditClick(center)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => viewCenterData(center)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      View Details
                    </button>
                  </div>
                  <div className="flex items-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={center.isAvailable}
                        onChange={() => toggleAvailability(center.id, center.isAvailable)}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ms-3 text-xs font-medium text-gray-800 px-2 py-1 rounded">
                        {center.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Center Detail View Modal */}
      {viewingCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{viewingCenter.centerName}</h2>
              <button
                onClick={closeViewDetails}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Image Gallery */}
              <div className="h-64 overflow-hidden rounded-lg">
                <img 
                  src={viewingCenter.galleryImageURLs && viewingCenter.galleryImageURLs.length > 0 
                    ? viewingCenter.galleryImageURLs[0] 
                    : "https://via.placeholder.com/800x400?text=No+Image"} 
                  alt={viewingCenter.centerName}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Information</h3>
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      <span className="font-medium">Status:</span>{' '}
                      <span className={`${viewingCenter.isAvailable ? 'text-green-600' : 'text-red-600'} font-medium`}>
                        {viewingCenter.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Address:</span> {viewingCenter.address}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">City:</span> {viewingCenter.city}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Price:</span> ₹{viewingCenter.perDayCharge || viewingCenter.pricePerDay}/day
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Capacity:</span> {viewingCenter.capacity} pets
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Operating Details</h3>
                  <div className="space-y-2">
                    {viewingCenter.openingTime && viewingCenter.closingTime && (
                      <p className="text-gray-700">
                        <span className="font-medium">Hours:</span> {viewingCenter.openingTime} - {viewingCenter.closingTime}
                      </p>
                    )}
                    
                    {viewingCenter.operatingDays && viewingCenter.operatingDays.length > 0 && (
                      <p className="text-gray-700">
                        <span className="font-medium">Operating Days:</span> {viewingCenter.operatingDays.join(', ')}
                      </p>
                    )}
                    
                    {viewingCenter.petTypes && viewingCenter.petTypes.length > 0 && (
                      <p className="text-gray-700">
                        <span className="font-medium">Pet Types Accepted:</span> {viewingCenter.petTypes.join(', ')}
                      </p>
                    )}
                    
                    {viewingCenter.services && viewingCenter.services.length > 0 && (
                      <p className="text-gray-700">
                        <span className="font-medium">Services Offered:</span> {viewingCenter.services.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Description */}
              {viewingCenter.description && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-700">{viewingCenter.description}</p>
                </div>
              )}
              
              {/* Contact & Admin Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Administrative Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <p className="text-gray-700">
                    <span className="font-medium">Email:</span> {viewingCenter.email || 'Not provided'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">ID:</span> {viewingCenter.id}
                  </p>
                  {viewingCenter.createdAt && (
                    <p className="text-gray-700">
                      <span className="font-medium">Created:</span> {viewingCenter.createdAt.toDate ? viewingCenter.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                    </p>
                  )}
                  {viewingCenter.updatedAt && (
                    <p className="text-gray-700">
                      <span className="font-medium">Last Updated:</span> {viewingCenter.updatedAt.toDate ? viewingCenter.updatedAt.toDate().toLocaleDateString() : 'Unknown'}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={closeViewDetails}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    closeViewDetails();
                    handleEditClick(viewingCenter);
                  }}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                >
                  Edit Center
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render the enquiries UI
  const renderEnquiries = () => (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Booking Enquiries</h2>
      
      <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 text-yellow-700">
        <h3 className="font-medium mb-2">No enquiries yet</h3>
        <p>When customers make booking enquiries for your center, they will appear here.</p>
      </div>
    </div>
  );

  // Render the profile UI
  const renderProfile = () => (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Settings</h2>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-5">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={adminData.name || ''}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={adminData.email || ''}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={adminData.username || ''}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <input
                type="text"
                value={adminData.role || ''}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Change Password
          </button>
        </div>
      </div>
    </div>
  );

  // Render active section content
  const renderContent = () => {
    switch (activeSection) {
      case 'centers':
        return renderCentersManagement();
      case 'enquiries':
        return renderEnquiries();
      case 'profile':
        return renderProfile();
      default:
        return renderCentersManagement();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Boarding Admin</h2>
          <p className="text-sm text-gray-500">{adminData.name || adminData.username}</p>
        </div>
        <nav className="mt-4">
          <ul>
            <NavItem 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
              label="My Centers"
              section="centers"
            />
            <NavItem 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
              label="Booking Enquiries"
              section="enquiries"
            />
            <NavItem 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
              label="Profile"
              section="profile"
            />
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white shadow">
          <div className="px-4 py-6 sm:px-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              {activeSection === 'centers' && 'Boarding Centers Management'}
              {activeSection === 'enquiries' && 'Booking Enquiries'}
              {activeSection === 'profile' && 'Profile Settings'}
            </h1>
          </div>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
};

export default BoardingAdminDashboard; 