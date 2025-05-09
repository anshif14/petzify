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
        groomingCenterId: center.id, // Legacy field name
        centerId: center.id, // Standard field name for consistency
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
      console.log('Attempting to send credentials email to:', adminData.email);
      
      const emailResult = await sendEmail({
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
      
      if (!emailResult.success) {
        console.warn('Template email failed, trying fallback HTML email...');
        // Try fallback HTML email if template fails
        const fallbackHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Your Petzify Grooming Center Admin Credentials</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; padding-bottom: 20px; }
              .logo { max-width: 150px; }
              .content { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
              .credentials { background-color: #e9ecef; padding: 15px; margin: 15px 0; border-radius: 4px; }
              .warning { color: #856404; background-color: #fff3cd; padding: 10px; border-radius: 4px; margin-top: 20px; }
              .button { display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; 
                        text-decoration: none; border-radius: 4px; margin-top: 15px; }
              .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/logo%2FPetzify%20Logo-05.png?alt=media" alt="Petzify Logo" class="logo">
                <h2>Your Grooming Center Admin Credentials</h2>
              </div>
              <div class="content">
                <p>Hello ${adminData.name},</p>
                <p>Your admin account for managing <strong>${center.name}</strong> on Petzify has been created. Use the following credentials to log in:</p>
                
                <div class="credentials">
                  <p><strong>Username:</strong> ${adminData.username}</p>
                  <p><strong>Password:</strong> ${adminData.password}</p>
                </div>
                
                <p>You can log in at: <a href="https://petzify.in/admin">${window.location.origin}/admin</a></p>
                
                <div class="warning">
                  <p><strong>Important:</strong> Please change your password after your first login for security reasons.</p>
                </div>
                
                <p>If you have any questions or need assistance, please contact our support team at support@petzify.com.</p>
                
                <a href="${window.location.origin}/admin" class="button">Log In Now</a>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
                <p>This is an automated email. Please do not reply to this message.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        const fallbackResult = await sendEmail({
          to: adminData.email,
          subject: 'Your Petzify Grooming Center Admin Credentials',
          html: fallbackHtml
        });
        
        if (!fallbackResult.success) {
          throw new Error('Both template and fallback emails failed');
        } else {
          console.log('Fallback email sent successfully');
        }
      } else {
        console.log('Credentials email sent successfully');
      }
      
      // Show success message
      toast.success('Admin credentials created and email sent successfully', {
        autoClose: 5000,
        hideProgressBar: false,
      });
      
    } catch (error) {
      console.error('Error sending credential email:', error);
      toast.warning(
        'Admin account created but email delivery failed. Please provide these credentials manually:',
        { autoClose: false }
      );
      
      // Display credentials in the console for manual sharing
      console.info('CREDENTIALS TO SHARE MANUALLY:');
      console.info('--------------------------------');
      console.info(`Center: ${center.name}`);
      console.info(`Admin: ${adminData.name}`);
      console.info(`Email: ${adminData.email}`);
      console.info(`Username: ${adminData.username}`);
      console.info(`Password: ${adminData.password}`);
      console.info(`Login URL: ${window.location.origin}/admin`);
      console.info('--------------------------------');
      
      // Show credentials to admin in a follow-up toast (for cases where email failed)
      setTimeout(() => {
        toast.info(
          <div className="credential-toast">
            <p>Username: <strong>{adminData.username}</strong></p>
            <p>Password: <strong>{adminData.password}</strong></p>
            <p className="text-xs mt-2">Please copy these credentials now!</p>
          </div>,
          { autoClose: false }
        );
      }, 1000);
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