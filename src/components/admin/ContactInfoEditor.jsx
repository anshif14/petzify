import React, { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { app } from '../../firebase/config';
import { initializeContactInfo } from '../../firebase/initContactInfo';

const ContactInfoEditor = () => {
  const [contactInfo, setContactInfo] = useState({
    email: "",
    phone: "",
    address: "",
    state: "",
    country: ""
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch contact info from Firestore
  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        setLoading(true);
        const db = getFirestore(app);
        const contactInfoRef = doc(db, 'contact_info', 'main');
        const docSnap = await getDoc(contactInfoRef);
        
        if (docSnap.exists()) {
          setContactInfo(docSnap.data());
        } else {
          // If contact info doesn't exist, initialize it
          const initializedData = await initializeContactInfo();
          setContactInfo(initializedData);
        }
      } catch (error) {
        console.error("Error fetching contact info:", error);
        setErrorMessage("Failed to load contact information");
      } finally {
        setLoading(false);
      }
    };
    
    fetchContactInfo();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setContactInfo(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");
    setUpdating(true);
    
    try {
      const db = getFirestore(app);
      const contactInfoRef = doc(db, 'contact_info', 'main');
      
      // Add lastUpdated timestamp
      const updatedInfo = {
        ...contactInfo,
        lastUpdated: new Date().toISOString()
      };
      
      await updateDoc(contactInfoRef, updatedInfo);
      setSuccessMessage("Contact information updated successfully");
    } catch (error) {
      console.error("Error updating contact info:", error);
      setErrorMessage("Failed to update contact information");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading contact information...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-primary mb-4">Edit Contact Information</h2>
      
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {errorMessage}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={contactInfo.email}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="text"
            id="phone"
            name="phone"
            value={contactInfo.phone}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={contactInfo.address}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
            State/Province
          </label>
          <input
            type="text"
            id="state"
            name="state"
            value={contactInfo.state}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
            Country
          </label>
          <input
            type="text"
            id="country"
            name="country"
            value={contactInfo.country}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <button
          type="submit"
          disabled={updating}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          {updating ? "Updating..." : "Update Contact Information"}
        </button>
      </form>
    </div>
  );
};

export default ContactInfoEditor; 