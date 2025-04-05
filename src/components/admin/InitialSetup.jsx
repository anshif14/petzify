import React, { useState, useEffect } from 'react';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc 
} from 'firebase/firestore';
import { app } from '../../firebase/config';
import PasswordInput from '../common/PasswordInput';

const InitialSetup = () => {
  const [loading, setLoading] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: 'superadmin',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const checkAdminExists = async () => {
      try {
        setLoading(true);
        const db = getFirestore(app);
        const adminCollection = collection(db, 'admin');
        const querySnapshot = await getDocs(adminCollection);
        
        if (!querySnapshot.empty) {
          setAdminExists(true);
        }
      } catch (error) {
        console.error('Error checking admin existence:', error);
        setError('Error checking database connection. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    checkAdminExists();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.username.trim()) {
      setError('Username is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!formData.password) {
      setError('Password is required');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      const db = getFirestore(app);
      
      // Check if an admin with this username already exists
      const adminCollection = collection(db, 'admin');
      const adminQuery = query(adminCollection, where('username', '==', formData.username));
      const querySnapshot = await getDocs(adminQuery);
      
      if (!querySnapshot.empty) {
        setError('An admin with this username already exists');
        setLoading(false);
        return;
      }

      // Create the superadmin user
      const adminData = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: 'superadmin',
        permissions: {
          canEditContacts: true,
          canManageMessages: true,
          canManageUsers: true,
          canEditProfile: true
        },
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'admin'), adminData);
      
      setSuccess('Super admin user created successfully! You can now log in.');
      setAdminExists(true);
      
      // Reset form
      setFormData({
        name: '',
        username: 'superadmin',
        email: '',
        password: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error creating superadmin:', error);
      setError('Error creating admin user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-2 text-primary">Checking admin status...</p>
        </div>
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center text-primary mb-6">Admin Already Exists</h2>
          <p className="text-gray-600 mb-4">
            An admin user has already been created for this system. Please use the admin login page to access the dashboard.
          </p>
          <div className="text-center">
            <a 
              href="/admin" 
              className="inline-block px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              Go to Admin Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center text-primary mb-6">Initial Admin Setup</h2>
        <p className="text-gray-600 mb-6">
          No admin users found. Create a super admin user to get started with the admin panel.
        </p>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
            <p>{success}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Username *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-gray-100"
              required
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1">Default superadmin username cannot be changed</p>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Password *</label>
            <PasswordInput
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={true}
              placeholder="Enter password"
              autoComplete="new-password"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Confirm Password *</label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required={true}
              placeholder="Confirm password"
              autoComplete="new-password"
            />
          </div>
          
          <div>
            <button
              type="submit"
              className="w-full bg-primary text-white rounded-md py-2 px-4 hover:bg-primary-dark transition-colors"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Super Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InitialSetup; 