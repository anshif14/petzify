import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../../firebase';
import { toast } from 'react-toastify';

const BoardingAdminDashboard = ({ adminData }) => {
  // State for boarding centers data
  const [boardingCenters, setBoardingCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
        pricePerDay: Number(newCenter.pricePerDay),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        adminCreated: true,
        city: "Kochi", // Default city, update as needed
        capacity: "10", // Default capacity, update as needed
        openingTime: "09:00", // Default opening time
        closingTime: "20:30", // Default closing time
        discounts: "",
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

  if (loading) {
    return <div className="text-center p-4">Loading boarding centers...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Profile Section */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Your Profile</h2>
            <p className="text-sm text-gray-500 mt-1">
              {adminData.name || adminData.username} • {adminData.email}
            </p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Edit Profile
          </button>
        </div>
      </div>

      {/* Centers Section */}
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

        {/* Centers List */}
        {boardingCenters.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Center Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price/Day
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
                {boardingCenters.map(center => (
                  <tr key={center.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{center.centerName || center.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{center.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${center.pricePerDay}/day</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          center.isAvailable 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {center.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => toggleAvailability(center.id, center.isAvailable)}
                        className={`mr-2 px-3 py-1 rounded-md ${
                          center.isAvailable 
                            ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {center.isAvailable ? 'Deactivate' : 'Activate'}
                      </button>
                      <button 
                        className="mr-2 text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                      <button 
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardingAdminDashboard; 