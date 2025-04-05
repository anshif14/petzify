import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { useAlert } from '../../context/AlertContext';

const AuthModal = ({ 
  isOpen, 
  onClose, 
  initialMode = 'login', 
  redirectPath = '',
  onSuccess = () => {}
}) => {
  const [mode, setMode] = useState(initialMode); // 'login' or 'signup'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, register } = useUser();
  const { showSuccess, showError } = useAlert();
  
  if (!isOpen) return null;
  
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
      
      // Invoke success callback
      onSuccess();
      
      // Close the modal
      onClose();
      
      // Redirect if path provided
      if (redirectPath) {
        window.location.href = redirectPath;
      }
    } catch (error) {
      console.error(`${mode === 'login' ? 'Login' : 'Registration'} error:`, error);
      showError(
        error.message || `Failed to ${mode === 'login' ? 'login' : 'register'}. Please try again.`,
        mode === 'login' ? 'Login Failed' : 'Registration Failed'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setErrors({});
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
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
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
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
            <input
              type="password"
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
          
          {mode === 'signup' && (
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-gray-700 font-medium mb-2">
                Confirm Password
              </label>
              <input
                type="password"
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
          
          <div className="mt-6">
            <button
              type="submit"
              className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
        
        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 text-center">
          <p className="text-gray-700">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              onClick={toggleMode}
              className="ml-1 text-primary hover:text-primary-dark focus:outline-none"
              disabled={isLoading}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal; 