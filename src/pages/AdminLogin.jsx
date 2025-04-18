import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '../firebase/config';
import PasswordInput from '../components/common/PasswordInput';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAdminExists, setCheckingAdminExists] = useState(true);
  const navigate = useNavigate();
  
  // Check if any admin users exist in the database
  useEffect(() => {
    const checkAdminExists = async () => {
      try {
        const db = getFirestore(app);
        const adminCollection = collection(db, 'admin');
        const querySnapshot = await getDocs(adminCollection);
        
        if (querySnapshot.empty) {
          // No admin users exist, redirect to setup
          navigate('/admin/setup');
        }
      } catch (err) {
        console.error('Error checking admin existence:', err);
        setError('Error connecting to database. Please try again later.');
      } finally {
        setCheckingAdminExists(false);
      }
    };
    
    checkAdminExists();
  }, [navigate]);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const db = getFirestore(app);
      
      // Query admin collection for matching username
      const adminCollection = collection(db, 'admin');
      const adminQuery = query(adminCollection, where('username', '==', username));
      const querySnapshot = await getDocs(adminQuery);
      
      if (querySnapshot.empty) {
        // No admin with this username found
        setError('Admin username not found');
        setLoading(false);
        return;
      }
      
      // Get the admin document
      const adminDoc = querySnapshot.docs[0];
      const adminData = adminDoc.data();
      
      // Check password
      if (adminData.password === password) {
        // Store admin info in localStorage (don't store the password)
        localStorage.setItem('adminAuth', JSON.stringify({
          name: adminData.name,
          username: adminData.username,
          email: adminData.email,
          role: adminData.role,
          permissions: adminData.permissions || {},
          isLoggedIn: true
        }));
        
        // Redirect to admin dashboard
        navigate('/admin/dashboard');
      } else {
        // Wrong password
        setError('Invalid password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Error connecting to database. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  if (checkingAdminExists) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-2 text-gray-500">Checking configuration...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your credentials to access the admin dashboard
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <PasswordInput 
              id="password"
              name="password"
              required={true}
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm pr-10"
              autoComplete="current-password"
              placeholder="Password"
            />
          </div>
          
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin; 