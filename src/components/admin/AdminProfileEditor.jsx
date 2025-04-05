import React, { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '../../firebase/config';
import PasswordInput from '../common/PasswordInput';

const AdminProfileEditor = () => {
  const [adminData, setAdminData] = useState({
    name: '',
    username: '',
    password: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [docId, setDocId] = useState(null);
  const [changePassword, setChangePassword] = useState(false);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        // Get username from localStorage
        const storedAuth = localStorage.getItem('adminAuth');
        if (!storedAuth) {
          setErrorMessage('Not logged in');
          setLoading(false);
          return;
        }

        const parsedAuth = JSON.parse(storedAuth);
        if (!parsedAuth.username) {
          setErrorMessage('Invalid session data');
          setLoading(false);
          return;
        }

        // Query for the admin with this username
        const db = getFirestore(app);
        const adminCollection = collection(db, 'admin');
        const adminQuery = query(adminCollection, where('username', '==', parsedAuth.username));
        const querySnapshot = await getDocs(adminQuery);

        if (querySnapshot.empty) {
          setErrorMessage('Admin not found');
          setLoading(false);
          return;
        }

        // Get the admin document data
        const adminDoc = querySnapshot.docs[0];
        const adminDocData = adminDoc.data();
        
        // Store the document ID for later updates
        setDocId(adminDoc.id);
        
        // Set the form state with the admin data
        setAdminData({
          name: adminDocData.name || '',
          username: adminDocData.username || '',
          password: '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

      } catch (error) {
        console.error('Error fetching admin data:', error);
        setErrorMessage('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAdminData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const validatePasswordChange = () => {
    if (!adminData.currentPassword) {
      setErrorMessage('Current password is required');
      return false;
    }
    
    if (adminData.newPassword !== adminData.confirmPassword) {
      setErrorMessage('New password and confirmation do not match');
      return false;
    }
    
    if (adminData.newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    setUpdating(true);

    try {
      if (!docId) {
        setErrorMessage('Admin document not found');
        setUpdating(false);
        return;
      }

      const db = getFirestore(app);
      const adminRef = doc(db, 'admin', docId);
      const adminDoc = await getDoc(adminRef);
      
      if (!adminDoc.exists()) {
        setErrorMessage('Admin document not found');
        setUpdating(false);
        return;
      }
      
      const currentAdminData = adminDoc.data();
      
      // If changing password, verify current password
      if (changePassword) {
        if (!validatePasswordChange()) {
          setUpdating(false);
          return;
        }
        
        // Verify current password
        if (currentAdminData.password !== adminData.currentPassword) {
          setErrorMessage('Current password is incorrect');
          setUpdating(false);
          return;
        }
      }
      
      // Prepare update data
      const updateData = {
        name: adminData.name
      };
      
      // If changing password, add new password
      if (changePassword) {
        updateData.password = adminData.newPassword;
      }
      
      // Update the admin document
      await updateDoc(adminRef, updateData);
      
      // Update localStorage with new name
      const storedAuth = JSON.parse(localStorage.getItem('adminAuth') || '{}');
      storedAuth.name = adminData.name;
      localStorage.setItem('adminAuth', JSON.stringify(storedAuth));
      
      setSuccessMessage('Admin profile updated successfully');
      
      // Reset password fields
      setAdminData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      setChangePassword(false);
    } catch (error) {
      console.error('Error updating admin profile:', error);
      setErrorMessage('Failed to update admin profile');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading admin profile...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-primary mb-4">Edit Admin Profile</h2>
      
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
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={adminData.name}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username (cannot be changed)
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={adminData.username}
            disabled
            className="w-full p-2 border border-gray-300 rounded bg-gray-100 text-gray-600"
          />
        </div>
        
        <div className="mb-5">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="changePassword"
              checked={changePassword}
              onChange={() => setChangePassword(!changePassword)}
              className="mr-2"
            />
            <label htmlFor="changePassword" className="text-sm font-medium text-gray-700">
              Change Password
            </label>
          </div>
        </div>
        
        {changePassword && (
          <div className="mb-4 p-4 border border-gray-200 rounded-md">
            <h3 className="font-medium text-gray-700 mb-3">Change Password</h3>
            
            <div className="mb-3">
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <PasswordInput
                id="currentPassword"
                name="currentPassword"
                value={adminData.currentPassword}
                onChange={handleChange}
                required={changePassword}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
            </div>
            
            <div className="mb-3">
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <PasswordInput
                id="newPassword"
                name="newPassword"
                value={adminData.newPassword}
                onChange={handleChange}
                required={changePassword}
                placeholder="Enter new password"
                autoComplete="new-password"
              />
            </div>
            
            <div className="mb-3">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={adminData.confirmPassword}
                onChange={handleChange}
                required={changePassword}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </div>
          </div>
        )}
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updating}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
          >
            {updating ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminProfileEditor; 