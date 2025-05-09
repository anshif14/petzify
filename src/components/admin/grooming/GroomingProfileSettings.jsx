import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { toast } from 'react-toastify';

const GroomingProfileSettings = ({ adminData }) => {
  const [profileForm, setProfileForm] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileUpdating, setProfileUpdating] = useState(false);

  useEffect(() => {
    if (adminData) {
      fetchCenterDetails();
    }
  }, [adminData]);

  const fetchCenterDetails = async () => {
    try {
      if (!adminData || (!adminData.centerId && !adminData.groomingCenterId)) {
        toast.error('Cannot find grooming center details');
        return;
      }

      const centerId = adminData.centerId || adminData.groomingCenterId;
      const centerDoc = await getDoc(doc(db, 'groomingCenters', centerId));
      
      if (centerDoc.exists()) {
        const centerData = centerDoc.data();
        setProfileForm({
          name: centerData.name || '',
          description: centerData.description || '',
          phone: centerData.phone || '',
          email: centerData.email || adminData.email || '',
          address: centerData.address || '',
          website: centerData.website || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast.error('Grooming center details not found');
      }
    } catch (error) {
      console.error('Error fetching center details:', error);
      toast.error('Failed to load center details');
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    
    // Check if trying to change password
    if (profileForm.newPassword) {
      if (!profileForm.currentPassword) {
        toast.error('Please enter your current password');
        return;
      }
      
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }
      
      if (profileForm.newPassword.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      
      // Password change implementation would go here
      // This would typically involve Firebase Auth APIs
      toast.info('Password change functionality will be implemented in the next update');
    }
    
    try {
      setProfileUpdating(true);
      
      if (!adminData || (!adminData.centerId && !adminData.groomingCenterId)) {
        toast.error('Cannot update: Grooming center ID not found');
        setProfileUpdating(false);
        return;
      }
      
      const centerId = adminData.centerId || adminData.groomingCenterId;
      const centerRef = doc(db, 'groomingCenters', centerId);
      
      // Only update these fields
      await updateDoc(centerRef, {
        name: profileForm.name,
        description: profileForm.description,
        phone: profileForm.phone,
        email: profileForm.email,
        address: profileForm.address,
        website: profileForm.website,
        updatedAt: new Date()
      });
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setProfileUpdating(false);
    }
  };

  return (
    <div className="p-6">
      <form onSubmit={updateProfile} className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Center Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Center Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={profileForm.name}
              onChange={handleProfileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              required
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
              value={profileForm.email}
              onChange={handleProfileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              required
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={profileForm.phone}
              onChange={handleProfileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              required
            />
          </div>
          
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
              Website (Optional)
            </label>
            <input
              type="url"
              id="website"
              name="website"
              value={profileForm.website}
              onChange={handleProfileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
          
          <div className="md:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={profileForm.address}
              onChange={handleProfileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              required
            />
          </div>
          
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={profileForm.description}
              onChange={handleProfileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
        
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password (Optional)</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={profileForm.currentPassword}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={profileForm.newPassword}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={profileForm.confirmPassword}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className={`px-4 py-2 ${
              profileUpdating
                ? 'bg-gray-400'
                : 'bg-primary hover:bg-primary-dark'
            } text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
            disabled={profileUpdating}
          >
            {profileUpdating ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GroomingProfileSettings; 