import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { app } from '../firebase/config';
import PasswordInput from '../components/common/PasswordInput';
import { sendEmail } from '../utils/emailService';

const AdminLogin = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAdminExists, setCheckingAdminExists] = useState(true);
  const navigate = useNavigate();
  
  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [adminDocId, setAdminDocId] = useState(null);
  
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
  
  // Generate 6-digit OTP
  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };
  
  // Handle forgot password request
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!forgotPasswordEmail.trim()) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }
    
    try {
      const db = getFirestore(app);
      
      // Query admin collection for matching email
      const adminCollection = collection(db, 'admin');
      const adminQuery = query(adminCollection, where('email', '==', forgotPasswordEmail));
      const querySnapshot = await getDocs(adminQuery);
      
      if (querySnapshot.empty) {
        setError('No admin account found with this email');
        setLoading(false);
        return;
      }
      
      // Generate and store OTP
      const newOtp = generateOTP();
      setGeneratedOtp(newOtp);
      
      // Store admin document ID for password update later
      setAdminDocId(querySnapshot.docs[0].id);
      
      // Set OTP expiry (10 minutes from now)
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 10);
      setOtpExpiry(expiry);
      
      // Send OTP email
      const emailTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Petzify Admin Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding-bottom: 20px; }
            .content { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
            .otp { font-size: 24px; font-weight: bold; text-align: center; 
                  padding: 10px; background-color: #e9ecef; border-radius: 4px; 
                  margin: 20px 0; letter-spacing: 5px; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Petzify Admin Password Reset</h2>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset your Petzify Admin password. Please use the following verification code to complete your password reset:</p>
              <div class="otp">${newOtp}</div>
              <p>This code will expire in 10 minutes.</p>
              <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      await sendEmail({
        to: forgotPasswordEmail,
        subject: "Petzify Admin Password Reset",
        html: emailTemplate
      });
      
      // Move to OTP verification step
      setForgotPasswordStep(2);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Error processing your request. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Verify OTP
  const handleOtpVerification = (e) => {
    e.preventDefault();
    setError('');
    
    // Check if OTP has expired
    if (otpExpiry && new Date() > otpExpiry) {
      setError('OTP has expired. Please request a new one.');
      return;
    }
    
    // Verify OTP
    if (otp !== generatedOtp) {
      setError('Invalid OTP. Please try again.');
      return;
    }
    
    // Move to password reset step
    setForgotPasswordStep(3);
  };
  
  // Reset Password
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Validate passwords
    if (!newPassword) {
      setError('Please enter a new password');
      setLoading(false);
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    try {
      const db = getFirestore(app);
      
      // Update password in Firestore
      const adminRef = doc(db, 'admin', adminDocId);
      await updateDoc(adminRef, {
        password: newPassword
      });
      
      // Reset states and go back to login
      setShowForgotPassword(false);
      setForgotPasswordStep(1);
      setForgotPasswordEmail('');
      setOtp('');
      setGeneratedOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setOtpExpiry(null);
      setAdminDocId(null);
      
      // Show success message
      setError('');
      alert('Password reset successful. You can now log in with your new password.');
    } catch (err) {
      console.error('Password reset error:', err);
      setError('Error resetting password. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle back button in forgot password flow
  const handleBack = () => {
    if (forgotPasswordStep > 1) {
      setForgotPasswordStep(forgotPasswordStep - 1);
    } else {
      setShowForgotPassword(false);
    }
    setError('');
  };
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const db = getFirestore(app);
      const adminCollection = collection(db, 'admin');
      
      // Check if input is email format
      const isEmail = usernameOrEmail.includes('@');
      
      // First try the most likely field based on input format
      let adminQuery = isEmail 
        ? query(adminCollection, where('email', '==', usernameOrEmail))
        : query(adminCollection, where('username', '==', usernameOrEmail));
      
      let querySnapshot = await getDocs(adminQuery);
      
      // If no results, try the other field
      if (querySnapshot.empty) {
        adminQuery = isEmail 
          ? query(adminCollection, where('username', '==', usernameOrEmail))
          : query(adminCollection, where('email', '==', usernameOrEmail));
        
        querySnapshot = await getDocs(adminQuery);
        
        if (querySnapshot.empty) {
          // No admin found with this username or email
          setError('Admin account not found');
          setLoading(false);
          return;
        }
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
        
        // Redirect based on admin role
        if (adminData.role === 'grooming_admin') {
          navigate('/admin/grooming-dashboard');
        } else if (adminData.role === 'boarding_admin') {
          navigate('/admin/boarding-dashboard');
        } else {
          // Default admin dashboard for superadmin or other roles
          navigate('/admin/dashboard');
        }
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
  
  // Render forgot password UI
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">
              {forgotPasswordStep === 1 ? 'Forgot Password' : 
               forgotPasswordStep === 2 ? 'Verify OTP' : 'Reset Password'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {forgotPasswordStep === 1 ? 'Enter your email to receive a verification code' : 
               forgotPasswordStep === 2 ? 'Enter the 6-digit verification code sent to your email' : 'Create a new password'}
            </p>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          {forgotPasswordStep === 1 && (
            <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1">
                  <input
                    id="forgotPasswordEmail"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="Enter your email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-sm text-primary hover:text-primary-dark"
                  onClick={() => setShowForgotPassword(false)}
                >
                  Back to Login
                </button>
                <button
                  type="submit"
                  className="group relative flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </div>
            </form>
          )}
          
          {forgotPasswordStep === 2 && (
            <form className="mt-8 space-y-6" onSubmit={handleOtpVerification}>
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">Verification Code</label>
                <div className="mt-1">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength="6"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-sm text-primary hover:text-primary-dark"
                  onClick={handleBack}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="group relative flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Verify
                </button>
              </div>
            </form>
          )}
          
          {forgotPasswordStep === 3 && (
            <form className="mt-8 space-y-6" onSubmit={handlePasswordReset}>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label>
                <PasswordInput 
                  id="newPassword"
                  name="newPassword"
                  required={true}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Enter new password"
                />
              </div>
              
              <div>
                <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <PasswordInput 
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  required={true}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Confirm new password"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-sm text-primary hover:text-primary-dark"
                  onClick={handleBack}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="group relative flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  disabled={loading}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }
  
  // Main login UI
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
              <label htmlFor="usernameOrEmail" className="sr-only">Username or Email</label>
              <input
                id="usernameOrEmail"
                name="usernameOrEmail"
                type="text"
                autoComplete="username email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Username or Email"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
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
          
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <button
                type="button"
                className="font-medium text-primary hover:text-primary-dark"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot your password?
              </button>
            </div>
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