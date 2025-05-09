import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { useAlert } from '../../context/AlertContext';
import PasswordInput from '../common/PasswordInput';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { app } from '../../firebase/config';
import { sendEmail } from '../../utils/emailService';

const AuthModal = ({ 
  isOpen, 
  onClose, 
  initialMode = 'login', 
  redirectPath = '',
  message = '',
  onSuccess = () => {}
}) => {
  const [mode, setMode] = useState(initialMode); // 'login', 'signup', or 'forgotPassword'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Forgot password states
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [otpExpiry, setOtpExpiry] = useState(null);
  
  const { login, register } = useUser();
  const { showSuccess, showError } = useAlert();
  
  if (!isOpen) return null;
  
  // Generate 6-digit OTP
  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Validate email
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    // Validate password for both login and signup
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (mode === 'signup' && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    // Additional validations for signup mode
    if (mode === 'signup') {
      if (!formData.name) {
        newErrors.name = 'Name is required';
      }
      
      // Validate phone only for signup
      if (!formData.phone) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^\d{10}$/.test(formData.phone)) {
        newErrors.phone = 'Phone number must be 10 digits';
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (mode === 'login') {
        // Attempt login with email and password only
        await login(formData.email, formData.password);
        showSuccess('Successfully logged in!', 'Welcome Back');
      } else {
        // Attempt registration
        await register({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        });
        showSuccess('Account created successfully!', 'Welcome');
      }
      
      // Add a slight delay before callback to ensure state updates are complete
      setTimeout(() => {
        console.log('Executing onSuccess callback from AuthModal');
        // Invoke success callback
        onSuccess();
        
        // Close the modal
        onClose();
        
        // Redirect if path provided
        if (redirectPath) {
          window.location.href = redirectPath;
        }
      }, 300);
    } catch (error) {
      console.error(`${mode === 'login' ? 'Login' : 'Registration'} error:`, error);
      showError(
        error.message || `Failed to ${mode === 'login' ? 'login' : 'register'}. Please try again.`,
        mode === 'login' ? 'Login Failed' : 'Registration Failed'
      );
      setIsLoading(false);
    }
  };
  
  const toggleMode = () => {
    if (mode === 'forgotPassword') {
      setMode('login');
      setForgotPasswordStep(1);
      setForgotPasswordEmail('');
      setOtp('');
      setGeneratedOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setOtpExpiry(null);
    } else {
      setMode(mode === 'login' ? 'signup' : 'login');
    }
    setErrors({});
  };
  
  // Handle forgot password link click
  const handleForgotPasswordClick = () => {
    setMode('forgotPassword');
    setForgotPasswordStep(1);
    setErrors({});
  };
  
  // Handle forgot password request
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail.trim() || !/\S+@\S+\.\S+/.test(forgotPasswordEmail)) {
      setErrors({ forgotPasswordEmail: 'Please enter a valid email address' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const db = getFirestore(app);
      
      // Query user collection for matching email
      const userDoc = await getDoc(doc(db, 'users', forgotPasswordEmail));
      
      if (!userDoc.exists()) {
        setErrors({ forgotPasswordEmail: 'No account found with this email' });
        setIsLoading(false);
        return;
      }
      
      // Generate and store OTP
      const newOtp = generateOTP();
      setGeneratedOtp(newOtp);
      
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
          <title>Petzify Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding-bottom: 20px; }
            .logo { max-width: 150px; }
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
              <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/logo%2FPetzify%20Logo-05.png?alt=media" alt="Petzify Logo" class="logo">
              <h2>Password Reset</h2>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset your Petzify account password. Please use the following verification code to complete your password reset:</p>
              <div class="otp">${newOtp}</div>
              <p>This code will expire in 10 minutes.</p>
              <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
              <p>123 Pet Street, Bangalore, India 560001</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const emailResult = await sendEmail({
        to: forgotPasswordEmail,
        subject: "Petzify Password Reset",
        html: emailTemplate
      });
      
      if (!emailResult.success) {
        throw new Error('Failed to send email. Please try again later.');
      }
      
      // Move to OTP verification step
      setForgotPasswordStep(2);
      showSuccess('Verification code sent to your email', 'Check Your Email');
    } catch (err) {
      console.error('Forgot password error:', err);
      showError('Error processing your request. Please try again later.', 'Request Failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Verify OTP
  const handleOtpVerification = (e) => {
    e.preventDefault();
    
    // Check if OTP has expired
    if (otpExpiry && new Date() > otpExpiry) {
      setErrors({ otp: 'Verification code has expired. Please request a new one.' });
      return;
    }
    
    // Verify OTP
    if (otp !== generatedOtp) {
      setErrors({ otp: 'Invalid verification code. Please try again.' });
      return;
    }
    
    // Move to password reset step
    setForgotPasswordStep(3);
    setErrors({});
  };
  
  // Reset Password
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Validate passwords
    const newErrors = {};
    
    if (!newPassword) {
      newErrors.newPassword = 'Please enter a new password';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (newPassword !== confirmNewPassword) {
      newErrors.confirmNewPassword = 'Passwords do not match';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }
    
    try {
      const db = getFirestore(app);
      
      // Get user document
      const userDocRef = doc(db, 'users', forgotPasswordEmail);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      // Update password in Firestore
      const userData = userDoc.data();
      await updateDoc(userDocRef, {
        password: newPassword,
        passwordUpdatedAt: new Date().toISOString()
      });
      
      // Reset states
      setMode('login');
      setForgotPasswordStep(1);
      setForgotPasswordEmail('');
      setOtp('');
      setGeneratedOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setOtpExpiry(null);
      
      // Show success message
      showSuccess('Password updated successfully. You can now log in with your new password.', 'Password Reset Complete');
    } catch (err) {
      console.error('Password reset error:', err);
      showError('Error resetting password. Please try again later.', 'Reset Failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle back button in forgot password flow
  const handleBack = () => {
    if (forgotPasswordStep > 1) {
      setForgotPasswordStep(forgotPasswordStep - 1);
    } else {
      setMode('login');
    }
    setErrors({});
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {mode === 'login' ? 'Sign In' : 
             mode === 'signup' ? 'Create Account' :
             forgotPasswordStep === 1 ? 'Forgot Password' :
             forgotPasswordStep === 2 ? 'Verify Code' :
             'Reset Password'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 focus:outline-none"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        
        {/* Custom Message */}
        {message && (
          <div className="px-6 pt-4 -mb-2">
            <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm">
              {message}
            </div>
          </div>
        )}
        
        {/* Form */}
        {mode === 'forgotPassword' ? (
          <div className="px-6 py-4">
            {forgotPasswordStep === 1 && (
              <form onSubmit={handleForgotPassword}>
                <p className="text-gray-600 mb-4">
                  Enter your email address and we'll send you a verification code to reset your password.
                </p>
                <div className="mb-4">
                  <label htmlFor="forgotPasswordEmail" className="block text-gray-700 font-medium mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="forgotPasswordEmail"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-primary-light ${
                      errors.forgotPasswordEmail ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                    disabled={isLoading}
                  />
                  {errors.forgotPasswordEmail && (
                    <p className="mt-1 text-red-500 text-sm">{errors.forgotPasswordEmail}</p>
                  )}
                </div>
                
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="text-primary hover:text-primary-dark"
                    disabled={isLoading}
                  >
                    Back to Login
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 ${
                      isLoading ? 'bg-gray-400' : 'bg-primary hover:bg-primary-dark'
                    } text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending...' : 'Send Code'}
                  </button>
                </div>
              </form>
            )}
            
            {forgotPasswordStep === 2 && (
              <form onSubmit={handleOtpVerification}>
                <p className="text-gray-600 mb-4">
                  We've sent a 6-digit verification code to <strong>{forgotPasswordEmail}</strong>. 
                  Enter the code below to continue.
                </p>
                <div className="mb-4">
                  <label htmlFor="otp" className="block text-gray-700 font-medium mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-primary-light ${
                      errors.otp ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    disabled={isLoading}
                  />
                  {errors.otp && (
                    <p className="mt-1 text-red-500 text-sm">{errors.otp}</p>
                  )}
                </div>
                
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-primary hover:text-primary-dark"
                    disabled={isLoading}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    disabled={isLoading}
                  >
                    Verify Code
                  </button>
                </div>
              </form>
            )}
            
            {forgotPasswordStep === 3 && (
              <form onSubmit={handlePasswordReset}>
                <p className="text-gray-600 mb-4">
                  Create a new password for your account.
                </p>
                <div className="mb-4">
                  <label htmlFor="newPassword" className="block text-gray-700 font-medium mb-2">
                    New Password
                  </label>
                  <PasswordInput
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-primary-light ${
                      errors.newPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter new password"
                    disabled={isLoading}
                  />
                  {errors.newPassword && (
                    <p className="mt-1 text-red-500 text-sm">{errors.newPassword}</p>
                  )}
                </div>
                
                <div className="mb-4">
                  <label htmlFor="confirmNewPassword" className="block text-gray-700 font-medium mb-2">
                    Confirm New Password
                  </label>
                  <PasswordInput
                    id="confirmNewPassword"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-primary-light ${
                      errors.confirmNewPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirm new password"
                    disabled={isLoading}
                  />
                  {errors.confirmNewPassword && (
                    <p className="mt-1 text-red-500 text-sm">{errors.confirmNewPassword}</p>
                  )}
                </div>
                
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-primary hover:text-primary-dark"
                    disabled={isLoading}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 ${
                      isLoading ? 'bg-gray-400' : 'bg-primary hover:bg-primary-dark'
                    } text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Updating...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-4">
            {/* Existing form content for login/signup */}
            {mode === 'signup' && (
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-primary-light ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                  disabled={isLoading}
                />
                {errors.name && (
                  <p className="mt-1 text-red-500 text-sm">{errors.name}</p>
                )}
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-primary-light ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-red-500 text-sm">{errors.email}</p>
              )}
            </div>
            
            {/* Phone input only for signup */}
            {mode === 'signup' && (
              <div className="mb-4">
                <label htmlFor="phone" className="block text-gray-700 font-medium mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-primary-light ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your phone number"
                  disabled={isLoading}
                />
                {errors.phone && (
                  <p className="mt-1 text-red-500 text-sm">{errors.phone}</p>
                )}
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
                Password
              </label>
              <PasswordInput
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-primary-light ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="mt-1 text-red-500 text-sm">{errors.password}</p>
              )}
            </div>
            
            {/* Confirm password field for signup mode */}
            {mode === 'signup' && (
              <div className="mb-4">
                <label htmlFor="confirmPassword" className="block text-gray-700 font-medium mb-2">
                  Confirm Password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-primary-light ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-red-500 text-sm">{errors.confirmPassword}</p>
                )}
              </div>
            )}
            
            {/* Forgot Password Link (only in login mode) */}
            {mode === 'login' && (
              <div className="mb-4 text-right">
                <button
                  type="button"
                  onClick={handleForgotPasswordClick}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  Forgot your password?
                </button>
              </div>
            )}
            
            <button
              type="submit"
              className={`w-full py-2 ${
                isLoading ? 'bg-gray-400' : 'bg-primary hover:bg-primary-dark'
              } text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
            
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-primary hover:text-primary-dark"
                disabled={isLoading}
              >
                {mode === 'login' ? 'Don\'t have an account? Sign up' : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal; 