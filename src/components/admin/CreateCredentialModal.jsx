import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-toastify';
import { generateRandomPassword } from '../../utils/authHelpers';
import { sendEmail } from '../../utils/emailService';

// Modal for creating admin credentials
const CreateCredentialModal = ({ center, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: `grooming_${center?.name?.toLowerCase().replace(/\s+/g, '_') || 'user'}`,
    name: center?.name || '',
    email: center?.email || '',
    boardingCenterId: '', // Optional, only used if this admin also manages boarding centers
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate a secure random password
      const password = generateRandomPassword(12);
      
      // Create admin document with groomingAdmin role
      const adminData = {
        email: formData.email,
        name: formData.name,
        username: formData.username,
        password, // Note: In a real app, you would hash this password
        role: 'grooming_admin', 
        permissions: {
          canEditContacts: false,
          canEditProfile: true,
          canManageMessages: true,
          canManageUsers: false
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        groomingCenterId: center.id, // Link to the grooming center
      };

      // Add boarding center ID if provided
      if (formData.boardingCenterId.trim()) {
        adminData.boardingCenterId = formData.boardingCenterId;
      }

      // Add to admin collection
      const docRef = await addDoc(collection(db, 'admin'), adminData);
      
      // Send email with credentials to the grooming center owner
      await sendCredentialEmail(adminData);
      
      toast.success('Admin credentials created and sent to the grooming center owner');
      
      if (onSuccess) {
        onSuccess(docRef.id);
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating admin credentials:', error);
      toast.error('Failed to create admin credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Send email with credentials
  const sendCredentialEmail = async (adminData) => {
    try {
      await sendEmail({
        to: adminData.email,
        subject: 'Your Petzify Grooming Center Admin Credentials',
        templateId: 'grooming-admin-credentials',
        dynamic_template_data: {
          centerName: center.name,
          adminName: adminData.name,
          username: adminData.username,
          password: adminData.password,
          loginUrl: window.location.origin + '/admin',
          supportEmail: 'support@petzify.com'
        }
      });
    } catch (error) {
      console.error('Error sending credential email:', error);
      toast.warning('Credentials created but email notification failed');
      // Continue despite email failure
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Create Admin Credentials</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Admin Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
              <p className="mt-1 text-xs text-gray-500">
                This will be the login username for the grooming center admin
              </p>
            </div>
            
            <div>
              <label htmlFor="boardingCenterId" className="block text-sm font-medium text-gray-700 mb-1">
                Boarding Center ID (Optional)
              </label>
              <input
                type="text"
                id="boardingCenterId"
                name="boardingCenterId"
                value={formData.boardingCenterId}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
              <p className="mt-1 text-xs text-gray-500">
                If this grooming center also offers boarding services, link their boarding center ID
              </p>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Important Note</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      A secure random password will be generated automatically. The credentials will be sent to the email address provided.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {loading ? 'Creating...' : 'Create & Send Credentials'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCredentialModal; 